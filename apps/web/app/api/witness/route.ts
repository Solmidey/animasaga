// apps/web/app/api/witness/route.ts
import { NextResponse } from "next/server";
import { getRecentWitnesses, factionName } from "@/lib/witness-reader";

export const runtime = "nodejs";
export const revalidate = 10;

export async function GET() {
  try {
    const items = await getRecentWitnesses(10);
    return NextResponse.json(
      {
        items: items.map((x) => ({
          ...x,
          factionName: factionName(x.faction),
        })),
      },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch {
    return NextResponse.json({ error: "Witness unavailable." }, { status: 503 });
  }
}
