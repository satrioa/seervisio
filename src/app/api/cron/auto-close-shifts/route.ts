import { NextRequest, NextResponse } from "next/server";

// Auto-close shifts cron.
// Runs check_and_auto_close_shifts() RPC to auto-close shifts that exceed
// their scheduled closing time + grace period.
//
// Secured by CRON_SECRET (Authorization: Bearer <secret> or ?secret=).
// Schedule: every 15 minutes via Vercel Cron (vercel.json).

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
    const { runAutoCloseCheckAction } = await import(
      "@/server/actions/auto-close.actions"
    );
    const result = await runAutoCloseCheckAction();

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 },
      );
    }

    const closed = result.data ?? [];
    console.log("[cron/auto-close-shifts]", {
      closedCount: closed.length,
      shifts: closed.map((s) => s.shiftNumber),
    });

    return NextResponse.json({
      ok: true,
      closedCount: closed.length,
      shifts: closed.map((s) => ({
        shiftId: s.shiftId,
        shiftNumber: s.shiftNumber,
        branchName: s.branchName,
        lateMinutes: s.lateMinutes,
      })),
    });
  } catch (err: any) {
    console.error("[cron/auto-close-shifts]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Cron failed" },
      { status: 500 },
    );
  }
}

export const POST = GET;
