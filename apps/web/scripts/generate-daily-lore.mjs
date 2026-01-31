// apps/web/scripts/generate-daily-lore.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd(); // repo root in GH Actions
const OUT_DIR = path.join(ROOT, "apps", "web", "content", "lore", "daily");
const STATE_PATH = path.join(ROOT, "apps", "web", "content", "lore", "state.json");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_CHAT = "https://api.groq.com/openai/v1/chat/completions";

if (!GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY env var.");
  process.exit(1);
}

function utcDateKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeRead(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function safeWrite(p, s) {
  fs.writeFileSync(p, s, "utf8");
}

function listExistingLoreFiles() {
  try {
    return fs
      .readdirSync(OUT_DIR, { withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith(".md"))
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };

  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trimStart();

  const meta = {};
  for (const line of fm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k) meta[k] = v;
  }
  return { meta, body };
}

function loadState() {
  const raw = safeRead(STATE_PATH);
  if (!raw) return { lastMotifs: [], lastTitles: [], lastTone: "ominous" };
  try {
    const j = JSON.parse(raw);
    return {
      lastMotifs: Array.isArray(j.lastMotifs) ? j.lastMotifs.slice(0, 12) : [],
      lastTitles: Array.isArray(j.lastTitles) ? j.lastTitles.slice(0, 12) : [],
      lastTone: typeof j.lastTone === "string" ? j.lastTone : "ominous",
    };
  } catch {
    return { lastMotifs: [], lastTitles: [], lastTone: "ominous" };
  }
}

function saveState(next) {
  ensureDir(path.dirname(STATE_PATH));
  safeWrite(STATE_PATH, JSON.stringify(next, null, 2) + "\n");
}

function wordCount(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

function validateMarkdown(md) {
  if (typeof md !== "string" || md.trim().length < 40) return { ok: false, why: "too short" };
  if (md.includes("```")) return { ok: false, why: "contains code fence" };
  if (/as an ai/i.test(md)) return { ok: false, why: "contains AI disclaimer" };

  if (!md.startsWith("---")) return { ok: false, why: "missing frontmatter start" };
  if (!md.includes("\n---")) return { ok: false, why: "missing frontmatter end" };

  const { meta, body } = parseFrontmatter(md);
  if (!meta.title || String(meta.title).trim().length < 3) return { ok: false, why: "missing title" };
  if (!meta.axiom || String(meta.axiom).trim().length < 10) return { ok: false, why: "missing axiom" };

  const wc = wordCount(body);
  if (wc < 70 || wc > 150) return { ok: false, why: `body wordcount ${wc} out of range` };

  return { ok: true, why: "ok", meta, body };
}

async function groqChat(messages, { temperature = 0.9, max_tokens = 420 } = {}) {
  const res = await fetch(GROQ_CHAT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || `Groq error ${res.status}`;
    throw new Error(msg);
  }
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Groq returned no text.");
  return text.trim();
}

function pickMotifsFromText(md) {
  const lower = md.toLowerCase();
  const motifs = [];
  const candidates = [
    "mirror",
    "fracture",
    "eclipse",
    "witness",
    "ledger",
    "veil",
    "echo",
    "flame",
    "threshold",
    "sigil",
    "oath",
    "rift",
    "crack",
  ];
  for (const c of candidates) if (lower.includes(c)) motifs.push(c);
  return motifs.slice(0, 6);
}

function buildMessages({ dateKey, recent, state }) {
  const recentSnippets = recent
    .map((x) => `- ${x.dateKey}: "${x.title}" | axiom: "${x.axiom}"`)
    .join("\n");

  const forbiddenTitles = state.lastTitles.slice(0, 10).join(" | ") || "—";
  const forbiddenMotifs = state.lastMotifs.slice(0, 10).join(" | ") || "—";

  return [
    {
      role: "system",
      content:
        "You are Axiom — ancient, wise, calm, and unnervingly precise. " +
        "Write mythic, legible English. No slang. No emojis. " +
        "No modern meta talk. Never mention being an AI. " +
        "Everything must feel like Elyndra is alive and watching.",
    },
    {
      role: "user",
      content:
        `Generate TODAY'S AnimaSaga daily lore drop as a single Markdown document.\n\n` +
        `DATE KEY (UTC): ${dateKey}\n` +
        `WORLD: Elyndra\n` +
        `VOICE: Axiom (old and wise)\n\n` +
        `FORMAT (MUST MATCH EXACTLY):\n` +
        `---\n` +
        `title: "<short title>"\n` +
        `axiom: "<one sentence quote by Axiom>"\n` +
        `---\n` +
        `<body 70-150 words>\n\n` +
        `RULES:\n` +
        `- Body must be 70-150 words.\n` +
        `- Must include one subtle call-to-action line (not a URL): align, witness, or enter the Chronicle.\n` +
        `- Keep continuity with Season 1: Eclipse.\n` +
        `- Do NOT reuse these motifs exactly: ${forbiddenMotifs}\n` +
        `- Do NOT reuse these recent titles/phrases: ${forbiddenTitles}\n\n` +
        `RECENT DROPS:\n${recentSnippets || "—"}\n\n` +
        `Return ONLY the markdown document.`,
    },
  ];
}

async function main() {
  ensureDir(OUT_DIR);

  const dateKey = utcDateKey();
  const outPath = path.join(OUT_DIR, `${dateKey}.md`);

  if (fs.existsSync(outPath)) {
    console.log(`Lore already exists for ${dateKey}. Exiting.`);
    process.exit(0);
  }

  const state = loadState();

  const files = listExistingLoreFiles();
  const last = files.slice(-7).map((name) => {
    const raw = safeRead(path.join(OUT_DIR, name)) || "";
    const { meta } = parseFrontmatter(raw);
    return {
      dateKey: name.replace(/\.md$/, ""),
      title: String(meta.title || "").slice(0, 80),
      axiom: String(meta.axiom || "").slice(0, 140),
    };
  });

  // Attempt 1
  let draft = await groqChat(buildMessages({ dateKey, recent: last, state }), {
    temperature: 0.95,
    max_tokens: 520,
  });

  let v = validateMarkdown(draft);

  // Attempt 2 repair if needed
  if (!v.ok) {
    const repair = [
      ...buildMessages({ dateKey, recent: last, state }),
      { role: "assistant", content: draft },
      {
        role: "user",
        content:
          `Your output failed validation because: ${v.why}.\n` +
          `Regenerate a corrected markdown document that satisfies ALL rules. Return ONLY markdown.`,
      },
    ];
    draft = await groqChat(repair, { temperature: 0.7, max_tokens: 520 });
    v = validateMarkdown(draft);
    if (!v.ok) {
      console.error(`Lore failed validation twice: ${v.why}`);
      process.exit(1);
    }
  }

  safeWrite(outPath, draft.trimEnd() + "\n");
  console.log(`Wrote daily lore: ${outPath}`);

  // Update state.json
  const motifs = pickMotifsFromText(draft);
  const { meta } = parseFrontmatter(draft);

  const nextState = {
    lastMotifs: [...motifs, ...state.lastMotifs].slice(0, 12),
    lastTitles: [String(meta.title || ""), ...state.lastTitles].filter(Boolean).slice(0, 12),
    lastTone: "ominous",
  };

  saveState(nextState);
  console.log(`Updated lore state: ${STATE_PATH}`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});
