import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { getReflectSnapshot } from "@/lib/reflect-reader";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const addr = searchParams.get("address");
    if (!addr) return NextResponse.json({ error: "Missing address." }, { status: 400 });

    const address = getAddress(addr);
    const snap = await getReflectSnapshot(address);

    const eligible = !snap.elyndra.hasChosen;

    return NextResponse.json(
      {
        address,
        eligible,
        current: snap.elyndra,
        generatedAt: snap.generatedAt
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Alignment check unavailable." }, { status: 503 });
  }
}
