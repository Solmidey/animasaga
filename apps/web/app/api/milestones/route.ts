// apps/web/app/api/milestones/route.ts
import { NextResponse } from "next/server";
import { getUniqueWitnessCount } from "@/lib/witness-onchain-reader";
import { WITNESS_SEASON_ID } from "@/lib/constants";

/**
 * Milestones (cards will read this):
 * - canon_ch_002 unlock at 5 witnesses
 * - eclipse cue unlock at 10 witnesses
 */
export const runtime = "nodejs";
export const revalidate = 10;

const TARGET_CANON_2 = 5;
const TARGET_ECLIPSE = 10;

export async function GET() {
  const witnessCount = await getUniqueWitnessCount(WITNESS_SEASON_ID);

  const unlockedCanon2 = witnessCount >= TARGET_CANON_2;
  const unlockedEclipse = witnessCount >= TARGET_ECLIPSE;

  return NextResponse.json(
    {
      seasonId: WITNESS_SEASON_ID,
      witnessCount,
      targets: {
        canon_ch_002: TARGET_CANON_2,
        eclipse: TARGET_ECLIPSE,
      },
      unlocked: {
        canon_ch_002: unlockedCanon2,
        eclipse: unlockedEclipse,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
  );
}
