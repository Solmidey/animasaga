// apps/web/app/chronicle/page.tsx
import Link from "next/link";
import CanonFeed from "@/components/CanonFeed";
import WitnessWallCards from "@/components/WitnessWallCards";

export const revalidate = 10;

export default async function ChroniclePage() {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">CHRONICLE</p>
            <h1 className="mt-4 font-display text-5xl md:text-6xl">The Ledger</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-200/70 md:text-base">
              Canon chapters and witness marks — where Elyndra becomes permanent.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              href="/"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Threshold
            </Link>
            <Link
              href="/align"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Align
            </Link>
            {/* ✅ new */}
            <Link
              href="/reflect"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Reflection
            </Link>
          </div>
        </div>

        {/* Cards only: stacked */}
        <div className="mt-10 flex flex-col gap-6">
          <CanonFeed />
          <WitnessWallCards />
        </div>
      </div>
    </main>
  );
}
