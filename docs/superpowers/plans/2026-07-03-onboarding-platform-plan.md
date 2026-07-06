# Implementation Plan: Product Onboarding Platform

**Based on:** `docs/superpowers/specs/2026-07-03-native-guided-tour-design.md`

---

## Task 1: Migration + Types + Storage Layer

**Files to create:**
- `supabase/migrations/103_user_preferences_tour_state.sql`
- `src/types/tour.ts`
- `src/lib/tour/storage.ts`

**Migration:** Add `tour_state jsonb DEFAULT '{}'::jsonb` to `user_preferences`.

**Types:** Define `TourStep`, `Mission`, `TourState`, `TourConfig`, `TourPosition`, `TourStatus` — must match spec.

**Storage:** `loadTourState(userId)`, `saveTourState(userId, state)`, `resetTourState(userId)` wrapping `supabase.from('user_preferences')`.

---

## Task 2: Spotlight Component (Four-Div)

**File:** `src/components/onboarding/spotlight.tsx`

A `motion.div` per bar (top, bottom, left, right). Props: `targetRect: DOMRect | null`, `padding?: number`, `rounded?: number`.

Calculates bar dimensions from target rect. Animates with Framer Motion spring transitions. Rounded inner corners. `backdrop-blur-sm bg-black/50`. Handles null target (full overlay). Export `useTargetRect` helper hook that returns a `DOMRect` for a given selector.

---

## Task 3: Floating Card Component (Enhanced)

**File:** `src/components/onboarding/floating-card.tsx`

shadcn `Card`-based floating panel. Props: `step`, `mission`, `currentStepIndex`, `totalSteps`, `missionIndex`, `totalMissions`, `completedPercent`, `onNext`, `onPrev`, `onSkip`, `onClose`, `onAskAI`.

Auto-positions relative to target rect. Shows step title/description, mission name + progress bar, step counter, navigation buttons. AI Coach "Ask AI" link. Framer Motion `layout` for smooth position transitions.

---

## Task 4: Progress Bar Component

**File:** `src/components/onboarding/progress-bar.tsx`

Premium bar-style progress. Props: `percent: number`, `size?: 'sm' | 'md' | 'lg'`, `animated?: boolean`.

Animated fill with gradient. Rounded capsule shape. Smooth transition on percent change.

---

## Task 5: Mission Definitions + Registry

**Files to create:**
- `src/lib/tour/registry.ts`
- `src/components/onboarding/missions/business-setup.ts`
- `src/components/onboarding/missions/inventory-setup.ts`
- `src/components/onboarding/missions/payment-setup.ts`
- `src/components/onboarding/missions/first-service.ts`
- `src/components/onboarding/missions/shift-setup.ts`

**Registry:** `getTourConfig(brandSlug, role, featureFlags)` → resolves missions per role, applies brand overrides, filters by feature flags.

**Missions:** Each exports `Mission[]` with `TourStep[]`. Steps reference `data-tour` selectors. Includes `aiPrompt` per mission. Steps with `route` + `autoNavigate` for cross-page tours.

Role-to-missions mapping:
- PLATFORM_OWNER / MASTER_ADMIN: business-setup, inventory-setup, payment-setup
- ADMIN: business-setup (truncated: welcome+branch), inventory-setup, payment-setup, first-service, shift-setup
- FRONTLINER: first-service
- TECHNICIAN: first-service (technician-specific steps)
- CASHIER: shift-setup

---

## Task 6: Tour Engine

**File:** `src/components/onboarding/tour-engine.tsx`

Orchestrator component. Props: `missions: Mission[]`, `onComplete`, `onSkip`, `onClose`.

Manages:
1. Current mission + step index
2. Cross-page navigation: `router.push(route)` → `waitForElement(selector, timeout)` → spotlight + card
3. Spotlight rendering (delegates to `Spotlight`)
4. Floating card rendering (delegates to `FloatingCard`)
5. Progress bar at top
6. Welcome → Touring → Completed state machine
7. Keyboard handlers (Escape, ArrowLeft, ArrowRight)
8. Focus trapping in card

**Helper:** `waitForElement(selector, timeout)` using `MutationObserver` (from spec).

---

## Task 7: Tour Provider (Context)

**File:** `src/components/onboarding/tour-provider.tsx`

React Context providing:
- `tourState: TourState`
- `startTour()`, `restartTour()`, `skipTour()`, `closeTour()`
- `startMission(missionId: string)`
- `completedMissions: string[]`
- `totalMissions: number`
- `isOnboardingActive: boolean`

Loads state from DB on mount. Saves on every state change. Wraps `TourEngine` when active. Handles welcome/resume logic.

---

## Task 8: Welcome + Resume + Completion Screens

**Files to create:**
- `src/components/onboarding/welcome-screen.tsx`
- `src/components/onboarding/resume-modal.tsx`
- `src/components/onboarding/completion-screen.tsx`

**Welcome:** Full-screen Radix `Dialog`. Backdrop blur. "Welcome to Seervisio" title, estimated time, Start Tour / Skip buttons. Framer Motion scale+fade entrance.

**Resume:** Radix `Dialog`. "Continue Guided Tour?" with Resume / Restart / Skip.

**Completion:** Radix `Dialog`. Celebration, business health 100%, suggested next steps, Go to Dashboard button.

---

## Task 9: Dashboard Checklist

**File:** `src/components/onboarding/dashboard-checklist.tsx`

shadcn `Card` on dashboard. Shows all missions for role as checklist items. Completed items have checkmarks. Clicking an incomplete item calls `startMission(id)`. Progress bar at top with percentage. Reads state from `useTour()` context.

**Integration:** Added to dashboard page via `TourProvider` context.

---

## Task 10: `data-tour` Attributes on Panel Components

**Files to modify:**
- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/unified-top-frame.tsx`
- `src/app/[brandSlug]/panel/dashboard/page.tsx`
- Inventory pages (for stock, categories)
- Services pages (for diagnosis, update-status)
- Store shift pages (for close-shift, open-shift)
- POS pages (for invoice)
- Payment methods page

Add `data-tour="id"` to target elements per the selector table in the spec.

---

## Task 11: Empty State Integration + Documentation + Cleanup

**Files to modify:**
- Inventory empty state — add `EmptyStateCTA` with tour awareness
- Services empty state — add tour-aware CTA
- Documentation pages — add "Replay Tour" button

**Cleanup:**
- Delete: `guided-tour.tsx`, `tour-tooltip.tsx`, `role-tour-factory.ts`, `onboarding-types.ts`
- Rewrite: `tour-provider.tsx`, `onboarding-page-client.tsx`
- Remove react-joyride from `package.json`
- Run `npm uninstall react-joyride`

---

## Dependency Graph

```
Task 1 (types + storage) ─┬─ Task 6 (engine) ── Task 7 (provider) ──┬─ Task 8 (screens)
                           │                                         ├─ Task 9 (checklist)
Task 2 (spotlight) ────────┤                                         ├─ Task 11 (empty state)
                           │                                         └─ Task 12 (doc integration)
Task 3 (floating card) ────┤
                           │
Task 4 (progress bar) ─────┤
                           │
Task 5 (missions) ─────────┘
```

Tasks 1–5 can be parallelized (foundational). Tasks 6–7 are sequential (engine depends on foundation, provider depends on engine). Tasks 8–12 depend on provider and can be parallelized.

---

## Review Gates

After each task:
1. **Spec compliance:** Does implementation match the spec doc?
2. **Code quality:** Is the code clean, typed, performant?

Only proceed to next task after both reviews pass.
