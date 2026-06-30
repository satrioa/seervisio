"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, BookOpen, ChevronRight, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DOCS_CHAPTERS, type DocChapter } from "./docs-data";

interface DocsSidebarProps {
  brandSlug: string;
}

export function DocsSidebar({ brandSlug }: DocsSidebarProps) {
  const pathname = usePathname();
  const currentSlug = pathname?.split("/documentation/")[1] ?? "";
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return DOCS_CHAPTERS;
    const q = search.toLowerCase();
    return DOCS_CHAPTERS.filter(
      (ch) =>
        ch.title.toLowerCase().includes(q) ||
        ch.desc.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] shrink-0 border-r border-border/40 bg-sidebar md:block">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-border/40 px-4 py-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">Documentation</span>
          </div>

          {/* Search */}
          <div className="border-b border-border/40 px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 rounded-lg border-border/60 bg-sidebar-accent/30 pl-8 text-xs placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Nav list */}
          <nav className="flex-1 overflow-y-auto py-2">
            <DocNavList
              chapters={filtered}
              currentSlug={currentSlug}
              brandSlug={brandSlug}
              searchActive={search.trim().length > 0}
            />
          </nav>
        </div>
      </aside>

      {/* Mobile trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 left-4 z-50 flex size-10 rounded-full bg-sidebar shadow-lg md:hidden"
          >
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Documentation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2.5 border-b border-border/40 px-4 py-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">Documentation</span>
            </div>
            <div className="border-b border-border/40 px-3 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search documentation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 rounded-lg border-border/60 bg-accent/30 pl-8 text-xs placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              <DocNavList
                chapters={filtered}
                currentSlug={currentSlug}
                brandSlug={brandSlug}
                searchActive={search.trim().length > 0}
              />
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DocNavList({
  chapters,
  currentSlug,
  brandSlug,
  searchActive,
}: {
  chapters: DocChapter[];
  currentSlug: string;
  brandSlug: string;
  searchActive: boolean;
}) {
  if (chapters.length === 0) {
    return (
      <p className="px-4 text-xs text-muted-foreground">No results found</p>
    );
  }

  return (
    <ul className="space-y-0.5 px-2">
      {chapters.map((ch) => {
        const isActive = currentSlug === ch.slug;
        return (
          <li key={ch.slug}>
            <Link
              href={`/${brandSlug}/panel/documentation/${ch.slug}`}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-sidebar-accent text-muted-foreground"
                )}
              >
                {chapters.indexOf(ch) + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium">{ch.title}</span>
                {searchActive && (
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {ch.desc}
                  </p>
                )}
              </div>
              {isActive && (
                <ChevronRight className="size-3.5 shrink-0 text-primary" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
