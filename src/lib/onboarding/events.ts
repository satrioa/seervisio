/**
 * Fire an onboarding event so the guided tour instantly advances.
 * Call this from any component after an entity is successfully created.
 *
 * Event names (kebab-case):
 *   brand-profile-saved
 *   branch-created
 *   user-created
 *   payment-account-created
 *   payment-method-created
 *   inventory-created
 *   sparepart-created
 *   customer-created
 *   service-created
 */
export function fireOnboardingEvent(eventName: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName));
}
