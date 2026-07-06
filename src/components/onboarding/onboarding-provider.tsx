"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getOnboardingFlow } from "@/lib/onboarding/definitions";
import type {
  OnboardingRole,
  OnboardingStep,
  OnboardingState,
} from "@/lib/onboarding/types";
import { useUserSession } from "@/hooks/useUserSession";

const DEFAULT_STATE: OnboardingState = {
  tour_version: 1,
  completed_steps: [],
  skipped_steps: [],
  completed_at: null,
  current_step_index: 0,
};

const STORAGE_KEY = "seervis:onboarding-state";

// Maps each step to the application events that trigger instant advance
const STEP_EVENT_MAP: Record<string, string[]> = {
  "brand-profile": ["brand-profile-saved"],
  "cabang": ["branch-created"],
  "account": ["user-created"],
  "payment-account": ["payment-account-created"],
  "payment-method": ["payment-method-created"],
  "technician": ["user-created"],
  "frontliner": ["user-created"],
  "sparepart": ["inventory-created", "sparepart-created"],
  "pelanggan": ["customer-created"],
  "servis": ["service-created"],
};

/* ── Context ── */

interface OnboardingContextValue {
  state: OnboardingState;
  startOnboarding: () => void;
  resetOnboarding: () => void;
  isActive: boolean;
  completedSteps: string[];
  totalSteps: number;
}

const OnboardingContext = React.createContext<OnboardingContextValue | null>(
  null
);

export function useOnboarding() {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

/* ── Provider ── */

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
  brandSlug: string;
  role: string;
  onboardingCompleted: boolean;
}) {
  return (
    <OnboardingContext.Provider
      value={{
        state: DEFAULT_STATE,
        startOnboarding: () => {},
        resetOnboarding: () => {},
        isActive: false,
        completedSteps: [],
        totalSteps: 0,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

/* ── Overlay ── */

function OnboardingOverlay({
  step,
  currentStepIndex,
  totalSteps,
  completedSteps,
  brandSlug,
  isCurrentStepValidating,
  onCtaClick,
  onSkip,
}: {
  step: OnboardingStep;
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: string[];
  brandSlug: string;
  isCurrentStepValidating: boolean;
  onCtaClick: () => void;
  onSkip: () => void;
}) {
  const pathname = usePathname();
  const [targets, setTargets] = useState<
    { rect: DOMRect; radius: number }[]
  >([]);
  const [winSize, setWinSize] = useState({ w: 0, h: 0 });

  const onTargetPage = step.ctaHref && pathname.startsWith(step.ctaHref);
  const isInteractive = step.targetSelector && step.pageInstructions;

  // Track target elements
  useEffect(() => {
    function update() {
      let found: { rect: DOMRect; radius: number }[] = [];

      if (step.targetSelector) {
        const els = document.querySelectorAll(step.targetSelector);
        els.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          const style = window.getComputedStyle(el);
          const radius = Number(style.borderRadius) || 4;
          found.push({ rect, radius });
        });
      }

      if (found.length === 0 && step.dataTourStepId) {
        const els = document.querySelectorAll(
          `[data-tour*='${step.dataTourStepId}']`
        );
        els.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          const style = window.getComputedStyle(el);
          const radius = Number(style.borderRadius) || 4;
          found.push({ rect, radius });
        });
      }

      setTargets(found);
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const mo = new MutationObserver(() => update());
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });
    const ro = new ResizeObserver(() => update());
    ro.observe(document.body);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      mo.disconnect();
      ro.disconnect();
    };
  }, [step]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (typeof document === "undefined") return null;

  const targetRect = targets.length > 0 ? targets[0].rect : null;

  const r = targetRect ? Math.min(targets[0].radius, 12) : 0;

  // Calculate meaningful steps for welcome checklist
  const allSteps = React.useMemo(() => {
    const flow = getOnboardingFlow(
      "MASTER_ADMIN" as OnboardingRole,
      brandSlug
    );
    return flow.steps;
  }, [brandSlug]);
  const meaningfulSteps = allSteps.filter(
    (s) => s.id !== "welcome" && s.id !== "finish"
  );

  const windowW = winSize.w || (typeof window !== "undefined" ? window.innerWidth : 1200);
  const windowH = winSize.h || (typeof window !== "undefined" ? window.innerHeight : 800);

  return createPortal(
    <>
      {/* ── SVG Spotlight (visual only, doesn't block clicks) ── */}
      <svg className="fixed inset-0 z-50 pointer-events-none" width={windowW} height={windowH}>
        <defs>
          <mask id="onboarding-spotlight-mask">
            {/* Full white = visible (dimmed) */}
            <rect x="0" y="0" width={windowW} height={windowH} fill="white" />
            {/* Black = cutout (bright spot) */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={r}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dimmed background */}
        <rect
          x="0"
          y="0"
          width={windowW}
          height={windowH}
          mask="url(#onboarding-spotlight-mask)"
          className="fill-black/40"
        />
        {/* Border around highlighted element */}
        {targetRect && (
          <rect
            x={targetRect.left - 2}
            y={targetRect.top - 2}
            width={targetRect.width + 4}
            height={targetRect.height + 4}
            rx={Math.min(r + 2, 14)}
            className="stroke-primary fill-none stroke-[3]"
          />
        )}
      </svg>

      {/* ── Click Blockers (surround dimmed area, block clicks) ── */}
      {targetRect && (
        <>
          {/* Top */}
          <div
            className="fixed z-50"
            style={{ top: 0, left: 0, right: 0, height: targetRect.top }}
          />
          {/* Bottom */}
          <div
            className="fixed z-50"
            style={{ top: targetRect.bottom, left: 0, right: 0, bottom: 0 }}
          />
          {/* Left */}
          <div
            className="fixed z-50"
            style={{ top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height }}
          />
          {/* Right */}
          <div
            className="fixed z-50"
            style={{ top: targetRect.top, left: targetRect.right, right: 0, height: targetRect.height }}
          />
        </>
      )}

      {/* ── Instruction Card ── */}
      {onTargetPage && isInteractive && step.id !== "welcome" && step.id !== "finish" ? (
        /* Interactive step: no buttons, just guidance */
        <div
          className="fixed z-[60]"
          style={
            targetRect
              ? {
                  top: Math.min(targetRect.bottom + 12, windowH - 180),
                  left: Math.min(
                    Math.max(targetRect.left, 12),
                    windowW - 340
                  ),
                }
              : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
          }
        >
          <Card className="w-[320px] shadow-xl border-primary/10">
            <CardContent className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{step.label}</p>
                <span className="text-[10px] text-muted-foreground">
                  {currentStepIndex} / {totalSteps - 2}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
              {step.pageInstructions && (
                <ol className="space-y-1 bg-muted/30 rounded-lg p-2.5 list-decimal list-inside">
                  {step.pageInstructions.map((inst, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                      {inst}
                    </li>
                  ))}
                </ol>
              )}
              {isCurrentStepValidating && (
                <p className="text-[10px] text-primary text-center animate-pulse">
                  Memeriksa...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : step.id === "welcome" ? (
        /* Welcome step */
        <div
          className="fixed z-[60]"
          style={
            targetRect
              ? {
                  top: Math.min(targetRect.bottom + 12, windowH - 300),
                  left: Math.min(
                    Math.max(targetRect.left, 12),
                    windowW - 360
                  ),
                }
              : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
          }
        >
          <Card className="w-[340px] shadow-2xl border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{step.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
              <div className="space-y-1.5 bg-muted/30 rounded-lg p-3">
                {meaningfulSteps.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="size-3.5 rounded border border-muted-foreground/30 flex items-center justify-center shrink-0" />
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                size="sm"
                className="ml-auto text-xs"
                onClick={onCtaClick}
              >
                {step.ctaLabel}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : step.id === "finish" ? (
        /* Finish step */
        <div
          className="fixed z-[60]"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <Card className="w-[320px] shadow-2xl border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{step.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                size="sm"
                className="ml-auto text-xs"
                onClick={onCtaClick}
              >
                {step.ctaLabel}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        /* Navigation step: CTA button to navigate to page */
        <div
          className="fixed z-[60]"
          style={
            targetRect
              ? {
                  top: Math.min(targetRect.bottom + 12, windowH - 200),
                  left: Math.min(
                    Math.max(targetRect.left, 12),
                    windowW - 360
                  ),
                }
              : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
          }
        >
          <Card className="w-[340px] shadow-2xl border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{step.label}</CardTitle>
                <span className="text-[10px] text-muted-foreground">
                  {currentStepIndex + 1} / {totalSteps}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </CardContent>
            <CardFooter className="flex gap-2 pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={onSkip}
              >
                Skip
              </Button>
              <Button
                size="sm"
                className="ml-auto text-xs gap-1.5"
                onClick={onCtaClick}
                disabled={isCurrentStepValidating}
              >
                {isCurrentStepValidating ? "Memeriksa..." : step.ctaLabel}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>,
    document.body
  );
}

/* ── Helpers ── */

function mapRole(role: string): OnboardingRole {
  if (role === "PLATFORM_OWNER") return "MASTER_ADMIN";
  if (role === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (role === "ADMIN") return "ADMIN";
  if (role === "FRONTLINER") return "FRONTLINER";
  if (role === "TECHNICIAN") return "TECHNICIAN";
  if (role === "CASHIER") return "CASHIER";
  return "FRONTLINER";
}
