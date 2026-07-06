# Product Onboarding Tour — Test Plan

## Prerequisites
- User account with a brand, active membership, and `onboarding_completed = false`
- Or: complete the Google OAuth flow (lands on `/onboarding`, then completes wizard, then the tour should fire)

## Test 1: Tour Fires on First Panel Visit

1. Sign in as a MASTER_ADMIN with `onboarding_completed = true`
2. Navigate to `/[brandSlug]/panel/dashboard`
3. Expected: Tour welcome screen appears (four-div spotlight, floating card)
4. Expected: Floating card shows "Setup Your Business" as first mission

### What to check
- Spotlight overlay covers the background with blur
- Floating card renders with mission title, steps, difficulty, estimated time
- Progress bar shows overall progress (e.g., "0 of 4 missions")

## Test 2: Cross-Page Navigation

1. Accept the first mission (click "Start")
2. Expected: `router.push` navigates to `/[brandSlug]/settings/business/profile`
3. Expected: Spotlight highlights `#business-profile-form` element
4. Click "Next" step
5. Expected: Navigates to `/[brandSlug]/settings/business/location`
6. Expected: Spotlight highlights `#location-map` element

### What to check
- `MutationObserver` waits for the target element before showing spotlight
- Smooth navigation transition
- Floating card persists across page navigations

## Test 3: Role-Specific Missions

Test each role separately:
- **PLATFORM_OWNER**: 5 missions (business-setup, inventory-setup, payment-setup, shift-setup, first-service)
- **MASTER_ADMIN**: 4 missions (business-setup, inventory-setup, payment-setup, shift-setup)
- **ADMIN**: 2 missions (inventory-setup, shift-setup)
- **FRONTLINER**: 1 mission (first-service)
- **TECHNICIAN**: 1 mission (first-service)

## Test 4: Mission Completion Persistence

1. Complete a mission (all steps)
2. Expected: `completed_missions` array in `user_preferences.tour_state` includes the mission ID
3. Refresh the page
4. Expected: Completed mission shows as done, next mission is offered

## Test 5: Dashboard Checklist

1. With incomplete missions, go to `/[brandSlug]/panel/dashboard`
2. Expected: A checklist card shows remaining missions
3. Click a checklist item
4. Expected: Tour starts from that mission

## Test 6: Skipping Tour

1. Click "Skip" on the welcome screen or floating card
2. Expected: `skipped_at` timestamp saved to `tour_state`
3. Refresh the page
4. Expected: Tour does not reappear

## Test 7: "Create Employee Account" Mission

1. Start as MASTER_ADMIN
2. Navigate through the shift-setup mission
3. Expected: "Create Employee Account" appears instead of "Invite Team"

## Failure Modes

| Symptom | Likely cause |
|---|---|
| Spotlight appears but no card | Tour Engine context not connected |
| Card appears but no spotlight | `data-tour` attribute not found on the target element |
| Navigation fails silently | `router.push` route doesn't exist or is blocked by middleware |
| Spotlight shows multiple holes incorrectly | Four-div calculation is off (viewport resize not handled) |
| Mission state resets on refresh | `saveTourState` not called or `loadTourState` returns default |
