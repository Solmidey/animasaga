// apps/web/components/CanonFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

type CanonListItem = {
  id: string;
  season: number;
  slug: string;
  title: string;
  subtitle: string | null;
  isoDate: string;
  excerpt: string;
  hashSha256: string;
  // optional (future)
  unlockWitnesses?: number | null;
};

type CanonSingle = CanonListItem & { body?: string };

type Milestones = {
  seasonId: number;
  witnessCount: number;
  targets: { canon_ch_002: number; eclipse: number };
  unlocked: { canon_ch_002: boolean; eclipse: boolean };
};

function formatIso(iso: string) {
  const d = iso?.slice(0, 10);
  return d && d.length === 10 ? d : "—";
}
function shortHash(h: string) {
  if (!h || h.length < 12) return "—";
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}
function nonce() {
  // deterministic-enough random for client request; server blocks replay
  return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200/10 bg-black/20 p-5">
      {children}
    </div>
  );
}

export default function CanonFeed() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [list, setList] = useState<CanonListItem[]>([]);
  const [active, setActive] = useState<CanonSingle | null>(null);
  const [milestones, setMilestones] = useState<Milestones | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingBody, setLoadingBody] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/canon", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Canon unavailable.");
      setList(Array.isArray(json?.chapters) ? json.chapters : []);
    } catch (e: any) {
      setErr(e?.message ?? "Canon unavailable.");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      const res = await fetch("/api/milestones", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return;
      setMilestones(json);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    fetchList();
    fetchMilestones();
    const t = window.setInterval(fetchMilestones, 15_000);
    return () => window.clearInterval(t);
  }, []);

  const headerLine = useMemo(() => {
    if (active) return `SEASON ${active.season} • ${active.slug.toUpperCase()}`;
    return "CANON FEED";
  }, [active]);

  const eclipseUnlocked = Boolean(milestones?.unlocked?.eclipse);

  // Chapter lock rule (A3): ch-002 unlocks at milestone canon_ch_002
  const isUnlockedByMilestone = (c: CanonListItem) => {
    if (c.slug === "ch-002") return Boolean(milestones?.unlocked?.canon_ch_002);
    return true;
  };

  const openChapter = (c: CanonListItem) => {
    setErr(null);
    setActive({ ...c });
  };

  const unseal = async () => {
    setErr(null);
    if (!active) return;
    if (!isConnected || !address) {
      setErr("Connect your wallet to unseal.");
      return;
    }
    if (!isUnlockedByMilestone(active)) {
      const need = milestones?.targets?.canon_ch_002 ?? 5;
      setErr(`Locked. Requires ${need} witnesses to unseal this chapter.`);
      return;
    }

    setLoadingBody(true);
    try {
      const issuedAt = new Date().toISOString();
      const n = nonce();
      const msg =
        `AnimaSaga Canon Unseal\n` +
        `Chapter: ${active.id}\n` +
        `Nonce: ${n}\n` +
        `IssuedAt: ${issuedAt}`;

      const signature = await signMessageAsync({ message: msg });

      const res = await fetch("/api/canon/unseal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: active.id,
          address,
          signature,
          nonce: n,
          issuedAt,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Unseal failed.");

      setActive(json?.chapter ?? active);
    } catch (e: any) {
      setErr(e?.message ?? "Unseal failed.");
    } finally {
      setLoadingBody(false);
    }
  };

  return (
    <section className="rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">{headerLine}</p>
          <h2 className="mt-4 font-display text-3xl text-zinc-100/95">
            {active ? active.title : "The Canon"}
          </h2>
          <p className="mt-2 text-sm text-zinc-200/70">
            {active
              ? active.subtitle ?? "A sealed chapter of Elyndra."
              : "Official chapters. Excerpts are public. Full text is witnessed-gated."}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">INTEGRITY</p>
          <p className="mt-2 font-mono text-xs text-zinc-100/70">
            {active ? shortHash(active.hashSha256) : "sha256…"}
          </p>
          <p className="mt-1 text-xs text-zinc-200/50">
            {active ? formatIso(active.isoDate) : ""}
          </p>
        </div>
      </div>

      {/* Eclipse cue (A3) — card only */}
      {eclipseUnlocked && (
        <div className="mt-6">
          <Card>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">ECLIPSE</p>
            <p className="mt-2 text-sm text-zinc-200/75">
              The witness threshold has been met. Elyndra is listening harder now.
            </p>
            <p className="mt-3 text-xs text-zinc-200/55">
              Tip: enable sound on the Threshold to feel the shift.
            </p>
          </Card>
        </div>
      )}

      {err && <p className="mt-5 text-sm text-zinc-200/70">{err}</p>}

      {!active && (
        <div className="mt-7 space-y-3">
          {loading && <Card><p className="text-sm text-zinc-200/70">Summoning canon…</p></Card>}

          {!loading && list.length === 0 && (
            <Card><p className="text-sm text-zinc-200/70">No chapters yet.</p></Card>
          )}

          {!loading &&
            list.map((c) => {
              const locked = !isUnlockedByMilestone(c);
              const need = milestones?.targets?.canon_ch_002 ?? 5;

              return (
                <button
                  key={c.id}
                  onClick={() => openChapter(c)}
                  className="group w-full text-left rounded-2xl border border-zinc-200/10 bg-black/20 p-5 hover:bg-black/30"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-xs tracking-[0.28em] text-zinc-200/60">
                        SEASON {c.season} • {c.slug.toUpperCase()}
                      </p>
                      <p className="mt-2 font-display text-xl text-zinc-100/95">{c.title}</p>
                      <p className="mt-2 text-sm text-zinc-200/70">{c.excerpt}</p>

                      {locked && (
                        <p className="mt-3 text-xs text-zinc-200/55">
                          Locked until <span className="text-zinc-100/70">{need}</span> witnesses.
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-xs text-zinc-100/60">{shortHash(c.hashSha256)}</p>
                      <p className="mt-1 text-xs text-zinc-200/50">{formatIso(c.isoDate)}</p>
                      <p className="mt-3 text-xs text-zinc-200/60 group-hover:text-zinc-100/80">
                        Open →
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      )}

      {active && (
        <div className="mt-7 space-y-3">
          {/* Always show excerpt publicly */}
          <Card>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">EXCERPT</p>
            <p className="mt-3 text-sm leading-7 text-zinc-200/80">{active.excerpt}</p>
          </Card>

          {/* Full body is gated */}
          <Card>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">SEALED TEXT</p>

            {active.body ? (
              <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-200/80">
                {active.body}
              </pre>
            ) : (
              <>
                <p className="mt-3 text-sm text-zinc-200/70">
                  Full text requires an onchain witness mark.
                </p>
                <p className="mt-2 text-xs text-zinc-200/55">
                  The server will verify your signature, then confirm witness status onchain.
                </p>

                <button
                  type="button"
                  onClick={unseal}
                  disabled={loadingBody}
                  className="mt-5 inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10 disabled:opacity-50"
                >
                  {loadingBody ? "Unsealing…" : "Unseal (Witnessed) →"}
                </button>
              </>
            )}
          </Card>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActive(null)}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
            >
              Back to Canon →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
