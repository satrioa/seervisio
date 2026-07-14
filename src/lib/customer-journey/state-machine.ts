// src/lib/customer-journey/state-machine.ts
//
// Canonical customer-journey state machine (pure logic, framework-free).
//
// The journey is intentionally decoupled from any specific brand. The brand
// entity is created LATER (in the Welcome Wizard, after the license is
// ACTIVE). Until then the journey is anchored to the customer account /
// checkout session only.
//
// States:
//   VISITOR            - anonymous landing visitor
//   CHECKOUT           - selected a package, building a checkout session
//   REGISTERED         - account created (account-only, no brand yet)
//   EMAIL_UNVERIFIED  - awaiting email verification after registration
//   EMAIL_VERIFIED    - email verified, returned to checkout
//   PAYMENT_UPLOADED  - transfer proof uploaded, not yet submitted
//   WAITING_VERIFICATION - proof submitted, awaiting platform approval
//   LICENSE_ACTIVE     - license approved
//   ONBOARDING         - license active, running the Welcome Wizard
//   OPERATIONAL        - onboarding complete, full dashboard access
//
// Guards:
//   - A checkout session must be present to enter CHECKOUT/EMAIL_*.
//   - A license must be active to enter LICENSE_ACTIVE/ONBOARDING/OPERATIONAL.
//   - Dashboard access (OPERATIONAL) also requires onboarding complete.

export type JourneyState =
  | "VISITOR"
  | "CHECKOUT"
  | "REGISTERED"
  | "EMAIL_UNVERIFIED"
  | "EMAIL_VERIFIED"
  | "PAYMENT_UPLOADED"
  | "WAITING_VERIFICATION"
  | "LICENSE_ACTIVE"
  | "ONBOARDING"
  | "OPERATIONAL";

export type JourneyEvent =
  | "START_CHECKOUT"
  | "REGISTER"
  | "VERIFY_EMAIL"
  | "UPLOAD_PROOF"
  | "SUBMIT_PROOF"
  | "REJECT"
  | "APPROVE"
  | "START_ONBOARDING"
  | "COMPLETE_ONBOARDING";

export interface JourneyContext {
  hasCheckoutSession: boolean;
  hasActiveLicense: boolean;
  onboardingComplete: boolean;
}

type TransitionTable = {
  [S in JourneyState]?: Partial<Record<JourneyEvent, JourneyState>>;
};

// Static transition table — the single source of truth for allowed moves.
const TRANSITIONS: TransitionTable = {
  VISITOR: { START_CHECKOUT: "CHECKOUT", REGISTER: "REGISTERED", VERIFY_EMAIL: "EMAIL_VERIFIED" },
  CHECKOUT: { REGISTER: "REGISTERED", START_CHECKOUT: "CHECKOUT" },
  REGISTERED: { VERIFY_EMAIL: "EMAIL_UNVERIFIED" },
  EMAIL_UNVERIFIED: { VERIFY_EMAIL: "EMAIL_VERIFIED" },
  EMAIL_VERIFIED: { UPLOAD_PROOF: "PAYMENT_UPLOADED" },
  PAYMENT_UPLOADED: { SUBMIT_PROOF: "WAITING_VERIFICATION", UPLOAD_PROOF: "PAYMENT_UPLOADED" },
  WAITING_VERIFICATION: { APPROVE: "LICENSE_ACTIVE", REJECT: "EMAIL_VERIFIED" },
  LICENSE_ACTIVE: { START_ONBOARDING: "ONBOARDING" },
  ONBOARDING: { COMPLETE_ONBOARDING: "OPERATIONAL" },
  OPERATIONAL: {},
};

export function canTransition(
  from: JourneyState,
  event: JourneyEvent,
  ctx: JourneyContext,
): boolean {
  const next = TRANSITIONS[from]?.[event];
  if (!next) return false;

  // Guards
  if (
    (event === "START_CHECKOUT" || from === "CHECKOUT" || from === "EMAIL_VERIFIED" || from === "EMAIL_UNVERIFIED") &&
    !ctx.hasCheckoutSession &&
    from !== "VISITOR"
  ) {
    // Cannot be mid-checkout without a session (unless just starting one).
    if (event !== "START_CHECKOUT") return false;
  }

  if (event === "APPROVE" && !ctx.hasActiveLicense) return false;
  if (event === "START_ONBOARDING" && !ctx.hasActiveLicense) return false;
  if (event === "COMPLETE_ONBOARDING" && (!ctx.hasActiveLicense || !ctx.onboardingComplete)) return false;

  return true;
}

export function transition(
  from: JourneyState,
  event: JourneyEvent,
  ctx: JourneyContext,
): JourneyState {
  if (!canTransition(from, event, ctx)) {
    throw new Error(`Illegal journey transition: ${from} --${event}-->`);
  }
  return TRANSITIONS[from]![event]!;
}

// Routes each journey state resolves to when the user loads the app root.
const HOME_ROUTE: Record<JourneyState, string> = {
  VISITOR: "/",
  CHECKOUT: "/checkout",
  REGISTERED: "/checkout",
  EMAIL_UNVERIFIED: "/checkout",
  EMAIL_VERIFIED: "/checkout",
  PAYMENT_UPLOADED: "/license",
  WAITING_VERIFICATION: "/license",
  LICENSE_ACTIVE: "/welcome",
  ONBOARDING: "/welcome",
  OPERATIONAL: "/",
};

export function resolveJourneyRoute(state: JourneyState): string {
  return HOME_ROUTE[state];
}

export type RequestedArea = "landing" | "checkout" | "license" | "welcome" | "dashboard";

// Whether the given journey state is allowed to view a specific area.
// Used by middleware to redirect into the correct single-purpose page.
export function canAccessArea(state: JourneyState, area: RequestedArea): boolean {
  const allowed: Record<RequestedArea, JourneyState[]> = {
    landing: ["VISITOR", "OPERATIONAL"],
    checkout: ["CHECKOUT", "REGISTERED", "EMAIL_UNVERIFIED", "EMAIL_VERIFIED"],
    license: ["PAYMENT_UPLOADED", "WAITING_VERIFICATION"],
    welcome: ["LICENSE_ACTIVE", "ONBOARDING"],
    dashboard: ["OPERATIONAL"],
  };
  return allowed[area].includes(state);
}

// Given a state + the area the user is trying to open, return the correct
// path (same path if allowed, otherwise the home route for that state).
export function resolveAreaRoute(state: JourneyState, area: RequestedArea): string {
  if (canAccessArea(state, area)) return area === "landing" ? "/" : `/${area}`;
  return resolveJourneyRoute(state);
}

export const JOURNEY_START: JourneyState = "VISITOR";
