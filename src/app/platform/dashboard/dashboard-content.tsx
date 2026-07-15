"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Building2,
  Users,
  FlaskConical,
  ShieldCheck,
  Infinity as InfinityIcon,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CalendarClock,
  Loader2,
  BarChart3,
  PieChart,
  ShoppingCart,
  ScrollText,
  Ticket,
  Activity,
  Server,
  Clock,
  Database,
  Radio,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformConsoleAction } from "@/server/actions/platform.actions";
import type { PlatformConsoleData } from "@/server/repositories/platform.repository";
import {
  PlatformSection,
  PlatformDashboardGrid,
  PlatformStatCard,
  PlatformChartCard,
  PlatformActivityList,
  PlatformEmptyState,
  PlatformSkeleton,
} from "@/components/platform/dashboard/ui";
import Link from "next/link";

/* ── formatters ── */
function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000)
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".0", "")} M`;
  if (amount >= 1_000_000)
    return `Rp ${(amount / 1_000_000).toFixed(1).replace(".0", "")} jt`;
  return formatIDR(amount);
}
function formatDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_LABELS: Record<string, string> = {
  PLATFORM_LOGIN: "Platform Login",
  PLATFORM_IMPERSONATE: "Impersonation",
  PLATFORM_OWNER_CREATED: "Owner Created",
  FACTORY_RESET: "Factory Reset",
  EXPORT_FULL_BACKUP: "Full Backup Export",
  BRAND_CREATED: "Brand Created",
  SUBSCRIPTION_CHANGED: "Subscription Changed",
  SETTING_UPDATED: "Setting Updated",
  LOGIN_AS_TENANT: "Login As Tenant",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  expired: "Expired",
  cancelled: "Cancelled",
  pending: "Pending",
  pending_payment: "Pending Payment",
  waiting_verification: "Waiting Verification",
  paid: "Paid",
  rejected: "Rejected",
};

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active" || status === "paid"
      ? "bg-platform/10 text-platform border-platform/20"
      : status === "trial" || status === "pending" || status === "pending_payment"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
        : status === "waiting_verification"
          ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
          : "bg-muted text-muted-foreground border-border";
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium capitalize", tone)}
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const QUICK_ACTIONS = [
  { href: "/platform/tenants", label: "Tenants", icon: Building2 },
  { href: "/platform/packages", label: "Packages", icon: BarChart3 },
  { href: "/platform/revenue", label: "Revenue", icon: DollarSign },
  { href: "/platform/system-health", label: "Health", icon: Activity },
];

export function DashboardContent() {
  const [data, setData] = useState<PlatformConsoleData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await getPlatformConsoleAction();
    if (res.success) setData(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PlatformSkeleton />;
  if (!data) {
    return (
      <PlatformEmptyState
        icon={AlertTriangle}
        title="Gagal memuat konsol platform"
        description="Silakan muat ulang halaman untuk mencoba kembali."
      />
    );
  }

  const today = new Date();
  const maxFunnel = Math.max(...data.conversionFunnel.map((f) => f.count), 1);
  const totalLicenses = data.licenseDistribution.reduce(
    (s, d) => s + d.count,
    0,
  );

  return (
    <div className="space-y-10 pb-10">
      {/* ── SECTION 1: Welcome Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-platform">
            <CalendarClock className="size-3.5" />
            {formatDate(today)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Selamat datang kembali
          </h1>
          <p className="text-sm text-muted-foreground">
            Berikut ringkasan ekosistem Seervisio hari ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((q) => (
            <Button
              key={q.href}
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Link href={q.href}>
                <q.icon className="size-3.5" />
                {q.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* ── SECTION 2: Business KPI ── */}
      <PlatformSection
        eyebrow="Business"
        title="Kinerja Pendapatan"
        description="Metrik pendapatan berlangganan di seluruh tenant."
      >
        <PlatformDashboardGrid>
          <PlatformStatCard
            label="MRR"
            value={formatCompact(data.mrr)}
            icon={TrendingUp}
            accent
            className="xl:col-span-2"
            sublabel="Monthly Recurring Revenue"
          />
          <PlatformStatCard label="ARR" value={formatCompact(data.arr)} icon={DollarSign} />
          <PlatformStatCard
            label="Pendapatan Hari Ini"
            value={formatCompact(data.revenueToday)}
            icon={CalendarClock}
          />
          <PlatformStatCard
            label="Verifikasi Pending"
            value={data.pendingVerificationCount}
            icon={Loader2}
            sublabel={formatCompact(data.pendingVerificationAmount)}
          />
          <PlatformStatCard
            label="Total Revenue"
            value={formatCompact(data.totalRevenue)}
            icon={BarChart3}
          />
        </PlatformDashboardGrid>
      </PlatformSection>

      {/* ── SECTION 3: Customer KPI ── */}
      <PlatformSection
        eyebrow="Customers"
        title="Kesehatan Pelanggan"
        description="Jumlah tenant, lisensi, dan status langganan."
      >
        <PlatformDashboardGrid>
          <PlatformStatCard label="Total Customers" value={data.totalCustomers} icon={Building2} />
          <PlatformStatCard label="Customer Baru" value={data.newCustomers} icon={Users} sublabel="Bulan ini" />
          <PlatformStatCard label="Trial Accounts" value={data.trialAccounts} icon={FlaskConical} />
          <PlatformStatCard label="Active Licenses" value={data.activeLicenses} icon={ShieldCheck} />
          <PlatformStatCard label="Lifetime Licenses" value={data.lifetimeLicenses} icon={InfinityIcon} />
          <PlatformStatCard label="Expired Licenses" value={data.expiredLicenses} icon={AlertTriangle} />
        </PlatformDashboardGrid>
      </PlatformSection>

      {/* ── SECTION 4: Charts ── */}
      <PlatformSection
        eyebrow="Analytics"
        title="Tren & Distribusi"
        description="Pertumbuhan pendapatan, pelanggan, dan pergerakan konversi."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PlatformChartCard
            title="Revenue Trend"
            subtitle="Pendapatan bulanan (6 bulan)"
            className="lg:col-span-2"
          >
            {data.revenueTrend.length === 0 ? (
              <PlatformEmptyState icon={BarChart3} title="Belum ada data pendapatan" />
            ) : (
              <div className="h-56">
                <ChartContainer
                  config={{ revenue: { label: "Revenue", color: "hsl(var(--platform-primary))" } } satisfies ChartConfig}
                  className="h-full w-full"
                >
                  <AreaChart data={data.revenueTrend}>
                    <defs>
                      <linearGradient id="consoleRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--platform-primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--platform-primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => formatCompact(v)} width={56} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatIDR(Number(value))} indicator="dot" />} />
                    <Area type="monotone" dataKey="revenue" fill="url(#consoleRev)" stroke="hsl(var(--platform-primary))" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </div>
            )}
          </PlatformChartCard>

          <PlatformChartCard title="License Distribution" subtitle="Berdasarkan status">
            {totalLicenses === 0 ? (
              <PlatformEmptyState icon={PieChart} title="Belum ada lisensi" />
            ) : (
              <div className="space-y-3">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  {data.licenseDistribution.map((d, i) => (
                    <div
                      key={d.status}
                      className="h-full"
                      style={{
                        width: `${(d.count / totalLicenses) * 100}%`,
                        backgroundColor:
                          d.status === "active"
                            ? "hsl(var(--platform-primary))"
                            : d.status === "trial"
                              ? "hsl(var(--chart-3))"
                              : d.status === "expired" || d.status === "cancelled"
                                ? "hsl(var(--destructive))"
                                : "hsl(var(--chart-4))",
                        opacity: 0.4 + i * 0.12,
                      }}
                    />
                  ))}
                </div>
                <ul className="space-y-1.5">
                  {data.licenseDistribution.map((d) => (
                    <li key={d.status} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor:
                              d.status === "active"
                                ? "hsl(var(--platform-primary))"
                                : d.status === "trial"
                                  ? "hsl(var(--chart-3))"
                                  : d.status === "expired" || d.status === "cancelled"
                                    ? "hsl(var(--destructive))"
                                    : "hsl(var(--chart-4))",
                          }}
                        />
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {d.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </PlatformChartCard>

          <PlatformChartCard
            title="Customer Growth"
            subtitle="Akumulasi lisensi per bulan"
            className="lg:col-span-2"
          >
            {data.customerGrowth.length === 0 ? (
              <PlatformEmptyState icon={Users} title="Belum ada data pertumbuhan" />
            ) : (
              <div className="h-56">
                <ChartContainer
                  config={{
                    total: { label: "Total", color: "hsl(var(--platform-primary))" },
                    active: { label: "Active", color: "hsl(var(--muted-foreground))" },
                  } satisfies ChartConfig}
                  className="h-full w-full"
                >
                  <BarChart data={data.customerGrowth}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} width={32} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="total" fill="hsl(var(--platform-primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="active" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </PlatformChartCard>

          <PlatformChartCard title="Conversion Funnel" subtitle="Dari sign-up ke lisensi">
            <div className="space-y-3 pt-1">
              {data.conversionFunnel.map((f) => (
                <div key={f.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{f.stage}</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {f.count.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-platform transition-all"
                      style={{ width: `${Math.max((f.count / maxFunnel) * 100, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PlatformChartCard>
        </div>
      </PlatformSection>

      {/* ── SECTION 5: Commerce ── */}
      <PlatformSection
        eyebrow="Commerce"
        title="Pembayaran & Lisensi"
        description="Transaksi masuk, verifikasi, dan lisensi terbaru."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PlatformDashboardGrid className="lg:col-span-1 lg:grid-cols-1">
            <PlatformStatCard
              label="Pending Payments"
              value={data.pendingPayments.count}
              icon={ShoppingCart}
              sublabel={formatCompact(data.pendingPayments.amount)}
            />
            <PlatformStatCard
              label="Pending Verification"
              value={data.pendingVerificationCount}
              icon={Loader2}
              sublabel={formatCompact(data.pendingVerificationAmount)}
            />
          </PlatformDashboardGrid>

          <PlatformChartCard
            title="Recent Orders"
            subtitle="Pembayaran lisensi terbaru"
            action={
              <Button asChild variant="ghost" size="icon" className="size-7">
                <Link href="/platform/subscriptions">
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            }
            className="lg:col-span-2"
          >
            {data.recentOrders.length === 0 ? (
              <PlatformEmptyState icon={ShoppingCart} title="Belum ada pesanan" />
            ) : (
              <ul className="divide-y divide-border/50">
                {data.recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {o.brandName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.packageName ?? "Paket"} · {formatTime(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCompact(o.amount)}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PlatformChartCard>

          <PlatformChartCard
            title="Latest Licenses"
            subtitle="Lisensi yang diterbitkan"
            className="lg:col-span-3"
          >
            {data.latestLicenses.length === 0 ? (
              <PlatformEmptyState icon={ShieldCheck} title="Belum ada lisensi" />
            ) : (
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {data.latestLicenses.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-3 border-b border-border/40 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {l.brandName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.packageName ?? "Paket"}
                      </p>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                ))}
              </div>
            )}
          </PlatformChartCard>
        </div>
      </PlatformSection>

      {/* ── SECTION 6: Operations ── */}
      <PlatformSection
        eyebrow="Operations"
        title="Aktivitas & Dukungan"
        description="Log platform, audit, dan tiket bantuan."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PlatformChartCard
            title="Recent Activity"
            subtitle="Tindakan tingkat platform"
            action={
              <Button asChild variant="ghost" size="icon" className="size-7">
                <Link href="/platform/system-logs">
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            }
            className="lg:col-span-2"
          >
            <PlatformActivityList
              emptyIcon={ScrollText}
              emptyLabel="Belum ada aktivitas terbaru"
              items={data.recentActivity.map((a) => ({
                id: a.id,
                title:
                  ACTION_LABELS[a.action] ??
                  a.action.replace(/_/g, " ").toLowerCase(),
                meta: a.actorName ?? a.brandName ?? "System",
                time: formatTime(a.createdAt),
                icon: <ScrollText className="size-3.5" />,
              }))}
            />
          </PlatformChartCard>

          <PlatformChartCard
            title="Support Tickets"
            subtitle="Tiket bantuan pelanggan"
          >
            <PlatformEmptyState
              icon={Ticket}
              title="Belum ada tiket"
              description="Tiket bantuan akan muncul di sini setelah integrasi pusat bantuan."
            />
          </PlatformChartCard>
        </div>
      </PlatformSection>

      {/* ── SECTION 7: Infrastructure ── */}
      <PlatformSection
        eyebrow="Infrastructure"
        title="Kesehatan Sistem"
        description="Status komponen platform secara real-time."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <PlatformChartCard
            title="System Health"
            subtitle="Database, storage, email, jobs, API"
            className="lg:col-span-2"
          >
            <ul className="divide-y divide-border/50">
              {data.systemHealth.map((h) => (
                <li key={h.component} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        h.status === "healthy"
                          ? "bg-platform"
                          : h.status === "warning"
                            ? "bg-amber-500"
                            : "bg-destructive",
                      )}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {h.component}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{h.message}</span>
                    <span className="tabular-nums text-muted-foreground/70">
                      {h.latencyMs}ms
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </PlatformChartCard>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { icon: Clock, label: "Queue Status", desc: "Belum terintegrasi" },
              { icon: Server, label: "Cron Jobs", desc: "Belum terintegrasi" },
              { icon: Database, label: "Storage", desc: `${data.systemHealth.find((h) => h.component === "Storage")?.message ?? "—"}` },
              { icon: Radio, label: "Realtime", desc: "Belum terintegrasi" },
            ].map((item) => (
              <Card key={item.label} className="border-border/60 bg-card/60 shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <item.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PlatformSection>
    </div>
  );
}
