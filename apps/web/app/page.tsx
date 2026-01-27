// apps/web/app/page.tsx
import Link from "next/link";
import HeartbeatTeaser from "@/components/HeartbeatTeaser";
import { getElyndraStats } from "@/lib/stats-reader";

export const revalidate = 15;

export default async function Page() {
  const stats = await getElyndraStats().catch(() => null);

  const flame = stats?.counts?.Flame ?? 0;
  const veil = stats?.counts?.Veil ?? 0;
  const echo = stats?.counts?.Echo ?? 0;
  const alignedWallets = stats?.totals?.alignedWallets ?? 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_0%,rgba(255,255,255,0.06),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_20%,rgba(0,0,0,0.15))] text-zinc-100">
      {/* subtle fracture line */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-[42vh] h-px bg-gradient-to-r from-transparent via-zinc-200/10 to-transparent"
      />

      <div className="mx-auto w-full max-w-3xl px-6 py-20 md:py-28">
        {/* HERO */}
        <section className="min-h-[78vh] flex flex-col justify-center">
          <div className="inline-flex items-center gap-3 text-xs tracking-[0.25em] text-zinc-300/70">
            <span className="h-px w-10 bg-zinc-200/10" />
            <span>ONCHAIN CHRONICLE</span>
          </div>

          <h1 className="mt-6 font-display text-5xl leading-[1.02] tracking-tight md:text-6xl">
            ANIMASAGA
          </h1>

          <p className="mt-4 text-base text-zinc-200/80 md:text-lg">
            An onchain chronicle of choice.
          </p>

          <div className="mt-10 space-y-2">
            <p className="font-display text-2xl text-zinc-100/95 md:text-3xl">
              Elyndra remembers.
            </p>
            <p className="text-sm leading-7 text-zinc-200/70 md:text-base">
              Every alignment leaves a scar.
              <br />
              Every scar becomes history.
            </p>
          </div>

          <div className="mt-14 flex flex-col gap-3">
            <Link
              href="/chronicle"
              className="group inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm font-medium text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur transition hover:bg-zinc-50/10 hover:border-zinc-200/20"
            >
              Enter Elyndra
              <span className="ml-2 inline-block transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>

            <p className="text-xs leading-5 text-zinc-200/60">
              Wallet connection required beyond this point.
              <br />
              Choices made there are binding.
            </p>
          </div>
        </section>

        {/* Lore blocks */}
        <section className="mt-24 md:mt-28">
          <h2 className="font-display text-2xl md:text-3xl">
            Elyndra is not a game.
          </h2>
          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200/75 md:text-base">
            <p>
              It is a world where decisions do not reset. Where alignment is
              permanent. Where the Chain does not forgive — it records.
            </p>
            <p>
              In Elyndra, you do not role-play a character. You reveal what you
              are willing to stand behind.
            </p>
          </div>
        </section>

        <section className="mt-20 md:mt-24">
          <h2 className="font-display text-2xl md:text-3xl">
            There was a fracture.
          </h2>
          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200/75 md:text-base">
            <p>
              Not of land —<br />
              but of intention.
            </p>
            <p>
              From it emerged forces. Not gods. Not factions. Alignments.
            </p>
          </div>

          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
            <p className="text-xs tracking-[0.22em] text-zinc-200/60">THE SCAR</p>
            <p className="mt-3 text-sm leading-7 text-zinc-200/70">
              What is chosen remains. What is ignored returns. What is amplified grows.
            </p>
          </div>
        </section>

        <section className="mt-24 pb-10">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Link
              href="/chronicle"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-7 py-3 text-sm font-medium text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur transition hover:bg-zinc-50/10 hover:border-zinc-200/20"
            >
              Enter Elyndra
              <span className="ml-2">→</span>
            </Link>

            <p className="text-xs leading-5 text-zinc-200/60">
              Wallet connection required beyond this point.
              <br />
              Choices made there are binding.
            </p>
          </div>
        </section>
      </div>

      {/* Scroll-revealed heartbeat teaser */}
      <HeartbeatTeaser flame={flame} veil={veil} echo={echo} alignedWallets={alignedWallets} />
    </main>
  );
}
