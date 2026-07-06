import Link from "next/link";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { DOCS_CHAPTERS } from "@/components/documentation/docs-data";

export const metadata = {
  title: "Documentation — Seervisio",
  description: "Complete guide to using Seervisio for your repair shop.",
};

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen pt-24">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="size-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Documentation
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to get the most out of Seervisio.
          </p>
          <div className="relative mx-auto mt-8 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search documentation..."
              className="h-11 w-full rounded-xl border border-border/50 bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS_CHAPTERS.filter((ch) => ch.slug !== "README").map((ch, i) => (
            <Link
              key={ch.slug}
              href={`/docs/${ch.slug}`}
              className="group rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {ch.title}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {ch.desc}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
