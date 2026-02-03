// scripts/generate-weekly-canon.mjs
import fs from "node:fs";
import path from "node:path";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const SEASON = Number(process.env.CANON_SEASON_ID || "1");

function resolveCanonRoot() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "apps", "web", "content", "canon"),
    path.join(cwd, "content", "canon"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {}
  }
  return candidates[0]; // predictable default
}

const CANON_ROOT = resolveCanonRoot();
const SEASON_DIR = path.join(CANON_ROOT, `season-${SEASON}`);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function listExistingChapterNums(dir) {
  try {
    const files = fs.readdirSync(dir);
    const nums = [];
    for (const f of files) {
      const m = /^ch-(\d{3})\.md$/.exec(f);
      if (m) nums.push(Number(m[1]));
    }
    return nums.sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function groqChat({ system, user }) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.75,
      max_tokens: 1400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Groq API error: ${res.status} ${t}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Groq returned empty content.");
  return content.trim();
}

function sanitizeTitle(s) {
  return String(s || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function parseDraft(draft) {
  const lines = draft.split("\n");
  let title = "";
  let subtitle = "";
  let bodyStart = 0;

  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const l = lines[i].trim();
    if (l.toLowerCase().startsWith("title:")) title = l.slice(6).trim();
    if (l.toLowerCase().startsWith("subtitle:")) subtitle = l.slice(9).trim();
    if (l.toLowerCase().startsWith("body:")) {
      bodyStart = i + 1;
      break;
    }
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  return {
    title: sanitizeTitle(title || "The Scar Deepens"),
    subtitle: sanitizeTitle(subtitle || "Axiom records what the living refuse to say."),
    body,
  };
}

function buildMarkdown({ title, subtitle, date, body }) {
  return `---
title: "${title}"
subtitle: "${subtitle}"
date: "${date}"
---
${body}
`;
}

async function main() {
  ensureDir(SEASON_DIR);

  const existing = listExistingChapterNums(SEASON_DIR);
  const nextNum = (existing.at(-1) || 0) + 1;
  const slug = `ch-${pad3(nextNum)}`;
  const outPath = path.join(SEASON_DIR, `${slug}.md`);

  const date = todayISODate();

  const system =
    `You are Axiom: an old, wise chronicler for an animecentric onchain narrative world called Elyndra.\n` +
    `Write vivid, cinematic prose with disciplined clarity.\n` +
    `No profanity. No real people. No copyrighted characters.\n` +
    `End with 2–4 numbered choices that are short, decisive, and morally tense.\n` +
    `Make it feel like a season arc called "Season 1: Eclipse".\n` +
    `Keep the chapter length ~700–1100 words.\n` +
    `Output format MUST be:\n` +
    `Title: <...>\n` +
    `Subtitle: <...>\n` +
    `Body:\n` +
    `<markdown body>\n`;

  const user =
    `Write the next canon chapter.\n` +
    `Season: ${SEASON}\n` +
    `Chapter slug: ${slug}\n` +
    `Date (UTC): ${date}\n` +
    `Factions: Flame, Veil, Echo (Crown is rare).\n` +
    `Key motifs: fracture, scar, witness, alignment, eclipse.\n` +
    `Include at least one subtle reference to Base/onchain permanence without sounding like marketing.\n`;

  const draft = await groqChat({ system, user });
  const parsed = parseDraft(draft);

  if (!parsed.body || parsed.body.length < 200) {
    throw new Error("Generated chapter body is too short / missing.");
  }

  const md = buildMarkdown({
    title: parsed.title,
    subtitle: parsed.subtitle,
    date,
    body: parsed.body,
  });

  fs.writeFileSync(outPath, md, "utf8");

  console.log("Wrote chapter:", outPath);
  console.log("Canon root:", CANON_ROOT);
  console.log("Season:", SEASON, "Slug:", slug);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
