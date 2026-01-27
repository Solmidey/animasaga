"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FactionName = "Flame" | "Veil" | "Echo" | "Unknown";

function shortAddr(addr: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function seedFromHex(hex: string) {
  let s = 0;
  for (let i = 0; i < hex.length; i++) s = (s * 31 + hex.charCodeAt(i)) >>> 0;
  return s >>> 0;
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
}

export default function AlignmentSigilCard(props: {
  address: string;
  faction: FactionName;
  seasonId: number;
  commitmentBlock: number | null;
  commitmentHash: string | null;
  siteUrl?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const title = useMemo(() => {
    if (props.faction === "Flame") return "Bearer of Flame";
    if (props.faction === "Veil") return "Bearer of Veil";
    if (props.faction === "Echo") return "Bearer of Echo";
    return "Unaligned";
  }, [props.faction]);

  const vow = useMemo(() => {
    if (props.faction === "Flame") return "Action before certainty.";
    if (props.faction === "Veil") return "Truth withheld for survival.";
    if (props.faction === "Echo") return "Influence amplified—under restraint.";
    return "Silence is permitted.";
  }, [props.faction]);

  const sigilSrc = useMemo(() => {
    if (props.faction === "Flame") return "/sigils/flame.png";
    if (props.faction === "Veil") return "/sigils/veil.png";
    if (props.faction === "Echo") return "/sigils/echo.png";
    return null;
  }, [props.faction]);

  const filename = useMemo(() => {
    const f = props.faction.toLowerCase();
    return `animasaga-${f}-season-${props.seasonId}.png`;
  }, [props.faction, props.seasonId]);

  const shareText = useMemo(() => {
    const base = `I aligned with ${title} in Elyndra — Season ${props.seasonId}.`;
    const w = `Wallet: ${shortAddr(props.address)}.`;
    const url = props.siteUrl ? `\n${props.siteUrl}` : "";
    return `${base}\n${w}${url}`;
  }, [title, props.seasonId, props.address, props.siteUrl]);

  const shareX = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const shareFarcaster = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://warpcast.com/~/compose?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // silent
    }
  };

  const draw = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // @ts-ignore
    if (document?.fonts?.ready) {
      // @ts-ignore
      await document.fonts.ready.catch(() => {});
    }

    const [sigilImg, frameImg, noiseImg] = await Promise.all([
      sigilSrc ? loadImage(sigilSrc) : Promise.resolve(null),
      loadImage("/sigils/frame.png"),
      loadImage("/sigils/noise.png"),
    ]);

    const W = 1200;
    const H = 630;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#05050A");
    bg.addColorStop(0.45, "#070712");
    bg.addColorStop(1, "#030308");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const vg = ctx.createRadialGradient(W * 0.5, H * 0.35, 50, W * 0.5, H * 0.35, 700);
    vg.addColorStop(0, "rgba(255,255,255,0.06)");
    vg.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (noiseImg) {
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.drawImage(noiseImg, 0, 0, W, H);
      ctx.restore();
    }

    const seed = seedFromHex(props.address + (props.commitmentHash ?? ""));
    const rnd = lcg(seed);

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    let x = W * (0.18 + rnd() * 0.08);
    let y = H * (0.12 + rnd() * 0.08);
    ctx.moveTo(x, y);

    for (let i = 0; i < 12; i++) {
      x += W * (0.05 + rnd() * 0.06);
      y += H * (0.03 + rnd() * 0.06);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let b = 0; b < 8; b++) {
      ctx.beginPath();
      let bx = W * (0.25 + rnd() * 0.5);
      let by = H * (0.18 + rnd() * 0.6);
      ctx.moveTo(bx, by);
      for (let k = 0; k < 4; k++) {
        bx += W * (rnd() * 0.05 - 0.02);
        by += H * (rnd() * 0.05 - 0.02);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }

    const cx = W * 0.73;
    const cy = H * 0.33;

    if (sigilImg) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      const size = 360;
      ctx.drawImage(sigilImg, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
    }

    if (frameImg) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.drawImage(frameImg, 0, 0, W, H);
      ctx.restore();
    }

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = '700 54px var(--font-display), "Cinzel", ui-serif, Georgia, serif';
    ctx.fillText("ANIMASAGA", 72, 110);

    ctx.fillStyle = "rgba(255,255,255,0.74)";
    ctx.font = '500 18px var(--font-body), "Inter", ui-sans-serif, system-ui';
    ctx.fillText("Onchain Chronicle of Elyndra", 74, 145);

    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.font = '700 38px var(--font-display), "Cinzel", ui-serif, Georgia, serif';
    ctx.fillText(title, 72, 230);

    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = '500 22px var(--font-body), "Inter", ui-sans-serif, system-ui';
    wrapText(ctx, vow, 72, 270, 560, 30);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = '500 18px var(--font-body), "Inter", ui-sans-serif, system-ui';
    ctx.fillText(`Season ${props.seasonId} — The Alignment`, 72, 525);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = '500 16px var(--font-body), "Inter", ui-sans-serif, system-ui';
    ctx.fillText(`Wallet: ${shortAddr(props.address)}`, 72, 555);

    const blockLine =
      props.commitmentBlock && props.commitmentBlock > 0
        ? `Recorded at block ${props.commitmentBlock}`
        : "Recorded on Base";
    ctx.fillText(blockLine, 72, 580);

    if (props.siteUrl) {
      ctx.fillStyle = "rgba(255,255,255,0.40)";
      ctx.font = '500 14px var(--font-body), "Inter", ui-sans-serif, system-ui';
      ctx.fillText(props.siteUrl, 72, 605);
    }
  };

  useEffect(() => {
    setReady(true);
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async () => {
    await draw();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloaded(true);
  };

  if (!ready) return null;

  return (
    <div className="mt-10 rounded-3xl border border-zinc-200/10 bg-zinc-50/5 p-6 backdrop-blur">
      <p className="text-xs tracking-[0.22em] text-zinc-200/60">SIGIL (SHAREABLE)</p>

      <div className="mt-5 grid gap-6 md:grid-cols-2 md:items-start">
        <div className="rounded-2xl border border-zinc-200/10 bg-black/40 p-3">
          <canvas ref={canvasRef} className="w-full h-auto rounded-xl" />
        </div>

        <div className="space-y-4">
          <p className="text-sm leading-7 text-zinc-200/70">
            Export your sigil as a PNG, then post it. The Chronicle grows by witness.
          </p>

          {/* Primary actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={download}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
            >
              Download PNG →
            </button>

            <button
              onClick={copyShareText}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
            >
              {copied ? "Copied" : "Copy share text"}
            </button>

            <button
              onClick={shareX}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
            >
              Open X Composer →
            </button>

            <button
              onClick={shareFarcaster}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200/10 bg-zinc-50/5 px-5 py-2 text-sm hover:bg-zinc-50/10"
            >
              Open Farcaster →
            </button>
          </div>

          {/* Guided helper (ultimate growth) */}
          <div className="rounded-2xl border border-zinc-200/10 bg-zinc-950/30 p-4">
            <p className="text-xs tracking-[0.22em] text-zinc-200/60">POST THIS SIGIL</p>

            <ol className="mt-3 space-y-2 text-sm text-zinc-200/70 list-decimal pl-5">
              <li>
                Click <span className="text-zinc-100/90">Download PNG</span> (you’ll attach it to your post).
              </li>
              <li>
                Click <span className="text-zinc-100/90">Copy share text</span>.
              </li>
              <li>
                Click <span className="text-zinc-100/90">Open X Composer</span> or{" "}
                <span className="text-zinc-100/90">Open Farcaster</span>.
              </li>
              <li>Paste the text, then attach the PNG you downloaded.</li>
              <li>Post. The heartbeat changes.</li>
            </ol>

            <label className="mt-4 flex items-start gap-3 text-xs text-zinc-200/65">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={downloaded}
                onChange={(e) => setDownloaded(e.target.checked)}
              />
              <span>I downloaded the PNG (ready to attach).</span>
            </label>
          </div>

          <p className="text-xs text-zinc-200/55">
            Pro tip: posts with an image travel farther. Elyndra rewards witnesses.
          </p>
        </div>
      </div>
    </div>
  );
}
