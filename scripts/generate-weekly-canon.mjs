import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const GROQ_KEY = process.env.GROQ_API_KEY || "";
if (!GROQ_KEY) throw new Error("Missing GROQ_API_KEY");

const MODEL = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

const sealKeyB64 = process.env.CANON_SEAL_KEY || "";
if (!sealKeyB64) throw new Error("Missing CANON_SEAL_KEY");
const SEAL_KEY = Buffer.from(sealKeyB64, "base64");
if (SEAL_KEY.length !== 32) throw new Error("CANON_SEAL_KEY must be 32 bytes base64");

const chaptersPath = path.join(process.cwd(), "apps/web/lib/canon/chapters.json");

function readChapters() {
  const raw = fs.readFileSync(chaptersPath, "utf8");
  const json = JSON.parse(raw);
  if (!json.chapters || !Array.isArray(json.chapters)) json.chapters = [];
  return json;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function seal(body) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", SEAL_KEY, iv);
  const ct = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: "aes-256-gcm",
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
    ctB64: ct.toString("base64"),
  };
}

function nextSlugAndId(chapters) {
  // Find latest season 1 chapter index by slug "ch-001" etc
  const s1 = chapters.filter((c) => Number(c.season) === 1);
  const nums = s1
    .map((c) => String(c.slug || "").match(/^ch-(\d{3})$/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const slug = `ch-${String(next).padStart(3, "0")}`;
  const id = `s1-${slug}`;
  return { slug, id, index: next };
}

async function groqChat(messages) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.9,
      max_tokens: 2200,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Groq error: ${res.status} ${JSON.stringify(json).slice(0, 400)}`);
  }
  const content = json?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

(async function main() {
  const store = readChapters();
  const chapters = store.chapters;

  const { slug, id, index } = nextSlugAndId(chapters);
  const isoDate = new Date().toISOString().slice(0, 10);

  const prompt = [
    {
      role: "system",
      content:
        "You are Axiom, an old and wise narrator in the world of Elyndra (AnimaSaga). " +
        "Write a canon chapter in epic, readable prose. No profanity. No real-world politics. " +
        "Keep continuity: factions are Flame, Veil, Echo, Crown. " +
        "End the chapter with three branch choices suitable for a vote. " +
        "Return ONLY JSON matching the schema.",
    },
    {
      role: "user",
      content: JSON.stringify({
        schema: {
          title: "string",
          subtitle: "string (short)",
          excerpt: "string (2–3 sentences, public)",
          body: "string (full chapter, 900–1400 words, includes mysterious Axiom voice)",
          choices: [
            { id: "a|b|c", label: "string (short)", omen: "string (1 sentence consequence tease)" },
          ],
        },
        context: {
          season: 1,
          chapterIndex: index,
          slug,
          theme: "Eclipse: consequences, fractures, vows, witness marks",
          stylisticNotes: [
            "Use sparse sacred imagery",
            "Make each faction feel like a philosophy",
            "Axiom speaks with measured authority",
            "End with a single chilling line",
          ],
        },
      }),
    },
  ];

  const out = await groqChat(prompt);

  if (!out?.title || !out?.excerpt || !out?.body || !Array.isArray(out?.choices)) {
    throw new Error("Groq output missing required fields.");
  }

  const hashSha256 = sha256(out.body);
  const sealed = seal(out.body);

  const chapter = {
    id,
    season: 1,
    slug,
    title: String(out.title).trim(),
    subtitle: String(out.subtitle || "").trim() || null,
    isoDate,
    excerpt: String(out.excerpt).trim(),
    hashSha256,
    sealed,
    choices: out.choices.slice(0, 3).map((c) => ({
      id: String(c.id || "").trim().slice(0, 1) || "a",
      label: String(c.label || "").trim(),
      omen: String(c.omen || "").trim(),
    })),
  };

  store.chapters.unshift(chapter);

  fs.writeFileSync(chaptersPath, JSON.stringify(store, null, 2) + "\n", "utf8");
  console.log(`Wrote chapter ${id} (${slug})`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
