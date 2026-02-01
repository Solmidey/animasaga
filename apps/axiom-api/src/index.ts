// apps/axiom-api/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

import { verifyDiscordRequest } from "./discord/verify";
import { discordAddRole, discordRemoveRole } from "./discord/rest";
import { rateLimit } from "./storage/rateLimit";
import { kvGetText, kvPutText, kvDelete } from "./storage/kv";
import { buildLinkMessage, verifyWalletSignature } from "./onchain/sign";
import { readAlignment, readWitnessed } from "./onchain/state";
import { ROLES, factionToBearerRoleId } from "./discord/roles";

type Env = {
  AXIOM_LINKS: KVNamespace;
  AXIOM_NONCES: KVNamespace;
  AXIOM_RL: KVNamespace;

  BASE_RPC_URL: string;
  ELYNDRA_COMMITMENT_ADDRESS: string;
  WITNESS_REGISTRY_ADDRESS: string;
  WITNESS_SEASON_ID: string;
  WITNESS_DEPLOYMENT_BLOCK: string;

  DISCORD_GUILD_ID: string;

  // ✅ NEW (non-secret): where your web app lives
  WEB_APP_URL?: string;

  // secrets
  DISCORD_PUBLIC_KEY: string; // verify interactions
  DISCORD_BOT_TOKEN: string; // assign roles
};

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/health", (c) => c.json({ ok: true, name: "axiom-api" }));

/**
 * Wallet link flow (used by Discord + website):
 * - POST /link/start  -> returns message to sign
 * - POST /link/confirm -> verifies signature and stores mapping discordUserId->address
 */
app.post("/link/start", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const limited = await rateLimit(c.env.AXIOM_RL, `link_start:${ip}`, 20, 60);
  if (limited) return c.json({ error: "Too many requests." }, 429);

  const body = await c.req.json().catch(() => null);
  const discordUserId = typeof body?.discordUserId === "string" ? body.discordUserId : "";
  if (!discordUserId) return c.json({ error: "Missing discordUserId." }, 400);

  const nonce = crypto.randomUUID();
  const issuedAt = new Date().toISOString();

  // store nonce (single-use), 10 min TTL
  await kvPutText(c.env.AXIOM_NONCES, `nonce:${discordUserId}:${nonce}`, "1", 600);

  const message = buildLinkMessage({ discordUserId, nonce, issuedAt });

  return c.json({ discordUserId, nonce, issuedAt, message });
});

app.post("/link/confirm", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const limited = await rateLimit(c.env.AXIOM_RL, `link_confirm:${ip}`, 20, 60);
  if (limited) return c.json({ error: "Too many requests." }, 429);

  const body = await c.req.json().catch(() => null);
  const discordUserId = typeof body?.discordUserId === "string" ? body.discordUserId : "";
  const address = typeof body?.address === "string" ? body.address : "";
  const signature = typeof body?.signature === "string" ? body.signature : "";
  const nonce = typeof body?.nonce === "string" ? body.nonce : "";
  const issuedAt = typeof body?.issuedAt === "string" ? body.issuedAt : "";

  if (!discordUserId || !address || !signature || !nonce || !issuedAt) {
    return c.json({ error: "Missing fields." }, 400);
  }

  const nonceKey = `nonce:${discordUserId}:${nonce}`;
  const exists = await kvGetText(c.env.AXIOM_NONCES, nonceKey);
  if (!exists) return c.json({ error: "Nonce invalid or expired." }, 400);

  const ok = await verifyWalletSignature({
    discordUserId,
    nonce,
    issuedAt,
    address,
    signature,
  });

  if (!ok) return c.json({ error: "Signature invalid." }, 401);

  // consume nonce (anti-replay)
  await kvDelete(c.env.AXIOM_NONCES, nonceKey);

  // store link (discord -> wallet), 180 days
  await kvPutText(c.env.AXIOM_LINKS, `link:${discordUserId}`, address, 180 * 24 * 3600);

  return c.json({ ok: true, discordUserId, address });
});

/**
 * Role sync: discordUserId -> linked address -> onchain state -> assign roles
 * This is callable from:
 * - Discord interactions command (/sync)
 * - Your website (admin-only later)
 */
app.post("/discord/sync-roles", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const limited = await rateLimit(c.env.AXIOM_RL, `sync:${ip}`, 30, 60);
  if (limited) return c.json({ error: "Too many requests." }, 429);

  const body = await c.req.json().catch(() => null);
  const discordUserId = typeof body?.discordUserId === "string" ? body.discordUserId : "";
  if (!discordUserId) return c.json({ error: "Missing discordUserId." }, 400);

  const linked = await kvGetText(c.env.AXIOM_LINKS, `link:${discordUserId}`);
  if (!linked) return c.json({ error: "No linked wallet for this Discord user." }, 404);

  const rpcUrl = c.env.BASE_RPC_URL;
  const seasonId = Number(c.env.WITNESS_SEASON_ID || "1");
  const deploymentBlock = Number(c.env.WITNESS_DEPLOYMENT_BLOCK || "0");

  const alignment = await readAlignment({
    rpcUrl,
    commitmentAddress: c.env.ELYNDRA_COMMITMENT_ADDRESS,
    user: linked,
  });

  const witnessed = await readWitnessed({
    rpcUrl,
    witnessAddress: c.env.WITNESS_REGISTRY_ADDRESS,
    deploymentBlock,
    seasonId,
    user: linked,
    cacheKv: c.env.AXIOM_LINKS,
  });

  // Bearer role based on alignment faction (if chosen)
  const bearerRole = alignment.hasChosen ? factionToBearerRoleId(alignment.faction) : null;

  // Apply roles
  const guildId = c.env.DISCORD_GUILD_ID;
  const token = c.env.DISCORD_BOT_TOKEN;

  // Remove all bearer roles first
  const bearerRoles = [
    ROLES.BEARER_FLAME,
    ROLES.BEARER_VEIL,
    ROLES.BEARER_ECHO,
    ROLES.BEARER_CROWN,
  ];

  for (const rid of bearerRoles) {
    await discordRemoveRole({
      botToken: token,
      guildId,
      userId: discordUserId,
      roleId: rid,
    }).catch(() => {});
  }

  // Add bearer role if aligned
  if (bearerRole) {
    await discordAddRole({ botToken: token, guildId, userId: discordUserId, roleId: bearerRole });
  }

  return c.json({
    ok: true,
    discordUserId,
    linkedWallet: linked,
    alignment,
    witnessed,
    bearerRoleApplied: bearerRole,
  });
});

/**
 * Discord Interactions endpoint (HTTP webhook style — no gateway).
 * Set this URL in Discord Developer Portal.
 */
app.post("/discord/interactions", async (c) => {
  // Verify Discord signature
  const ok = await verifyDiscordRequest(c.req.raw, c.env.DISCORD_PUBLIC_KEY);
  if (!ok) return c.text("invalid request signature", 401);

  const interaction = await c.req.json();

  // PING
  if (interaction?.type === 1) {
    return c.json({ type: 1 });
  }

  // Application commands
  if (interaction?.type === 2) {
    const name = interaction?.data?.name;
    const sub = interaction?.data?.options?.[0]?.name ?? null;

    const userId = interaction?.member?.user?.id ?? interaction?.user?.id;
    if (!userId) return c.json({ type: 4, data: { content: "Axiom cannot see your identity." } });

    if (name === "axiom" && sub === "link") {
      const nonce = crypto.randomUUID();
      const issuedAt = new Date().toISOString();
      await kvPutText(c.env.AXIOM_NONCES, `nonce:${userId}:${nonce}`, "1", 600);

      const message = buildLinkMessage({ discordUserId: userId, nonce, issuedAt });

      // ✅ include the website URL if set
      const appUrl = (c.env.WEB_APP_URL || "").replace(/\/+$/, "");
      const linkRiteUrl = appUrl ? `${appUrl}/axiom/link` : "/axiom/link";

      return c.json({
        type: 4,
        data: {
          flags: 1 << 6, // ephemeral
          content:
            `**Axiom’s Link Rite**\n\n` +
            `1) Open the Link Rite: ${linkRiteUrl}\n` +
            `2) Connect your wallet there.\n` +
            `3) Paste & sign the message below.\n\n` +
            "```text\n" +
            message +
            "\n```\n" +
            `Nonce expires in 10 minutes.`,
        },
      });
    }

    // ✅ FIXED: sync now shows real error body/status (no more "unknown error")
    if (name === "axiom" && sub === "sync") {
      type SyncOk = {
        ok: true;
        discordUserId: string;
        linkedWallet: string;
        alignment: { hasChosen: boolean; faction: number };
        witnessed: boolean;
        bearerRoleApplied: string | null;
      };

      type SyncErr = { error?: string };

      const res = await fetch(new URL("/discord/sync-roles", c.req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordUserId: userId }),
      });

      const raw = await res.text();
      let parsed: SyncOk | SyncErr | null = null;

      try {
        parsed = JSON.parse(raw) as SyncOk | SyncErr;
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        const errMsg =
          (parsed && "error" in parsed && parsed.error) ||
          (raw ? raw.slice(0, 180) : `HTTP ${res.status}`);

        return c.json({
          type: 4,
          data: {
            flags: 1 << 6,
            content: `Axiom cannot sync you yet: ${errMsg}`,
          },
        });
      }

      const okJson = parsed as SyncOk;

      const msg =
        `Axiom has weighed your chain.\n\n` +
        `Wallet: ${okJson.linkedWallet}\n` +
        `Aligned: ${Boolean(okJson.alignment?.hasChosen)}\n` +
        `Witnessed: ${Boolean(okJson.witnessed)}\n\n` +
        `Roles have been refreshed.`;

      return c.json({ type: 4, data: { flags: 1 << 6, content: msg } });
    }

    if (name === "axiom" && sub === "claim") {
      // Early Believer claim: first 500 claimers.
      const countKey = "earlybeliever:count";
      const raw = await kvGetText(c.env.AXIOM_LINKS, countKey);
      const count = raw ? Number(raw) : 0;

      if (Number.isFinite(count) && count >= 500) {
        return c.json({
          type: 4,
          data: { flags: 1 << 6, content: "The first 500 have already been marked." },
        });
      }

      // increment + set (KV is eventually consistent; acceptable for MVP)
      const next = count + 1;
      await kvPutText(c.env.AXIOM_LINKS, countKey, String(next), 365 * 24 * 3600);

      await discordAddRole({
        botToken: c.env.DISCORD_BOT_TOKEN,
        guildId: c.env.DISCORD_GUILD_ID,
        userId,
        roleId: ROLES.EARLY_BELIEVER,
      }).catch(() => {});

      return c.json({
        type: 4,
        data: {
          flags: 1 << 6,
          content: `Axiom marks you as **Early Believer**. (${Math.min(next, 500)}/500)`,
        },
      });
    }

    return c.json({
      type: 4,
      data: { flags: 1 << 6, content: "Axiom hears you, but that command is not carved yet." },
    });
  }

  return c.json({ type: 4, data: { flags: 1 << 6, content: "Axiom refuses this shape." } });
});

export default app;
