// apps/axiom-api/scripts/register-commands.mjs
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_APPLICATION_ID || !DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) {
  console.error("Missing env vars. Need DISCORD_APPLICATION_ID, DISCORD_GUILD_ID, DISCORD_BOT_TOKEN.");
  process.exit(1);
}

const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`;

const commands = [
  {
    name: "axiom",
    description: "Axiom speaks. Link, sync, claim.",
    options: [
      { type: 1, name: "link", description: "Start the wallet link rite (get a message to sign)." },
      { type: 1, name: "sync", description: "Sync your Discord roles from onchain truth." },
      { type: 1, name: "claim", description: "Claim Early Believer if slots remain." }
    ]
  }
];

async function main() {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(commands)
  });

  const txt = await res.text();
  if (!res.ok) {
    console.error(`Discord API error ${res.status}: ${txt}`);
    process.exit(1);
  }

  console.log("✅ Registered guild commands:");
  console.log(txt);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});
