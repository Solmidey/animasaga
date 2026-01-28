"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type SoundState = { enabled: boolean; volume: number };
const STORAGE_KEY = "animasaga_sound_v1";

function safeParse(raw: string | null): SoundState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (typeof v?.enabled !== "boolean") return null;
    const vol = typeof v?.volume === "number" ? v.volume : 0.28;
    return { enabled: v.enabled, volume: Math.min(1, Math.max(0, vol)) };
  } catch {
    return null;
  }
}

export default function SoundToggle() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const visible = useMemo(() => pathname === "/" || pathname === "/chronicle", [pathname]);
  const shouldAutoPause = useMemo(() => pathname.startsWith("/align"), [pathname]);

  const [state, setState] = useState<SoundState>({ enabled: false, volume: 0.28 });
  const [ready, setReady] = useState(false);

  // milestone eclipse truth (client-fetched)
  const [eclipse, setEclipse] = useState(false);

  useEffect(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (saved) setState(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  // Poll eclipse state lightly (so it flips when a milestone is hit)
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/eclipse", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (res.ok) setEclipse(Boolean(json?.eclipse?.isActive));
      } catch {
        // silent
      } finally {
        t = setTimeout(tick, 30000);
      }
    };

    tick();

    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, []);

  const src = useMemo(() => {
    return eclipse ? "/audio/elyndra-eclipse.mp3" : "/audio/elyndra-theme.mp3";
  }, [eclipse]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.volume = state.volume;

    // Swap track if needed
    if (el.getAttribute("src") !== src) {
      const wasPlaying = !el.paused;
      el.pause();
      el.setAttribute("src", src);
      el.load();
      if (state.enabled && wasPlaying && !shouldAutoPause) {
        el.play().catch(() => {});
      }
    }

    if (shouldAutoPause) {
      if (!el.paused) el.pause();
      return;
    }

    if (state.enabled) el.play().catch(() => {});
    else if (!el.paused) el.pause();
  }, [state.enabled, state.volume, src, shouldAutoPause]);

  if (!visible) return null;

  const toggle = () => setState((s) => ({ ...s, enabled: !s.enabled }));
  const setVol = (v: number) => setState((s) => ({ ...s, volume: v }));

  return (
    <div className="fixed right-4 top-4 z-50">
      <audio ref={audioRef} src={src} loop preload="metadata" />

      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/10 bg-zinc-50/5 px-3 py-2 text-xs text-zinc-100/90 hover:bg-zinc-50/10"
          aria-label={state.enabled ? "Silence" : "Awaken sound"}
        >
          <span className="font-display tracking-wide">{state.enabled ? "Silence" : "Awaken Sound"}</span>
        </button>

        {eclipse && (
          <span className="hidden sm:inline-flex rounded-full border border-zinc-200/25 bg-zinc-50/10 px-2 py-1 text-[10px] tracking-[0.22em] text-zinc-100/90">
            ECLIPSE
          </span>
        )}

        <div className={`flex items-center gap-2 ${state.enabled ? "" : "opacity-40"}`}>
          <span className="text-[10px] tracking-[0.22em] text-zinc-200/60">VOL</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(state.volume * 100)}
            onChange={(e) => setVol(Number(e.target.value) / 100)}
            disabled={!state.enabled}
            className="h-1 w-24 accent-zinc-200/70"
          />
        </div>
      </div>
    </div>
  );
}
