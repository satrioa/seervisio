import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Search, Code, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Documentation — Seervisio",
  description: "Learn how to use Seervisio for your repair shop.",
};

const SECTIONS = [
  {
    icon: BookOpen,
    title: "Getting Started",
    desc: "Set up your shop, add branches, and invite your team.",
    href: "#",
  },
  {
    icon: Search,
    title: "Service Management",
    desc: "Create, track, and complete repair services.",
    href: "#",
  },
  {
    icon: Code,
    title: "API Reference",
    desc: "Integrate Seervisio with your existing tools.",
    href: "#",
  },
  {
    icon: LifeBuoy,
    title: "FAQ & Troubleshooting",
    desc: "Common questions and solutions.",
    href: "#",
  },
];

export default function DocsPage() {
  return (
    <div className="pt-24">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Documentation
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to get the most out of Seervisio.
          </p>
          <div className="relative mx-auto mt-8 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="size-4 text-muted-foreground" />
            </div>
            <input
              type="search"
              placeholder="Search documentation..."
              className="h-11 w-full rounded-xl border border-border/50 bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.title}
                href={section.href}
                className="group rounded-xl border border-border/50 bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{section.desc}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/login">
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
