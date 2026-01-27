import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-[radial-gradient(70%_50%_at_50%_0%,rgba(255,255,255,0.06),transparent_60%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_20%,rgba(0,0,0,0.15))] text-zinc-100">
      {/* Subtle “fracture” line (visual-only, not noisy) */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[42vh] h-px bg-gradient-to-r from-transparent via-zinc-200/10 to-transparent" />

      {/* Content */}
      <div className="mx-auto w-full max-w-3xl px-6 py-20 md:py-28">
        {/* HERO — The Threshold */}
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

          {/* No nav, no social, no noise */}
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

        {/* What Elyndra Is */}
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

        {/* The Fracture */}
        <section className="mt-20 md:mt-24">
          <h2 className="font-display text-2xl md:text-3xl">There was a fracture.</h2>
          <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200/75 md:text-base">
            <p>
              Not of land —<br />
              but of intention.
            </p>
            <p>
              From it emerged five forces. Not gods. Not factions. Alignments.
            </p>
          </div>

          {/* faint “scar” block */}
          <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
            <p className="text-xs tracking-[0.22em] text-zinc-200/60">THE SCAR</p>
            <p className="mt-3 text-sm leading-7 text-zinc-200/70">
              What is chosen remains. What is ignored returns. What is amplified grows.
            </p>
          </div>
        </section>

        {/* The Five Alignments */}
        <section className="mt-20 md:mt-24">
          <h2 className="font-display text-2xl md:text-3xl">The Five Alignments</h2>

          <div className="mt-8 grid gap-4">
            <AlignmentCard title="Flame" subtitle="Action before certainty." />
            <AlignmentCard title="Veil" subtitle="Truth withheld for survival." />
            <AlignmentCard title="Echo" subtitle="Influence amplified." />
            <AlignmentCard title="Crown" subtitle="Authority assumed." />
            <AlignmentCard title="Ilios" subtitle="Continuity beyond seasons." note="Rare. Dormant. Not chosen." />
          </div>
        </section>

        {/* Axiom Speaks */}
        <section className="mt-20 md:mt-24">
          <div className="rounded-3xl border border-zinc-200/10 bg-gradient-to-b from-zinc-50/6 to-transparent p-8 backdrop-blur">
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">AXIOM</p>

            <div className="mt-6 space-y-5 text-sm leading-7 text-zinc-200/75 md:text-base">
              <p>
                I do not judge your choice. I do not advise restraint. I do not promise
                outcome.
              </p>
              <p className="font-display text-lg text-zinc-100/90 md:text-xl">I record.</p>
              <p>
                What you align with will follow you. What you amplify will grow. What you
                choose will not forget you.
              </p>
            </div>
          </div>
        </section>

        {/* Season Status (Read-Only) */}
        <section className="mt-20 md:mt-24">
          <h2 className="font-display text-2xl md:text-3xl">Current State</h2>

          <div className="mt-8 grid gap-3 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 text-sm text-zinc-200/75 backdrop-blur md:text-base">
            <Row k="Network" v="Base Mainnet" />
            <Row k="Season" v="I — The Alignment" />
            <Row k="Status" v="Active" />
            <Row k="End Condition" v="Decision-complete" />
          </div>

          <p className="mt-4 text-xs leading-6 text-zinc-200/55">
            This page is a threshold. It does not persuade. It prepares.
          </p>
        </section>

        {/* Final Action (repeat) */}
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
    </main>
  );
}

function AlignmentCard({
  title,
  subtitle,
  note,
}: {
  title: string;
  subtitle: string;
  note?: string;
}) {
  return (
    <div className="group rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur transition hover:border-zinc-200/20 hover:bg-zinc-50/10">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-xl text-zinc-100/95 md:text-2xl">{title}</h3>
        {note ? (
          <span className="text-[11px] tracking-[0.22em] text-zinc-200/55">
            {note}
          </span>
        ) : (
          <span className="text-[11px] tracking-[0.22em] text-zinc-200/35 opacity-0 transition group-hover:opacity-100">
            ALIGNMENT
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-7 text-zinc-200/70 md:text-base">
        {subtitle}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-zinc-200/55">{k}</span>
      <span className="text-zinc-100/90">{v}</span>
    </div>
  );
}
