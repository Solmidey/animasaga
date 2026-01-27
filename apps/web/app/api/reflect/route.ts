// apps/web/app/api/reflect/route.ts
import { NextResponse } from "next/server";
import { getAddress } from "viem";

// Use a relative import to avoid tsconfig path alias issues
import { getReflectSnapshot } from "@/lib/reflect-reader";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const addr = searchParams.get("address");

    if (!addr) {
      return NextResponse.json({ error: "Missing address." }, { status: 400 });
    }

    const address = getAddress(addr);
    const snapshot = await getReflectSnapshot(address);

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    // Do not leak internal details (Commandments)
    return NextResponse.json(
      { error: "Reflection temporarily unavailable." },
      { status: 503 }
    );
  }
}
