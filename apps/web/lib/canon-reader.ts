// apps/web/lib/canon-reader.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";

export type CanonChapterPublic = {
  id: string; // "season-1/ch-001"
  season: number; // 1
  slug: string; // "ch-001"
  title: string;
  subtitle?: string | null;
  isoDate: string; // ISO-ish string
  excerpt: string;
  hashSha256: string; // integrity marker
  // optional (future)
  unlockWitnesses?: number | null;
};

export type CanonChapterPrivate = CanonChapterPublic & {
  body: string; // markdown content (without frontmatter)
};

/**
 * We resolve the canon folder robustly because:
 * - locally you might run with cwd = apps/web
 * - on Vercel/build you often get cwd = repo root
 *
 * Supported layouts:
 * - apps/web/content/canon
 * - content/canon   (if running from apps/web as cwd)
 */
function resolveCanonDir(): string {
  const cwd = process.cwd();

  const candidates = [
    path.join(cwd, "content", "canon"),
    path.join(cwd, "apps", "web", "content", "canon"),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {
      // ignore
    }
  }

  // fallback to first candidate for predictable behavior
  return candidates[0];
}

const CANON_DIR = resolveCanonDir();

function safeReadFile(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function safeListDirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function safeListFiles(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch {
    return [];
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

function readAllPrivate(): CanonChapterPrivate[] {
  // season folders like season-1, season-2...
  const seasons = safeListDirs(CANON_DIR).filter((d) => d.startsWith("season-"));
  const chapters: CanonChapterPrivate[] = [];

  for (const seasonDir of seasons) {
    const seasonNum = Number(seasonDir.replace("season-", ""));
    if (!Number.isFinite(seasonNum)) continue;

    const fullSeason = path.join(CANON_DIR, seasonDir);
    const files = safeListFiles(fullSeason).filter((f) => f.endsWith(".md"));

    for (const f of files) {
      const filePath = path.join(fullSeason, f);
      const raw = safeReadFile(filePath);
      if (!raw) continue;

      const { meta, body } = stripFrontmatter(raw);

      const slug = f.replace(/\.md$/, "");
      const id = `${seasonDir}/${slug}`;

      const title = meta.title || `Chapter ${slug.replace("ch-", "")}`;
      const subtitle = meta.subtitle || null;

      // allow YYYY-MM-DD or ISO. keep stable default if missing.
      const isoDate = meta.date || new Date(0).toISOString();

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

  // newest first by date; stable secondary sort by id
  chapters.sort((a, b) => {
    const da = Date.parse(a.isoDate) || 0;
    const db = Date.parse(b.isoDate) || 0;
    if (db !== da) return db - da;
    return a.id.localeCompare(b.id);
  });

  return chapters;
}

/**
 * Public list: NO body returned here.
 * This keeps /api/canon safe and forces /api/canon/unseal for full text.
 */
export function listCanonChapters(): CanonChapterPublic[] {
  const all = readAllPrivate();
  return all.map((c) => ({
    id: c.id,
    season: c.season,
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle ?? null,
    isoDate: c.isoDate,
    excerpt: c.excerpt,
    hashSha256: c.hashSha256,
  }));
}

/**
 * Private lookup: body included (server-only usage).
 * Use this only inside server routes like /api/canon/unseal.
 */
export function getCanonChapterById(id: string): CanonChapterPrivate | null {
  const all = readAllPrivate();
  return all.find((c) => c.id === id) ?? null;
}

/**
 * For debugging (optional)
 */
export function getCanonDirInfo() {
  return {
    canonDir: CANON_DIR,
    cwd: process.cwd(),
    exists: (() => {
      try {
        return fs.existsSync(CANON_DIR);
      } catch {
        return false;
      }
    })(),
  };
}
