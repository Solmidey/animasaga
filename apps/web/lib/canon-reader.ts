// apps/web/lib/canon-reader.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";

export type CanonChapter = {
  id: string;              // "season-1/ch-001"
  season: number;          // 1
  slug: string;            // "ch-001"
  title: string;
  subtitle?: string;
  isoDate: string;         // ISO string (stable)
  excerpt: string;
  hashSha256: string;      // integrity marker (later we can anchor onchain)
  body: string;            // markdown content (without frontmatter)
};

const ROOT = process.cwd(); // apps/web when executed in that workspace
const CANON_DIR = path.join(ROOT, "content", "canon");

function safeReadFile(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function sha256Hex(s: string) {
  return "0x" + crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function stripFrontmatter(raw: string) {
  // very small YAML frontmatter parser: --- ... ---
  if (!raw.startsWith("---")) return { meta: {}, body: raw };

  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };

  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trimStart();

  const meta: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k) meta[k] = v;
  }
  return { meta, body };
}

function makeExcerpt(md: string) {
  const text = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/#+\s/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 220 ? text.slice(0, 220).trimEnd() + "…" : text;
}

export function listCanonChapters(): CanonChapter[] {
  // season folders like season-1, season-2...
  const seasons = safeListDirs(CANON_DIR).filter((d) => d.startsWith("season-"));
  const chapters: CanonChapter[] = [];

  for (const seasonDir of seasons) {
    const seasonNum = Number(seasonDir.replace("season-", ""));
    if (!Number.isFinite(seasonNum)) continue;

    const fullSeason = path.join(CANON_DIR, seasonDir);
    const files = safeListFiles(fullSeason).filter((f) => f.endsWith(".md"));

    for (const f of files) {
      const raw = safeReadFile(path.join(fullSeason, f));
      if (!raw) continue;

      const { meta, body } = stripFrontmatter(raw);
      const slug = f.replace(/\.md$/, "");
      const id = `${seasonDir}/${slug}`;

      const title = meta.title || `Chapter ${slug.replace("ch-", "")}`;
      const subtitle = meta.subtitle || undefined;
      const isoDate = meta.date || new Date(0).toISOString(); // stable default

      const hashSha256 = sha256Hex(raw);
      const excerpt = makeExcerpt(body);

      chapters.push({
        id,
        season: seasonNum,
        slug,
        title,
        subtitle,
        isoDate,
        excerpt,
        hashSha256,
        body,
      });
    }
  }

  // newest first by date; if missing date, stable secondary sort by id
  chapters.sort((a, b) => {
    const da = Date.parse(a.isoDate) || 0;
    const db = Date.parse(b.isoDate) || 0;
    if (db !== da) return db - da;
    return a.id.localeCompare(b.id);
  });

  return chapters;
}

export function getCanonChapterById(id: string): CanonChapter | null {
  const all = listCanonChapters();
  return all.find((c) => c.id === id) ?? null;
}

function safeListDirs(dir: string): string[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

function safeListFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
  } catch {
    return [];
  }
}
