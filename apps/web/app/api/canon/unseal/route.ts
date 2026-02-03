// apps/web/app/api/canon/unseal/route.ts
import { NextResponse } from "next/server";
import { isAddress, getAddress, verifyMessage } from "viem";
import { getCanonChapterById } from "@/lib/canon-reader";
import { hasWitnessed } from "@/lib/witness-onchain-reader";
import { WITNESS_SEASON_ID } from "@/lib/constants";

/**
 * Commandments-compliant gate:
 * - client cannot just pass an address
 * - must sign a server-verified message
 * - server verifies signature -> address
 * - server checks onchain witness -> allow full body
 *
 * Canon storage model (current): markdown files on disk.
 * "Sealed" means: body is never returned from /api/canon.
 * Only /api/canon/unseal returns body if witnessed + signed.
 */

// Simple in-memory anti-replay (OK for MVP). For production, move to Redis/KV.
const usedNonces = new Map<string, number>(); // key = `${addr}:${nonce}` -> exp(ms)
const RATE = new Map<string, number[]>(); // ip -> timestamps

function nowMs() {
  return Date.now();
}

function pruneNonces() {
  const t = nowMs();
  for (const [k, exp] of usedNonces.entries()) {
    if (exp <= t) usedNonces.delete(k);
  }
}

function rateLimit(ip: string, limit = 25, windowMs = 60_000) {
  const t = nowMs();
  const arr = RATE.get(ip) ?? [];
  const next = arr.filter((x) => t - x < windowMs);
  next.push(t);
  RATE.set(ip, next);
  return next.length > limit;
}

export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(req: Request) {
  pruneNonces();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const id = typeof body?.id === "string" ? body.id : "";
  const addressRaw = typeof body?.address === "string" ? body.address : "";
  const signature = typeof body?.signature === "string" ? body.signature : "";
  const nonce = typeof body?.nonce === "string" ? body.nonce : "";
  const issuedAt = typeof body?.issuedAt === "string" ? body.issuedAt : "";

  if (!id || !addressRaw || !signature || !nonce || !issuedAt) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }
  if (!isAddress(addressRaw)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const address = getAddress(addressRaw);

  // IssuedAt freshness (5 minutes)
  const issued = Date.parse(issuedAt);
  if (!Number.isFinite(issued) || Math.abs(nowMs() - issued) > 5 * 60_000) {
    return NextResponse.json({ error: "Expired request." }, { status: 400 });
  }

  // Anti-replay
  const nonceKey = `${address.toLowerCase()}:${nonce}`;
  if (usedNonces.has(nonceKey)) {
    return NextResponse.json({ error: "Nonce already used." }, { status: 400 });
  }

  const chapter = getCanonChapterById(id);
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }

  // Message must match exactly on client and server
  const msg =
    `AnimaSaga Canon Unseal\n` +
    `Chapter: ${chapter.id}\n` +
    `Nonce: ${nonce}\n` +
    `IssuedAt: ${issuedAt}`;

  let ok = false;
  try {
    ok = await verifyMessage({ address, message: msg, signature: signature as any });
  } catch {
    ok = false;
  }
  if (!ok) {
    return NextResponse.json({ error: "Signature invalid." }, { status: 401 });
  }

  // Onchain witness gate (server-side)
  const witnessed = await hasWitnessed(address, WITNESS_SEASON_ID);
  if (!witnessed) {
    return NextResponse.json({ error: "Not witnessed." }, { status: 403 });
  }

  // mark nonce used (10 minutes)
  usedNonces.set(nonceKey, nowMs() + 10 * 60_000);

  // ✅ return body ONLY here
  return NextResponse.json(
    {
      ok: true,
      chapter: {
        id: chapter.id,
        season: chapter.season,
        slug: chapter.slug,
        title: chapter.title,
        subtitle: chapter.subtitle ?? null,
        isoDate: chapter.isoDate,
        excerpt: chapter.excerpt,
        hashSha256: chapter.hashSha256,
        body: chapter.body,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
