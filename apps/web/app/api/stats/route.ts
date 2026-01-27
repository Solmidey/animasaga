// apps/web/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { getElyndraStats } from "@/lib/stats-reader";

export const runtime = "nodejs";
export const revalidate = 15;

export async function GET() {
  try {
    const stats = await getElyndraStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json({ error: "Stats unavailable." }, { status: 503 });
  }
}
