// apps/web/app/api/witness-onchain/route.ts
import { NextResponse } from "next/server";
import { getRecentOnchainWitnesses, factionName } from "@/lib/witness-onchain-reader";

export const runtime = "nodejs";
export const revalidate = 10;

export async function GET() {
  const items = await getRecentOnchainWitnesses(12);

  return NextResponse.json(
    {
      source: "onchain",
      items: items.map((x) => ({
        ...x,
        factionName: factionName(x.faction),
      })),
      degraded: items.length === 0,
    },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
  );
}
