// apps/web/app/api/eclipse/route.ts
import { NextResponse } from "next/server";
import { getElyndraStats } from "@/lib/stats-reader";

export const runtime = "nodejs";
export const revalidate = 15;

export async function GET() {
  try {
    const s = await getElyndraStats();
    return NextResponse.json(
      {
        eclipse: s.eclipse,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
      }
    );
  } catch {
    return NextResponse.json({ error: "Eclipse unavailable." }, { status: 503 });
  }
}
