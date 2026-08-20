"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Command,
  Package,
  Clock,
  Inbox,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  category: string;
}

const COMMANDS: CommandItem[] = [
  { id: "c1", icon: Package, label: "Show inventory alerts", description: "View low stock and critical items", href: "/panel/inventory-v4", category: "Alerts" },
  { id: "c2", icon: Clock, label: "Show overdue services", description: "Services past their SLA deadline", href: "/panel/services", category: "Services" },
  { id: "c3", icon: Inbox, label: "Open AI Inbox", description: "View all AI-generated insights", href: "/panel/ai", category: "AI" },
  { id: "c4", icon: Lightbulb, label: "View recommendations", description: "See AI-recommended actions", href: "/panel/ai", category: "AI" },
  { id: "c5", icon: AlertTriangle, label: "View priority alerts", description: "Business-critical alerts", href: "/panel/ai", category: "AI" },
  { id: "c6", icon: TrendingUp, label: "View revenue forecast", description: "AI revenue predictions", href: "/panel/ai", category: "Finance" },
  { id: "c7", icon: Package, label: "Check stock levels", description: "Current inventory status", href: "/panel/inventory-v4", category: "Inventory" },
  { id: "c8", icon: TrendingUp, label: "Open dashboard", description: "Main operational dashboard", href: "/panel/dashboard", category: "General" },
];

interface AiCommandPaletteProps {
  brandSlug: string;
}

export function AiCommandPalette({ brandSlug }: AiCommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      router.push(`/${brandSlug}${filtered[selectedIndex].href}`);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        data-mockup-interactive
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:bg-emerald-400 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95"
      >
        <Command className="size-5" />
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              data-mockup-interactive
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              data-mockup-interactive
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2"
            >
              <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
                {/* Search */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <Search className="size-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search commands, insights, alerts..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                  <span className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</span>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto p-2">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Search className="mb-2 size-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filtered.map((item, i) => {
                        const Icon = item.icon;
                        const isSelected = i === selectedIndex;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                              isSelected && "bg-emerald-500/10",
                            )}
                            onMouseEnter={() => setSelectedIndex(i)}
                            onClick={() => {
                              router.push(`/${brandSlug}${item.href}`);
                              setOpen(false);
                            }}
                          >
                            <div
                              className={cn(
                                "flex size-8 items-center justify-center rounded-full",
                                isSelected ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-sm font-medium", isSelected ? "text-emerald-500" : "text-foreground")}>
                                {item.label}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{item.description}</p>
                            </div>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                              {item.category}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
