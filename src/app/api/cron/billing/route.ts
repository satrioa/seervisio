import { NextRequest, NextResponse } from "next/server";

// Daily billing maintenance cron (spec §4.1, §5, §6.4).
// Runs:
//  - expire_pending_orders()       (pending order 24h timeout → auto-cancel)
//  - apply_scheduled_downgrades()  (scheduled downgrades now effective)
//  - H-30 expiry reminder scan      (in-app + email, once per license)
//
// Secured by CRON_SECRET (Authorization: Bearer <secret> or ?secret=).
// Schedule via Vercel Cron (vercel.json) or external scheduler.

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    const query = req.nextUrl.searchParams.get("secret");
    const provided = header?.startsWith("Bearer ")
      ? header.slice(7)
      : query ?? undefined;
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { runBillingCronAction } = await import("@/server/actions/license.actions");
    const result = await runBillingCronAction();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[cron/billing]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Cron failed" },
      { status: 500 },
    );
  }
}

// Accept POST too (some schedulers only POST).
export const POST = GET;
