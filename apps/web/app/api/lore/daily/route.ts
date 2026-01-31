// apps/web/app/api/lore/daily/route.ts
import { NextResponse } from "next/server";
import { getDailyLore, listDailyLore } from "@/lib/lore-daily-reader";

export const runtime = "nodejs";
export const revalidate = 10;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  if (date) {
    const item = getDailyLore(date);
    if (!item) return NextResponse.json({ error: "Lore not found." }, { status: 404 });
    return NextResponse.json(
      { mode: "single", item },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  }

  const items = listDailyLore().slice(0, 14); // last 2 weeks
  const today = items[0] ?? null;

  return NextResponse.json(
    { mode: "list", today, items },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
  );
}
