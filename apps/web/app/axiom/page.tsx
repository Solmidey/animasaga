import Link from "next/link";

export const revalidate = 60;

export default function VotePage() {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">VOTE</p>
            <h1 className="mt-4 font-display text-5xl">The Choice Gate</h1>
            <p className="mt-4 text-sm leading-7 text-zinc-200/70">
              Voting will live here once Season 1 chapters begin. For now, alignment is the only binding act.
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
              href="/chronicle"
              className="inline-flex rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Chronicle
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">FOR NOW</p>
          <p className="mt-3 text-sm leading-7 text-zinc-200/70">
            Choose your faction in <span className="text-zinc-100/90 font-medium">Align</span>, then generate your
            sigil in <span className="text-zinc-100/90 font-medium">Reflect</span>.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/align"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
            >
              Align →
            </Link>
            <Link
              href="/reflect"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
            >
              Reflect →
            </Link>
            <Link
              href="/mini"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
            >
              Mini →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
