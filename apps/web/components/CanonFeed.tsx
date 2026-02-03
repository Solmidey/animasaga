// apps/web/components/CanonFeed.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

type CanonListItem = {
  id: string;
  season: number;
  slug: string;
  title: string;
  subtitle: string | null;
  isoDate: string;
  excerpt: string;
  hashSha256: string;
  unlockWitnesses?: number | null;
};

type CanonSingle = CanonListItem & { body?: string };

type Milestones = {
  seasonId: number;
  witnessCount: number;
  targets: { canon_ch_002: number; eclipse: number };
  unlocked: { canon_ch_002: boolean; eclipse: boolean };
};

type GateState = {
  checking: boolean;
  witnessed: boolean | null;
  aligned: boolean | null;
  factionName: "Flame" | "Veil" | "Echo" | "Crown" | "Unknown" | null;
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
  return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-zinc-200/10 bg-black/20 p-5">{children}</div>;
}

export default function CanonFeed() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  const [list, setList] = useState<CanonListItem[]>([]);
  const [active, setActive] = useState<CanonSingle | null>(null);
  const [milestones, setMilestones] = useState<Milestones | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingBody, setLoadingBody] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If user clicks unseal while disconnected, we auto-continue after connect
  const [pendingUnseal, setPendingUnseal] = useState(false);

  // Live gate state for status line + CTA logic
  const [gate, setGate] = useState<GateState>({
    checking: false,
    witnessed: null,
    aligned: null,
    factionName: null,
  });

  // Prevent duplicate auto-unseal spam
  const autoUnsealRanRef = useRef(false);

  const fetchList = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/canon", { cache: "no-store" });
      const json = await res.json().catch(() => null);
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
      const json = await res.json().catch(() => null);
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

  const isUnlockedByMilestone = (c: CanonListItem) => {
    if (c.slug === "ch-002") return Boolean(milestones?.unlocked?.canon_ch_002);
    return true;
  };

  const openChapter = (c: CanonListItem) => {
    setErr(null);
    setActive({ ...c });
    autoUnsealRanRef.current = false;
  };

  // --- Gate refresh (wallet -> witness + alignment) ---
  const refreshGate = async (addr: string) => {
    setGate((g) => ({ ...g, checking: true }));
    try {
      // Witness status
      const wRes = await fetch(`/api/witness/status?address=${addr}`, { cache: "no-store" });
      const wJson = await wRes.json().catch(() => ({}));
      const witnessed = Boolean(wRes.ok && wJson?.witnessed);

      // Alignment snapshot
      const rRes = await fetch(`/api/reflect?address=${addr}`, { cache: "no-store" });
      const rJson = await rRes.json().catch(() => ({}));
      const aligned = Boolean(rRes.ok && rJson?.elyndra?.hasChosen);
      const factionName =
        typeof rJson?.elyndra?.factionName === "string"
          ? (rJson.elyndra.factionName as GateState["factionName"])
          : "Unknown";

      setGate({ checking: false, witnessed, aligned, factionName });
    } catch {
      setGate({ checking: false, witnessed: null, aligned: null, factionName: null });
    }
  };

  // Refresh gate when wallet changes or chapter changes
  useEffect(() => {
    if (!isConnected || !address) {
      setGate({ checking: false, witnessed: null, aligned: null, factionName: null });
      return;
    }
    refreshGate(address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, active?.id]);

  // Optional gentle refresh while chapter is open (keeps UI honest after tx confirms)
  useEffect(() => {
    if (!active) return;
    if (!isConnected || !address) return;

    const t = window.setInterval(() => {
      refreshGate(address);
    }, 12_000);

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, isConnected, address]);

  const gateLine = useMemo(() => {
    if (!isConnected || !address) return "Wallet not connected.";
    if (gate.checking) return "Verifying your chain…";
    if (gate.aligned === false) return "Not aligned.";
    if (gate.witnessed === false) return "Not witnessed.";
    if (gate.witnessed === true && gate.aligned === true) return "Witnessed.";
    return "Status unknown (RPC delay).";
  }, [isConnected, address, gate.checking, gate.aligned, gate.witnessed]);

  const runUnseal = async () => {
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

    // Strict: must be aligned + witnessed (if RPC delay returns null, treat as not ready)
    if (gate.aligned !== true) {
      setErr("Unseal requires Alignment. Bind yourself to a faction first.");
      return;
    }
    if (gate.witnessed !== true) {
      setErr("Unseal requires an onchain Witness mark. Complete the Call to Witness first.");
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

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Unseal failed.");

      setActive(json?.chapter ?? active);
    } catch (e: any) {
      setErr(e?.message ?? "Unseal failed.");
    } finally {
      setLoadingBody(false);
      setPendingUnseal(false);
      autoUnsealRanRef.current = true;
    }
  };

  // Opens wallet modal if not connected; otherwise unseals
  const unseal = async () => {
    setErr(null);
    if (!active) return;

    // If already unsealed, do nothing
    if (active.body) return;

    if (!isConnected || !address) {
      setPendingUnseal(true);
      autoUnsealRanRef.current = false;
      if (openConnectModal) openConnectModal();
      else setErr("Connect your wallet (open /align) to continue.");
      return;
    }

    await runUnseal();
  };

  // Auto-run unseal after wallet connects (only once)
  useEffect(() => {
    if (!pendingUnseal) return;
    if (!isConnected || !address) return;
    if (autoUnsealRanRef.current) return;
    runUnseal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUnseal, isConnected, address]);

  const unsealLabel = useMemo(() => {
    if (loadingBody) return "Unsealing…";
    if (!isConnected) return "Connect & Unseal →";
    if (gate.aligned === false || gate.aligned === null) return "Align to Unseal →";
    if (gate.witnessed === false || gate.witnessed === null) return "Become Witness to Unseal →";
    return "Unseal →";
  }, [loadingBody, isConnected, gate.aligned, gate.witnessed]);

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

          <p className="mt-5 text-sm text-zinc-200/55">{gateLine}</p>

          {isConnected && address && gate.factionName && (
            <p className="mt-1 text-xs text-zinc-200/45">
              Faction: <span className="text-zinc-100/70">{gate.factionName}</span>
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs tracking-[0.28em] text-zinc-200/60">INTEGRITY</p>
          <p className="mt-2 font-mono text-xs text-zinc-100/70">
            {active ? shortHash(active.hashSha256) : "sha256…"}
          </p>
          <p className="mt-1 text-xs text-zinc-200/50">{active ? formatIso(active.isoDate) : ""}</p>
        </div>
      </div>

      {eclipseUnlocked && (
        <div className="mt-6">
          <Card>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">ECLIPSE</p>
            <p className="mt-2 text-sm text-zinc-200/75">
              The witness threshold has been met. Elyndra is listening harder now.
            </p>
            <p className="mt-3 text-xs text-zinc-200/55">Tip: enable sound on the Threshold to feel the shift.</p>
          </Card>
        </div>
      )}

      {err && <p className="mt-5 text-sm text-zinc-200/70">{err}</p>}

      {!active && (
        <div className="mt-7 space-y-3">
          {loading && (
            <Card>
              <p className="text-sm text-zinc-200/70">Summoning canon…</p>
            </Card>
          )}

          {!loading && list.length === 0 && (
            <Card>
              <p className="text-sm text-zinc-200/70">No chapters yet.</p>
            </Card>
          )}

          {!loading &&
            list.map((c) => {
              const locked = !isUnlockedByMilestone(c);
              const need = milestones?.targets?.canon_ch_002 ?? 5;

              return (
                <button
                  key={c.id}
                  onClick={() => openChapter(c)}
                  className="group w-full rounded-2xl border border-zinc-200/10 bg-black/20 p-5 text-left hover:bg-black/30"
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
                      <p className="mt-3 text-xs text-zinc-200/60 group-hover:text-zinc-100/80">Open →</p>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      )}

      {active && (
        <div className="mt-7 space-y-3">
          <Card>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">EXCERPT</p>
            <p className="mt-3 text-sm leading-7 text-zinc-200/80">{active.excerpt}</p>
          </Card>

          <Card>
            <p className="text-xs tracking-[0.28em] text-zinc-200/60">SEALED TEXT</p>

            {active.body ? (
              <pre className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-200/80">{active.body}</pre>
            ) : (
              <>
                <p className="mt-3 text-sm text-zinc-200/70">Full text requires an onchain witness mark.</p>
                <p className="mt-2 text-xs text-zinc-200/55">
                  Elyndra will verify your signature, then confirm witness status onchain.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={unseal}
                    disabled={loadingBody}
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10 disabled:opacity-50"
                  >
                    {unsealLabel}
                  </button>

                  <Link
                    href="/align"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
                  >
                    Align →
                  </Link>
                  <Link
                    href="/reflect"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
                  >
                    Reflection →
                  </Link>
                  <Link
                    href="/chronicle#heartbeat"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-4 py-2 text-sm hover:bg-zinc-50/10"
                  >
                    Heartbeat →
                  </Link>
                </div>

                <p className="mt-4 text-xs text-zinc-200/55">
                  To unseal: <span className="text-zinc-100/70">Aligned</span> +{" "}
                  <span className="text-zinc-100/70">Witnessed</span>.
                </p>
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
