"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, ArrowRight } from "lucide-react";

const EXAMPLE = {
  question: "Why is today's revenue lower than yesterday?",
  answer: [
    "iPhone 14 screen replacements dropped 40% today",
    "Technician Alice is out sick — 35% fewer completed jobs",
    "2 pending QC approvals holding up Rp 1,200,000 in payments",
  ],
};

export function AiSection() {
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [displayedLines, setDisplayedLines] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!showAnswer) {
      setDisplayedLines([]);
      return;
    }
    EXAMPLE.answer.forEach((line, i) => {
      setTimeout(() => {
        setDisplayedLines((prev) => [...prev, line]);
      }, 600 + i * 800);
    });
  }, [showAnswer]);

  return (
    <section className="border-y border-border/40 bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Sparkles className="size-3" />
            AI-Powered
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Ask AI anything about your business
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Natural language insights. No dashboards to navigate. Just ask.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative mx-auto mt-12 max-w-2xl"
        >
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                <Bot className="size-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">AI Command Center</span>
            </div>

            {/* Chat */}
            <div className="space-y-4 p-5">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {EXAMPLE.question}
                </div>
              </div>

              {/* AI response */}
              <div className="flex justify-start">
                <div className="max-w-[80%] space-y-2">
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Sparkles className="size-3" />
                      Show AI analysis
                      <ArrowRight className="size-3" />
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-foreground">
                      <p className="mb-2 text-xs font-medium text-primary">Analysis</p>
                      <ul className="space-y-1.5">
                        {displayedLines.map((line, i) => (
                          <motion.li
                            key={line}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary/50" />
                            {line}
                          </motion.li>
                        ))}
                        {displayedLines.length < EXAMPLE.answer.length && (
                          <motion.li
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <span className="size-1.5 rounded-full bg-primary/50" />
                            Thinking...
                          </motion.li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
