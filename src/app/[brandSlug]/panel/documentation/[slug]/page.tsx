import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { markdownToHtml } from "@/lib/markdown";
import { DOCS_CHAPTERS, DOCS_SLUG_TO_FILE, DOCS_TITLES } from "@/components/documentation/docs-data";
import { DocsSidebar } from "@/components/documentation/docs-sidebar";

interface PageProps {
  params: Promise<{ slug: string; brandSlug: string }>;
}

export default async function DocumentationPage({ params }: PageProps) {
  const { slug, brandSlug } = await params;
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
    <div className="flex h-full overflow-hidden">
      <DocsSidebar brandSlug={brandSlug} />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[900px] px-6 py-8 md:px-10 md:py-10 lg:py-12">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link
                href={`/${brandSlug}/panel/documentation`}
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
              className="prose-custom"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {/* Footer navigation */}
            <footer className="mt-12 border-t border-border/40 pt-6">
              <div className="flex items-center justify-between gap-4">
                {prevChapter ? (
                  <Link
                    href={`/${brandSlug}/panel/documentation/${prevChapter.slug}`}
                    className="group flex flex-1 items-center gap-2 rounded-lg border border-border/40 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
                  >
                    <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Previous</span>
                      <p className="truncate text-sm font-medium text-foreground">{prevChapter.title}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}

                {nextChapter ? (
                  <Link
                    href={`/${brandSlug}/panel/documentation/${nextChapter.slug}`}
                    className="group flex flex-1 items-center gap-2 rounded-lg border border-border/40 bg-card p-4 text-right transition-colors hover:border-primary/30 hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-muted-foreground">Next</span>
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
      className="mx-0.5 text-muted-foreground/50"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
