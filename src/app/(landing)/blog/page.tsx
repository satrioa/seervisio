import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blog — Seervisio",
  description: "Tips, guides, and news for repair shop owners.",
};

const POSTS = [
  {
    title: "How to Reduce Repair Turnaround Time by 40%",
    desc: "Learn the workflow optimizations that top repair shops use to deliver faster.",
    date: "Jun 28, 2026",
    readTime: "5 min read",
    href: "#",
  },
  {
    title: "The Complete Guide to Repair Shop Inventory Management",
    desc: "Stop losing money on misplaced stock. Implement these inventory best practices.",
    date: "Jun 21, 2026",
    readTime: "8 min read",
    href: "#",
  },
  {
    title: "Why AI is the Future of Repair Shop Management",
    desc: "How artificial intelligence is transforming the repair industry.",
    date: "Jun 14, 2026",
    readTime: "6 min read",
    href: "#",
  },
  {
    title: "Multi-Branch Management: A Practical Guide",
    desc: "Running multiple repair locations? Here's how to do it without the headaches.",
    date: "Jun 7, 2026",
    readTime: "7 min read",
    href: "#",
  },
  {
    title: "Pricing Strategies for Repair Shops in 2026",
    desc: "Data-driven approaches to pricing your repair services competitively.",
    date: "May 31, 2026",
    readTime: "4 min read",
    href: "#",
  },
  {
    title: "Customer Retention: Turning One-Time Repairs into Lifelong Relationships",
    desc: "Proven strategies to keep customers coming back to your repair shop.",
    date: "May 24, 2026",
    readTime: "6 min read",
    href: "#",
  },
];

export default function BlogPage() {
  return (
    <div className="pt-24">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Tips, guides, and insights for running a successful repair shop.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
            <Link
              key={post.title}
              href={post.href}
              className="group rounded-xl border border-border/50 bg-card p-5 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 aspect-video rounded-lg bg-muted/50" />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{post.date}</span>
                <span className="size-1 rounded-full bg-muted-foreground/30" />
                <span>{post.readTime}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="#">
              Load More
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
