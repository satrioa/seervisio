# Product Onboarding Platform for Seervisio

**Date:** 2026-07-03
**Status:** Draft
**Drivers:** Replace react-joyride with a complete native Product Onboarding Platform

---

## Vision

A signature onboarding experience comparable to Linear, Vercel, Stripe Dashboard, Notion, Arc Browser, and Supabase. The system should feel like a smart assistant personally guiding every user through setting up their business — not a tooltip system.

## Architecture

### File Structure

```
src/
├── types/tour.ts                        — TourStep, Mission, TourState, TourConfig
├── lib/tour/
│   ├── registry.ts                      — Multi-level: Brand → Role → FeatureFlags → Tours
│   ├── missions.ts                      — Mission definitions with steps
│   └── storage.ts                       — DB persistence wrapper
├── hooks/
│   ├── useTour.ts                       — Public hook (start, skip, next, prev, navigate)
│   └── useOnboardingChecklist.ts        — Dashboard checklist hook
├── components/onboarding/
│   ├── tour-provider.tsx                — React Context (rewrite)
│   ├── tour-engine.tsx                  — Orchestrator (spotlight + card + scroll + navigation)
│   ├── spotlight.tsx                    — Four-div overlay with backdrop-blur
│   ├── floating-card.tsx                — Enhanced shadcn Card, mission + progress context
│   ├── progress-bar.tsx                 — Premium bar-style progress
│   ├── welcome-screen.tsx               — "Welcome to Seervisio" modal
│   ├── resume-modal.tsx                 — "Continue where you left off?" modal
│   ├── completion-screen.tsx            — Celebration + business health + next steps
│   ├── dashboard-checklist.tsx          — Persistent checklist card for dashboard
│   ├── empty-state-cta.tsx              — Onboarding-aware empty state wrapper
│   └── missions/
│       ├── business-setup.ts            — Brand setup mission
│       ├── inventory-setup.ts           — Inventory mission
│       ├── payment-setup.ts             — Payment mission
│       ├── first-service.ts             — First service mission
│       └── shift-setup.ts              — Shift management mission
supabase/migrations/103_user_preferences_tour_state.sql
```

### Deleted Files

- `src/components/onboarding/guided-tour.tsx` — Joyride wrapper
- `src/components/onboarding/tour-tooltip.tsx` — Joyride tooltip
- `src/components/onboarding/role-tour-factory.ts` — replaced by registry
- `src/components/onboarding/onboarding-types.ts` — replaced by types/tour.ts

### Core Types

```typescript
// src/types/tour.ts

export type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  id: string
  title: string
  description: string
  route?: string                          // Next.js route for cross-page nav
  selector?: string                       // data-tour="id" on target element
  position: TourPosition                  // Preferred position, engine auto-adjusts
  waitForVisible?: number                 // ms to poll for element (default 3000)
  autoNavigate?: boolean                  // auto-route.push before showing
  autoOpen?: boolean                      // auto-open a dropdown/modal
  autoClick?: boolean                     // auto-click the target
  validation?: string                     // validation function reference
  estimatedTime?: string
  missionId: string                       // which mission owns this step
  spotlightPadding?: number               // px around target (default 8)
}

export interface Mission {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  reward: string                          // e.g., "Dashboard unlocked"
  steps: TourStep[]
  aiPrompt?: string                       // Pre-filled AI question
  featureFlag?: string                    // Only show if feature enabled
}

export interface TourState {
  tour_version: number
  completed_at: string | null             // ISO date
  skipped_at: string | null               // ISO date
  last_step: number
  last_mission: string | null
  completed_missions: string[]            // ["brand-setup", "inventory-setup", ...]
  dismissed_missions: string[]            // explicitly skipped missions
}

export interface TourConfig {
  missions: Mission[]
  role: string
  version: number
  brandOverrides?: Partial<TourConfig>    // Per-brand customization
}

export type TourStatus = 'idle' | 'welcome' | 'touring' | 'paused' | 'completed' | 'skipped'
```

---

## Multi-Level Registry

```
Brand Config (per-brand overrides)
  └── Role (PLATFORM_OWNER, MASTER_ADMIN, ADMIN, FRONTLINER, TECHNICIAN)
       └── Feature Flags (missions filtered by enabled features)
            └── Tour Registry (all step definitions)
                 └── Mission Registry (missions composed of steps)
```

The registry resolves tours at runtime:

```typescript
// src/lib/tour/registry.ts
export function getTourConfig(brandSlug: string, role: string, featureFlags: string[]): TourConfig {
  let config = BASE_TOUR_CONFIGS[role] || BASE_TOUR_CONFIGS['default']

  // Apply brand overrides (future: read from DB)
  const overrides = BRAND_OVERRIDES[brandSlug]
  if (overrides) config = deepMerge(config, overrides)

  // Filter by feature flags
  config.missions = config.missions.filter(m => !m.featureFlag || featureFlags.includes(m.featureFlag))

  return config
}
```

---

## Spotlight — Four-Div Overlay

```
┌──────────────────────────────────┐
│        TOP BAR (full width)      │  ← animate height = target.top
├────────┬──────────┬──────────────┤
│ LEFT   │  TARGET  │   RIGHT      │  ← bars sandwich the target
│ BAR    │  (clear) │   BAR        │
├────────┴──────────┴──────────────┤
│       BOTTOM BAR (full width)    │  ← animate top = target.bottom
└──────────────────────────────────┘
```

Each bar is a `motion.div`:
- `className="fixed bg-black/50 backdrop-blur-sm z-[9999]"`
- `pointer-events: auto` (blocks interaction outside target)
- Animated with Framer Motion `animate={{ height, top, width, left }}`
- Spring transition for smooth feel
- Inner edges get `border-radius` for rounded spotlight corners

Advantages over SVG/clipPath:
- Native `backdrop-filter` support (clipPath breaks blur on Safari/old Chromium)
- Simple integer position animation (no polygon string parsing)
- Multiple spotlight holes trivial (just add more bar sets)
- Rounded corners natural

---

## Floating Card (Enhanced)

```
┌──────────────────────────────────┐
│  Dashboard                       │  ← current step title
│  View today's KPIs               │  ← current step description
│                                  │
│  ⏱ 20 sec                        │
│                                  │
│  Next: Inventory   │ Mission 1/4 │
│  ─────────────────────────────── │
│  Business Setup                  │
│  ████████░░░░  25%               │
│                                  │
│  [Skip]    ← Previous   Next →  │
└──────────────────────────────────┘
```

- Uses shadcn `Card` with `backdrop-blur-xl bg-white/95 dark:bg-gray-950/95`
- Border: `border border-white/20 dark:border-gray-800/50`
- Shadow: `shadow-2xl`, rounded: `rounded-2xl`
- Framer Motion `layout` for position transitions
- Top section = current step detail
- Middle section = mission context (name, progress bar, step count)
- Bottom section = navigation buttons
- Auto-positioning with 16px gap from target, 24px viewport padding

---

## Cross-Page Tour Engine

The engine handles multi-route tours:

```typescript
async function executeStep(step: TourStep) {
  if (step.autoNavigate && step.route) {
    await router.push(step.route)
    const target = await waitForElement(step.selector, step.waitForVisible ?? 3000)
    // target found — proceed
  }
  const rect = getTargetRect(step.selector)
  animateSpotlight(rect)
  showFloatingCard(step, missionProgress)
  trapFocus()
}
```

`waitForElement` uses `MutationObserver`:
```typescript
function waitForElement(selector: string, timeout: number): Promise<Element> {
  const existing = document.querySelector(selector)
  if (existing) return Promise.resolve(existing)
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector)
      if (found) { observer.disconnect(); resolve(found) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); reject(new Error('timeout')) }, timeout)
  })
}
```

---

## State Machine

```
IDLE → CHECK STATE
         ├── tour_state empty        → WELCOME → TOURING
         ├── last_step > 0, !done    → RESUME_MODAL → TOURING
         ├── skipped                  → IDLE
         └── completed                → IDLE (replay via /docs)

TOURING → step advance → cross-page navigation → TOURING
TOURING → complete     → COMPLETED (celebration)
TOURING → skip         → SKIPPED (save to DB, IDLE)
TOURING → close        → PAUSED (save last_step, IDLE)
```

---

## Persistence

### Migration

```sql
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS tour_state jsonb DEFAULT '{}'::jsonb;
```

### Storage

```typescript
// src/lib/tour/storage.ts
export const DEFAULT_TOUR_STATE: TourState = {
  tour_version: 1,
  completed_at: null,
  skipped_at: null,
  last_step: 0,
  last_mission: null,
  completed_missions: [],
  dismissed_missions: [],
}

export async function loadTourState(userId: string): Promise<TourState>
export async function saveTourState(userId: string, state: Partial<TourState>): Promise<void>
export async function resetTourState(userId: string): Promise<void>
```

### Granular Replay

Each mission tracks completion independently. When `tour_version` increments, missions with changed steps are re-marked incomplete. Only those missions re-appear — never the full onboarding.

---

## Dashboard Checklist

Persistent card on the dashboard page:

```
┌──────────────────────────────────┐
│  Getting Started          82%    │
│  ████████░░░░                    │
│                                  │
│  ✔ Company Setup                 │
│  ✔ Brand Setup                   │
│  ✔ First Branch                  │
  │  ✔ Create Employee Account       │
│  □ Add Inventory Items           │  ← click → starts "Inventory" mission
│  □ Configure Payments            │
│  □ Complete First Service        │
│  □ Close First Shift             │
└──────────────────────────────────┘
```

- Renders `completed_missions.length / total_missions.length`
- Clicking an unchecked item launches that mission
- Reads state from `TourContext`
- Updates in real-time as missions complete

---

## Mission Definitions

### Business Setup (All roles)
1. **Welcome** — center — "Welcome to Seervisio!"
2. **Brand Overview** — `[data-tour="brand-overview"]` — Configure brand
3. **Create Branch** — `[data-tour="branches"]` — Add first location
4. **Create Employee Account** — `[data-tour="users"]` — Add team members

### Inventory Setup (MASTER_ADMIN, ADMIN)
1. **Create Item** — `[data-tour="inventory"]` — Add first product
2. **Manage Stock** — `[data-tour="stock"]` — Set initial quantities
3. **Categories** — `[data-tour="categories"]` — Organize items

### Payment Setup (MASTER_ADMIN, ADMIN)
1. **Payment Methods** — `[data-tour="payment-methods"]` — Configure
2. **Test Transaction** — `[data-tour="pos"]` — Run test sale

### First Service (FRONTLINER, ADMIN, TECHNICIAN)
1. **Receive Customer** — `[data-tour="services"]` — Create service
2. **Diagnosis** — `[data-tour="diagnosis"]` — Perform diagnostics
3. **Update Status** — `[data-tour="update-status"]` — Track progress
4. **Payment & Handover** — `[data-tour="pos"]` — Complete transaction

### Shift Setup (CASHIER, ADMIN)
1. **Open Shift** — `[data-tour="store-shift"]` — Start daily shift
2. **Process Sale** — `[data-tour="pos"]` — Handle customer
3. **Close Shift** — `[data-tour="close-shift"]` — End shift

---

## Spotllight Selectors

| `data-tour` ID | Panel Element | Component |
|---------------|---------------|-----------|
| `brand-overview` | Brand area | `app-sidebar.tsx` |
| `branches` | Branches nav | `app-sidebar.tsx` |
| `users` | Users/team nav | `app-sidebar.tsx` |
| `payment-methods` | Payment nav | `app-sidebar.tsx` |
| `inventory` | Inventory nav | `app-sidebar.tsx` |
| `stock` | Stock sub-page | Inventory pages |
| `categories` | Categories section | Inventory pages |
| `dashboard` | Dashboard nav | `app-sidebar.tsx`, dashboard |
| `store-shift` | Shift section | `app-sidebar.tsx` |
| `services` | Services nav | `app-sidebar.tsx` |
| `pos` | POS nav | `app-sidebar.tsx` |
| `create-service` | New service button | Services pages |
| `diagnosis` | Diagnosis section | Service detail page |
| `update-status` | Status controls | Service detail page |
| `close-shift` | Close button | Store shift page |

---

## Integration Points

### AI Coach

Every mission card includes a "Need Help?" link that opens the AI Command Center with a pre-filled prompt:

```typescript
// In floating-card.tsx
{mission.aiPrompt && (
  <button onClick={() => openAIChat(mission.aiPrompt)}>
    💬 Ask AI
  </button>
)}
```

### Empty State Integration

`EmptyStateCTA` component wraps existing empty states:

```tsx
<EmptyStateCTA
  missionId="inventory-setup"
  title="No Inventory Yet"
  description="Create your first inventory item."
  actionLabel="Add Inventory"
  onAction={() => router.push(`/${brandSlug}/panel/inventory`)}
  onStartTour={() => startMission('inventory-setup')}
/>
```

### Documentation Integration

Each documentation page in `/[brandSlug]/panel/documentation/[slug]` maps to a mission ID. A "Replay Tour" button starts the matching mission:

```tsx
// In documentation/[slug]/page.tsx
const missionId = getMissionIdForDoc(slug)
{missionId && <ReplayTourButton missionId={missionId} />}
```

### Completion Celebration

```
┌──────────────────────────────────┐
│  🎉 Congratulations!              │
│                                  │
│  Your repair shop is ready       │
│                                  │
│  Business Health  100%           │
│  ████████████████                │
│                                  │
│  Suggested next steps:           │
│  • Connect WhatsApp              │
│  • Invite Technician             │
│  • Configure AI Insights         │
│                                  │
│  [Go to Dashboard]               │
└──────────────────────────────────┘
```

---

## Keyboard & Accessibility

- `Escape` — skip/close tour, save progress
- `ArrowRight` / `ArrowLeft` — next/previous step
- Focus trap inside floating card when active
- `aria-describedby`, `role="dialog"` on card
- `prefers-reduced-motion` — disable all Framer Motion animations
- Focus returns to target after tour completes

---

## Mobile

- Four-div spotlight recalculates on resize
- Floating card becomes full-width (< 640px), positioned below target
- Touch-friendly button sizes (44px minimum tap target)
- Scroll behavior works on mobile (smooth scroll into view)

---

## Future-Ready Architecture

All components are decoupled so these can be added without rewriting:

- **Feature Tours** — new module onboarding (e.g., AI Insights launch)
- **Seasonal Tours** — time-limited onboarding flows
- **Release Highlights** — "What's New" after app updates
- **Interactive Tutorials** — step-by-step guided actions (not just views)

---

## Implementation Order

1. Migration + types (`tour.ts`) + storage
2. Spotlight (four-div)
3. Floating card (enhanced)
4. Progress bar
5. Tour engine + cross-page navigation (`waitForElement`, `router.push`)
6. Registry + missions
7. Tour provider (context rewrite)
8. Welcome + Resume + Completion screens
9. Dashboard checklist
10. `data-tour` attributes on panel components
11. Empty state integration
12. Documentation integration
13. Remove react-joyride, delete old files
14. Test all roles

---

## Acceptance Criteria

- [ ] No external guided tour library
- [ ] Four-div spotlight with smooth animation and backdrop-blur
- [ ] Floating card shows mission context + overall progress
- [ ] Cross-page tour navigates, waits for elements, continues
- [ ] Multi-level registry (role → missions → steps)
- [ ] Granular mission tracking with partial replay
- [ ] Dashboard checklist with real-time progress
- [ ] AI Coach integration per mission
- [ ] Empty state onboarding awareness
- [ ] Documentation per-mission replay
- [ ] Celebration completion with next steps
- [ ] Premium SaaS feel comparable to Linear/Vercel
- [ ] TypeScript strict, zero errors
