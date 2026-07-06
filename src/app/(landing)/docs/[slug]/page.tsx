import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { markdownToHtml } from "@/lib/markdown";
import { DOCS_CHAPTERS, DOCS_SLUG_TO_FILE, DOCS_TITLES } from "@/components/documentation/docs-data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return DOCS_CHAPTERS.map((ch) => ({ slug: ch.slug }));
}

export default async function DocsSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const fileName = DOCS_SLUG_TO_FILE[slug];

  if (!fileName) {
    notFound();
  }

  const filePath = path.join(process.cwd(), "docs", "user", fileName);
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  const htmlContent = markdownToHtml(content);
  const title = DOCS_TITLES[slug] ?? slug;
  const currentIndex = DOCS_CHAPTERS.findIndex((ch) => ch.slug === slug);
  const prevChapter = currentIndex > 0 ? DOCS_CHAPTERS[currentIndex - 1] : null;
  const nextChapter = currentIndex < DOCS_CHAPTERS.length - 1 ? DOCS_CHAPTERS[currentIndex + 1] : null;

  return (
    <div className="min-h-screen pt-24">
      <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 md:py-10 lg:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/docs"
            className="transition-colors hover:text-foreground"
          >
            Documentation
          </Link>
          <ChevronIcon />
          <span className="font-medium text-foreground">{title}</span>
        </nav>

        {/* Title */}
        <div className="mb-8 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {DOCS_CHAPTERS.find((ch) => ch.slug === slug)?.desc ?? ""}
            </p>
          </div>
        </div>

        {/* Content */}
        <article
          className="[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-sm [&_p]:leading-[1.75] [&_p]:text-foreground/85 [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-foreground/90 [&_hr]:my-8 [&_hr]:border-border/30 [&_ul]:my-3 [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ul>li]:text-sm [&_ul>li]:leading-relaxed [&_ul>li]:list-disc [&_ol]:my-3 [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_ol>li]:text-sm [&_ol>li]:leading-relaxed [&_ol>li]:list-decimal"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Footer navigation */}
        <footer className="mt-12 border-t border-border/40 pt-6">
          <div className="flex items-center justify-between gap-4">
            {prevChapter ? (
              <Link
                href={`/docs/${prevChapter.slug}`}
                className="group flex flex-1 items-center gap-2 rounded-lg border border-border/40 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
              >
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-muted-foreground">Previous</span>
                  <p className="truncate text-sm font-medium text-foreground">{prevChapter.title}</p>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}

            {nextChapter ? (
              <Link
                href={`/docs/${nextChapter.slug}`}
                className="group flex flex-1 items-center gap-2 rounded-lg border border-border/40 bg-card p-4 text-right transition-colors hover:border-primary/30 hover:bg-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-muted-foreground">Next</span>
                  <p className="truncate text-sm font-medium text-foreground">{nextChapter.title}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-1 text-muted-foreground/50"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
