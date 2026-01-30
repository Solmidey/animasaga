// apps/web/app/page.tsx
import Link from "next/link";
import HeartbeatTeaser from "@/components/HeartbeatTeaser";
import EclipseTeaser from "@/components/EclipseTeaser";
import RallyPack from "@/components/RallyPack";
import OathOverlay from "@/components/OathOverlay";
import { getElyndraStats } from "@/lib/stats-reader";
import { buildDailyLoreDrop } from "@/lib/lore-drop";

export const revalidate = 15;

function loreShellClasses(variant: "normal" | "eclipse") {
  if (variant === "eclipse") {
    return "border-zinc-200/20 bg-[radial-gradient(90%_60%_at_50%_0%,rgba(255,255,255,0.10),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.05),rgba(0,0,0,0.1))]";
  }
  return "border-zinc-200/10 bg-zinc-50/5";
}

function badgeClasses(variant: "normal" | "eclipse") {
  if (variant === "eclipse") return "border-zinc-200/25 bg-zinc-50/10 text-zinc-100/90";
  return "border-zinc-200/10 bg-zinc-50/5 text-zinc-100/80";
}

export default async function Page() {
  const stats = await getElyndraStats().catch(() => null);

  const flame = stats?.counts?.Flame ?? 0;
  const veil = stats?.counts?.Veil ?? 0;
  const echo = stats?.counts?.Echo ?? 0;
  const alignedWallets = stats?.totals?.alignedWallets ?? 0;

  const eclipseActive = stats?.eclipse?.isActive ?? false;
  const eclipseMilestone = stats?.eclipse?.milestone ?? null;
  const nextMilestone = stats?.eclipse?.nextMilestone ?? 10;
  const athensDateKey = stats?.eclipse?.athensDateKey ?? null;

  const lore = buildDailyLoreDrop({
    alignedWallets,
    flame,
    veil,
    echo,
    eclipseActive,
    eclipseMilestone,
    nextMilestone,
  });

  // Stable absolute base URL for RallyPack (SSR-safe)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <main className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_0%,rgba(255,255,255,0.06),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_20%,rgba(0,0,0,0.15))] text-zinc-100">
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

          {/* PRIMARY CTA + REFLECTION LINK */}
          <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/chronicle"
              className="group inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm font-medium text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur transition hover:bg-zinc-50/10 hover:border-zinc-200/20"
            >
              Enter Elyndra
              <span className="ml-2 inline-block transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>

            <Link
              href="/reflect"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm text-zinc-100/90 hover:bg-zinc-50/10 hover:border-zinc-200/20"
            >
              Reflection →
            </Link>

            <Link
              href="/align"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm text-zinc-100/90 hover:bg-zinc-50/10 hover:border-zinc-200/20"
            >
              Align →
            </Link>

            <Link
              href="/mini"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm text-zinc-100/90 hover:bg-zinc-50/10 hover:border-zinc-200/20"
            >
              Mini →
            </Link>
          </div>

          <p className="mt-3 text-xs leading-5 text-zinc-200/60">
            Wallet connection required beyond this point.
            <br />
            Choices made there are binding.
          </p>
        </section>

        {/* DAILY LORE DROP */}
        <section className="mt-14 md:mt-10">
          <div className={`rounded-3xl border p-7 backdrop-blur ${loreShellClasses(lore.variant)}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.28em] text-zinc-200/60">DAILY LORE DROP</p>
                <h2 className="mt-3 font-display text-2xl md:text-3xl">{lore.title}</h2>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] tracking-[0.22em] ${badgeClasses(
                      lore.variant
                    )}`}
                  >
                    {lore.variant === "eclipse" ? "ECLIPSE EVENT" : "OMEN"}
                  </span>

                  <span className="inline-flex rounded-full border border-zinc-200/10 bg-zinc-50/5 px-3 py-1 text-[11px] tracking-[0.22em] text-zinc-100/80">
                    LEADING: {lore.meta.leadingFaction}
                  </span>

                  {!lore.meta.eclipseActive && (
                    <span className="inline-flex rounded-full border border-zinc-200/10 bg-zinc-50/5 px-3 py-1 text-[11px] tracking-[0.22em] text-zinc-100/80">
                      NEXT: {lore.meta.nextMilestone}
                    </span>
                  )}

                  {lore.meta.eclipseActive && lore.meta.eclipseMilestone && (
                    <span className="inline-flex rounded-full border border-zinc-200/25 bg-zinc-50/10 px-3 py-1 text-[11px] tracking-[0.22em] text-zinc-100/90">
                      MILESTONE: {lore.meta.eclipseMilestone}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-zinc-200/55 text-right">
                <span className="tracking-[0.22em]">ATHENS</span>
                <div className="mt-1 font-mono">{lore.dateKey}</div>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-200/75 md:text-base">
              {lore.omen.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-200/55">
                <span className="text-zinc-200/65">{lore.meta.alignedWallets} aligned</span>
                <span className="text-zinc-200/45"> • </span>
                <span className="text-zinc-200/65">{lore.meta.shareLine}</span>
              </p>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/chronicle#heartbeat"
                  className="inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-xs hover:bg-zinc-50/10"
                >
                  Watch the Heartbeat →
                </Link>
                <Link
                  href="/reflect"
                  className="inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-xs hover:bg-zinc-50/10"
                >
                  Reflection →
                </Link>
                <Link
                  href="/mini"
                  className="inline-flex w-fit items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-xs hover:bg-zinc-50/10"
                >
                  Mini →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* RALLY PACK */}
        <section className="mt-10">
          <RallyPack
            alignedWallets={alignedWallets}
            eclipseActive={eclipseActive}
            eclipseMilestone={eclipseMilestone}
            nextMilestone={nextMilestone}
            athensDateKey={athensDateKey}
            baseUrl={baseUrl}
          />
        </section>

        {/* Lore blocks */}
        <section className="mt-24 md:mt-28">
          <h2 className="font-display text-2xl md:text-3xl">Elyndra is not a game.</h2>
          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200/75 md:text-base">
            <p>
              It is a world where decisions do not reset. Where alignment is permanent.
              Where the Chain does not forgive — it records.
            </p>
            <p>
              In Elyndra, you do not role-play a character. You reveal what you are willing
              to stand behind.
            </p>
          </div>
        </section>

        <section className="mt-20 md:mt-24">
          <h2 className="font-display text-2xl md:text-3xl">There was a fracture.</h2>
          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200/75 md:text-base">
            <p>
              Not of land —<br />
              but of intention.
            </p>
            <p>From it emerged forces. Not gods. Not factions. Alignments.</p>
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
              Enter Elyndra <span className="ml-2">→</span>
            </Link>

            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/reflect"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
              >
                Reflection →
              </Link>
              <Link
                href="/align"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
              >
                Align →
              </Link>
              <Link
                href="/mini"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-6 py-3 text-sm hover:bg-zinc-50/10"
              >
                Mini →
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Scroll-revealed teasers */}
      <EclipseTeaser
        alignedWallets={alignedWallets}
        eclipseActive={eclipseActive}
        eclipseMilestone={eclipseMilestone}
        nextMilestone={nextMilestone}
        athensDateKey={athensDateKey}
      />

      <HeartbeatTeaser flame={flame} veil={veil} echo={echo} alignedWallets={alignedWallets} />

      {/* NEW: One-time Witness Oath Overlay (client-only; safe for hydration) */}
      <OathOverlay />
    </main>
  );
}
