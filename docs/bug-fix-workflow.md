# Bug-Fix Workflow

## Cycle

1. **Reproduce** — Write a failing test that demonstrates the bug before any code changes
2. **Isolate** — Use the failing test to narrow down root cause (RPC, server action, repository, RLS policy, migration)
3. **Fix** — Apply the minimal change needed to make the test pass
4. **Verify** — Run full test suite: `npx vitest run`. Verify all 275+ tests pass with 0 failures

## Where Bugs Live

| Layer | Common Bug Patterns | Detection |
|---|---|---|
| RPC function | Wrong filter operator (`.eq` vs `.in`), missing status values | service-payment.test.ts, pos-checkout.test.ts |
| Server action | Missing null/undefined guard on optional data | service.actions.ts |
| Migration | Missing CHECK constraint, wrong column type | inventory.test.ts, payment-account.test.ts |
| RLS policy | Missing brand_id filter, missing role check | rls-permissions.test.ts |
| Repository | Incorrect join, wrong WHERE clause | integration-flows.test.ts |

## CI Gate

Before merging any PR with production-impacting changes:

```bash
npx vitest run                # 275 unit/integration tests (0 failures expected)
```

Run SQL invariants against staging DB to detect data corruption:

```sql
-- src/__tests__/sql/001-validate-invariants.sql
-- Expected: ALL 25 queries return 0 rows
```

## TDD Rule

No production code change merges without a corresponding test that:
- Fails **before** the fix
- Passes **after** the fix
- Is committed **together with** the fix in the same PR

## Immutable Append-Only Tables (no UPDATE/DELETE policies)

- `payment_account_movements`
- `inv_stock_movements`
- `audit_logs`

Any bug involving these tables must be fixed with a compensating entry (e.g., a reversal movement), never by mutating existing rows.

## Real Example (TDD Audit 2026-06-21)

**Bug 1** — `getServicesPaymentSummary` filtered `payment_status` with `.eq("COMPLETED")`, missing `PAID` and `SUCCESS` statuses.

- Reproduce: Write test expecting `PAID` payments to appear in summary → fails
- Isolate: Trace query chain: service.actions.ts → repository → RPC
- Fix: `.eq("COMPLETED")` → `.in(["COMPLETED","PAID","SUCCESS"])`
- Verify: 275/275 pass

**Bug 2** — `paymentSummary` undefined for UNPAID services because server action only set it when `summary` existed.

- Reproduce: Write test for UNPAID service without any payments → fails
- Isolate: `service.actions.ts` refs `paymentSummary` inside `if (summary)` guard
- Fix: Always initialize `paymentSummary` with UNPAID defaults before the guard
- Verify: 275/275 pass
