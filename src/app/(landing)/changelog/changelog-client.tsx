"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronDown, Sparkles, ArrowUpRight } from "lucide-react";
import type { ChangelogVersion, ChangelogCategory } from "@/types/changelog";
import { CATEGORY_LABEL, CATEGORY_EMOJI } from "@/types/changelog";

interface Props {
  versions: ChangelogVersion[];
}

const ALL_CATEGORIES: { key: ChangelogCategory | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "feature", label: "Fitur Baru" },
  { key: "improvement", label: "Improvement" },
  { key: "bugfix", label: "Bug Fix" },
  { key: "performance", label: "Performance" },
  { key: "uiux", label: "UI/UX" },
  { key: "security", label: "Security" },
  { key: "breaking", label: "Breaking Change" },
];

const CATEGORY_BADGE: Record<string, string> = {
  feature: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/30",
  improvement: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200/30",
  bugfix: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200/30",
  breaking: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200/30",
  security: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-200/30",
  uiux: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-200/30",
  performance: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200/30",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function Badge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${CATEGORY_BADGE[category] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {CATEGORY_EMOJI[category as ChangelogCategory] ?? "•"}
      {CATEGORY_LABEL[category as ChangelogCategory] ?? category}
    </span>
  );
}

export function ChangelogClient({ versions }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ChangelogCategory | "all">("all");
  const [activeVersion, setActiveVersion] = useState<string | null>(null);
  const versionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const scrollToVersion = useCallback((version: string) => {
    const el = versionRefs.current.get(version);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveVersion(version);
    }
  }, []);

  const filtered = useMemo(() => {
    return versions
      .map((v) => {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch =
          !searchQuery ||
          v.version.toLowerCase().includes(lowerQuery) ||
          v.title.toLowerCase().includes(lowerQuery) ||
          v.items.some(
            (item) =>
              item.title.toLowerCase().includes(lowerQuery) ||
              (item.description ?? "").toLowerCase().includes(lowerQuery),
          );

        const matchesCategory =
          activeCategory === "all" ||
          v.items.some((item) => item.category === activeCategory);

        if (!matchesSearch || !matchesCategory) return null;

        if (activeCategory !== "all") {
          return { ...v, items: v.items.filter((item) => item.category === activeCategory) };
        }

        return v;
      })
      .filter(Boolean) as ChangelogVersion[];
  }, [versions, searchQuery, activeCategory]);

  const featured = useMemo(() => versions.find((v) => v.featured), [versions]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-version");
            if (id) setActiveVersion(id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );

    versionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="relative border-b border-border/40 bg-gradient-to-b from-muted/30 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              {versions[0]?.version ?? "v1.0.0"}
              {" · "}
              {versions[0] ? formatDate(versions[0].releaseDate) : ""}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              What&apos;s New
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Lihat seluruh perkembangan Seervisio. Setiap pembaruan kami rancang berdasarkan
              kebutuhan nyata toko servis gadget.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Featured Highlight ── */}
      {featured && (
        <section className="border-b border-border/40">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background"
            >
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/5 blur-3xl" />
              <div className="relative grid gap-8 p-8 md:grid-cols-2 md:p-12">
                <div className="flex flex-col justify-center">
                  <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
                    <Sparkles className="size-3.5" />
                    Highlight
                  </span>
                  <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                    {featured.title}
                  </h2>
                  {featured.summary && (
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                      {featured.summary}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2">
                    {featured.items.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
                      >
                        {CATEGORY_EMOJI[item.category]} {item.title}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="relative hidden md:flex items-center justify-center">
                  <div className="flex h-56 w-full items-center justify-center rounded-xl border border-border/40 bg-gradient-to-br from-primary/[0.03] to-muted/30">
                    <div className="text-center">
                      <div className="text-5xl">🚀</div>
                      <p className="mt-2 text-sm font-medium text-muted-foreground">
                        {featured.version}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Search + Filter ── */}
      <section className="sticky top-16 z-30 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari versi atau fitur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-muted/30 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary/40 focus:bg-muted/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Results count */}
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} rilis ditemukan
            </p>
          </div>

          {/* Category filters */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  activeCategory === cat.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat.key !== "all" && `${CATEGORY_EMOJI[cat.key]} `}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex gap-12">
          {/* Timeline */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="size-10 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Tidak ada hasil untuk pencarian ini.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Reset filter
                </button>
              </div>
            ) : (
              <div className="space-y-16">
                {filtered.map((version, idx) => (
                  <VersionCard
                    key={version.id}
                    version={version}
                    index={idx}
                    refs={versionRefs}
                  />
                ))}
              </div>
            )}

            {/* ── CTA ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mt-20 rounded-2xl border border-border/40 bg-gradient-to-br from-muted/30 via-background to-background p-8 text-center sm:p-12"
            >
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Ingin mencoba fitur terbaru?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Mulai gunakan Seervisio sekarang.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                >
                  Mulai Gratis
                  <ArrowUpRight className="size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
                >
                  Lihat Paket
                </Link>
              </div>
            </motion.section>
          </div>

          {/* ── Sidebar Version Nav ── */}
          <aside className="hidden w-48 shrink-0 lg:block">
            <div className="sticky top-40">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Versi
              </p>
              <nav className="space-y-1">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => scrollToVersion(v.version)}
                    className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-all ${
                      activeVersion === v.version
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {v.version}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Version Card ── */

function VersionCard({
  version,
  index,
  refs,
}: {
  version: ChangelogVersion;
  index: number;
  refs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      refs.current.set(version.version, cardRef.current);
    }
    return () => {
      refs.current.delete(version.version);
    };
  }, [version.version, refs]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof version.items>();
    for (const item of version.items) {
      const existing = map.get(item.category);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.category, [item]);
      }
    }
    return map;
  }, [version.items]);

  return (
    <motion.div
      ref={cardRef}
      data-version={version.version}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.2) }}
    >
      <div className="relative pl-8 before:absolute before:left-[11px] before:top-3 before:h-full before:w-px before:bg-border/60 last:before:hidden">
        {/* Timeline dot */}
        <div className="absolute left-0 top-1.5 size-6 rounded-full border-2 border-border bg-background flex items-center justify-center">
          <div className="size-2 rounded-full bg-primary" />
        </div>

        {/* Version header */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-bold text-foreground">{version.version}</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatDate(version.releaseDate)}
            </span>
          </div>
          {version.title && (
            <p className="mt-1 text-sm font-medium text-muted-foreground">{version.title}</p>
          )}
        </div>

        {/* Items grouped by category */}
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <div className="mb-3">
                <Badge category={category} />
                <span className="ml-2 text-xs text-muted-foreground">
                  {items.length} {items.length > 1 ? "perubahan" : "perubahan"}
                </span>
              </div>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="group flex items-start gap-3">
                    <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/30 group-hover:bg-primary/50 transition-colors" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Version footer */}
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2 py-1">
            <ArrowUpRight className="size-3" />
            Seervisio Team
          </span>
        </div>
      </div>
    </motion.div>
  );
}
