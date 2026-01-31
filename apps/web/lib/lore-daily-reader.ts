// apps/web/lib/lore-daily-reader.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";

export type DailyLore = {
  dateKey: string; // YYYY-MM-DD
  title: string;
  axiom: string;
  body: string;
  hashSha256: string;
};

const ROOT = process.cwd();
const LORE_DIR = path.join(ROOT, "content", "lore", "daily");

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

function safeListFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
  } catch {
    return [];
  }
}

export function listDailyLore(): DailyLore[] {
  const files = safeListFiles(LORE_DIR).filter((f) => f.endsWith(".md"));

  const items: DailyLore[] = [];
  for (const f of files) {
    const dateKey = f.replace(/\.md$/, "");
    const raw = safeReadFile(path.join(LORE_DIR, f));
    if (!raw) continue;

    const { meta, body } = stripFrontmatter(raw);
    const title = meta.title || "Lore Drop";
    const axiom = meta.axiom || "Axiom is silent.";

    items.push({
      dateKey,
      title,
      axiom,
      body,
      hashSha256: sha256Hex(raw),
    });
  }

  items.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  return items;
}

export function getDailyLore(dateKey: string): DailyLore | null {
  const file = path.join(LORE_DIR, `${dateKey}.md`);
  const raw = safeReadFile(file);
  if (!raw) return null;

  const { meta, body } = stripFrontmatter(raw);
  return {
    dateKey,
    title: meta.title || "Lore Drop",
    axiom: meta.axiom || "Axiom is silent.",
    body,
    hashSha256: sha256Hex(raw),
  };
}
