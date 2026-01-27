// apps/web/app/api/chronicle/route.ts
import { NextResponse } from "next/server";
import { getChronicleSnapshot } from "@/lib/base-reader";

export const runtime = "nodejs";
export const revalidate = 10;

export async function GET() {
  try {
    const snapshot = await getChronicleSnapshot();

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Chronicle temporarily unavailable." },
      { status: 503 }
    );
  }
}
