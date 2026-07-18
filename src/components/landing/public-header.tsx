"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  ArrowRight,
  LogOut,
  Check,
  User,
  Building2,
  Languages,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SeervisioLogo } from "@/components/brand/logo";
import { landingLogoutAction } from "@/server/actions/auth.actions";
import type { AuthUserData } from "@/app/(landing)/layout";

const UNAUTH_NAV = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

const LANGUAGES = [
  { value: "id", label: "🇮🇩 Bahasa Indonesia" },
  { value: "en", label: "🇺🇸 English" },
];

interface PublicHeaderProps {
  auth: AuthUserData;
}

export function PublicHeader({ auth }: PublicHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [currentLang, setCurrentLang] = React.useState("id");

  React.useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await landingLogoutAction();
      router.refresh();
    } catch {
      // ignore
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  const initials = auth.profile
    ? auth.profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?"
    : "?";

  const avatarUrl = auth.profile?.avatarUrl;
  const isAuth = auth.isAuthenticated;

  // Determine nav items: show Dashboard link when signed in
  const navItems = React.useMemo(() => {
    if (!isAuth) return UNAUTH_NAV;
    return [
      { label: "Dashboard", href: auth.dashboardHref },
      ...UNAUTH_NAV,
    ];
  }, [isAuth, auth.dashboardHref]);

  // CTA label & href based on auth/license state
  // Returns null to hide the button entirely when payment is pending.
  const cta = React.useMemo<{ label: string; href: string } | null>(() => {
    if (!isAuth) return { label: "Start Free", href: "/signup" };
    if (auth.accountType === 'platform') return { label: "Platform Dashboard", href: "/platform/dashboard" };
    if (auth.license.hasPendingPayment) return null;
    if (!auth.license.exists) return { label: "Choose a Plan", href: "/license" };
    if (!auth.license.isActive) return { label: "My License", href: "/panel/licenses" };
    if (!auth.profile?.onboardingCompleted) return { label: "Continue Setup", href: "/welcome" };
    return { label: "Dashboard", href: auth.dashboardHref };
  }, [isAuth, auth]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 bg-background/80 backdrop-blur-xl border-b transition-all duration-300",
          scrolled
            ? "border-border/40 shadow-xs"
            : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <SeervisioLogo height={28} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  item.label === "Dashboard"
                    ? "text-primary font-semibold"
                    : pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Auth-aware CTA */}
            {isAuth ? (
              <>
                {cta && (
                  <Button
                    asChild
                    size="sm"
                    className="hidden md:inline-flex gap-1.5 group/dash transition-all duration-200 hover:shadow-md"
                  >
                    <Link href={cta.href}>
                      {cta.label}
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/dash:translate-x-0.5" />
                    </Link>
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative flex size-8 items-center justify-center rounded-full outline-none transition-all duration-200 hover:ring-2 hover:ring-ring hover:ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Profile menu"
                    >
                      <Avatar className="size-8">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} alt={auth.profile?.name || ""} />
                        ) : null}
                        <AvatarFallback className="text-[11px] font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="w-[280px]"
                  >
                    {/* Profile info */}
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-3 px-2 py-3">
                        <Avatar className="size-10">
                          {avatarUrl ? (
                            <AvatarImage src={avatarUrl} alt={auth.profile?.name || ""} />
                          ) : null}
                          <AvatarFallback className="text-sm font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {auth.profile?.name || ""}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {auth.profile?.email || ""}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuLabel>

                    {/* Brand info — customer only */}
                    {auth.accountType !== 'platform' && auth.brand && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-xs text-muted-foreground">
                            {auth.brand.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {auth.brand.role.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </div>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {/* License status — customer only */}
                      {auth.accountType !== 'platform' && (
                        <DropdownMenuItem asChild>
                          <Link
                            href="/license"
                            className="cursor-pointer"
                          >
                            <ShieldCheck className="size-4" />
                            <div className="flex flex-1 items-center justify-between">
                              <span>License</span>
                              <span className="flex items-center gap-1">
                                {auth.license.isActive ? (
                                  <>
                                    <CheckCircle2 className="size-3 text-green-500" />
                                    <span className="text-[11px] text-green-600 dark:text-green-400">Active</span>
                                  </>
                                ) : auth.license.hasPendingPayment ? (
                                  <>
                                    <Clock className="size-3 text-amber-500" />
                                    <span className="text-[11px] text-amber-600 dark:text-amber-400">Pending</span>
                                  </>
                                ) : auth.license.exists ? (
                                  <>
                                    <AlertCircle className="size-3 text-red-500" />
                                    <span className="text-[11px] text-red-600 dark:text-red-400">Inactive</span>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">—</span>
                                )}
                              </span>
                            </div>
                            <ExternalLink className="size-3 text-muted-foreground" />
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link
                          href={
                            auth.accountType === 'platform'
                              ? "/platform/settings"
                              : auth.brand
                                ? `/${auth.brand.slug}/panel/account`
                                : "/login"
                          }
                          className="cursor-pointer"
                        >
                          <User className="size-4" />
                          Account Settings
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      {/* Language submenu */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Languages className="size-4" />
                          Language
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent sideOffset={8}>
                            {LANGUAGES.map((lang) => (
                              <DropdownMenuItem
                                key={lang.value}
                                onClick={() => setCurrentLang(lang.value)}
                                className="cursor-pointer"
                              >
                                <span className="flex-1">{lang.label}</span>
                                {currentLang === lang.value && (
                                  <Check className="size-3.5" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setLogoutOpen(true)}
                      className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    >
                      <LogOut className="size-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Login</Link>
                </Button>
                <MagneticButton
                  size="sm"
                  onClick={() => router.push("/signup")}
                >
                  Start Free
                  <ArrowRight className="size-3.5" />
                </MagneticButton>
              </div>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-background/95 backdrop-blur-sm md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Link
                href="/"
                className="flex items-center gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <SeervisioLogo height={28} />
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>

            {/* Auth info in mobile */}
            {isAuth && auth.profile && (
              <div className="flex items-center gap-3 border-b border-border px-4 pb-4">
                <Avatar className="size-10">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={auth.profile.name} />
                  ) : null}
                  <AvatarFallback className="text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{auth.profile.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{auth.profile.email}</p>
                </div>
              </div>
            )}

            <nav className="flex flex-col gap-1 px-4 pt-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-3 text-base font-medium transition-colors",
                    item.label === "Dashboard"
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                {isAuth ? (
                  <>
                    {cta && (
                      <Button asChild className="gap-1.5">
                        <Link href={cta.href} onClick={() => setMobileOpen(false)}>
                          {cta.label}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="gap-1.5 text-red-600 dark:text-red-400"
                      onClick={() => {
                        setMobileOpen(false);
                        setLogoutOpen(true);
                      }}
                    >
                      <LogOut className="size-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" className="gap-1.5">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        Login
                      </Link>
                    </Button>
                    <MagneticButton
                      onClick={() => {
                        router.push("/signup");
                        setMobileOpen(false);
                      }}
                    >
                      Start Free
                      <ArrowRight className="size-4" />
                    </MagneticButton>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout confirmation dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setLogoutOpen(false)}
              disabled={loggingOut}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
