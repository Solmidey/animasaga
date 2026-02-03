// apps/web/app/api/canon/route.ts
import { NextResponse } from "next/server";
import { getCanonChapterById, listCanonChapters } from "@/lib/canon-reader";

export const runtime = "nodejs";
export const revalidate = 10;

type MaybeChoices = { choices?: any[] | undefined };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  // Single chapter (public view only — never ship body)
  if (id) {
    const chapter = getCanonChapterById(id);
    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    }

    const maybeChoices = (chapter as MaybeChoices).choices;

    return NextResponse.json(
      {
        mode: "single",
        chapter: {
          id: chapter.id,
          season: chapter.season,
          slug: chapter.slug,
          title: chapter.title,
          subtitle: (chapter as any).subtitle ?? null,
          isoDate: chapter.isoDate,
          excerpt: chapter.excerpt,
          hashSha256: chapter.hashSha256,
          ...(Array.isArray(maybeChoices) ? { choices: maybeChoices } : {}),
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  }

  // List view
  const chapters = listCanonChapters().slice(0, 12);

  return NextResponse.json(
    {
      mode: "list",
      chapters: chapters.map((c: any) => ({
        id: c.id,
        season: c.season,
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle ?? null,
        isoDate: c.isoDate,
        excerpt: c.excerpt,
        hashSha256: c.hashSha256,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
  );
}
