# Seervisio — Agent Guide

This repo's AI-agent context lives in two files. Read them before starting work:

- **`docs/PROJECT_CONTEXT.md`** — full reference: stack, conventions, routing
  model, licensing/billing module, inventory module, env/secrets, local setup,
  and hard-won gotchas.
- **`.claude/ANCHORED_SUMMARY.md`** — short living summary of current project
  state and the next planned feature.

## Quick start
1. `npm install`
2. `.env.example` → `.env.local`, fill Supabase + Brevo values.
3. `npm run dev` (Next on :3000). Tests: `npm test` (vitest). Typecheck:
   `npx tsc --noEmit -p tsconfig.json`.

## Key rules
- Supabase migrations in `supabase/migrations/` need **unique numeric version
  numbers**; rename `<NNNa>_` collisions before `supabase db push`.
- Server actions return `ActionResult<T>`; use the existing in-repo UI
  component libraries (premium monochrome aesthetic).
- Daily billing cron at `src/app/api/cron/billing`, gated by `CRON_SECRET`.
