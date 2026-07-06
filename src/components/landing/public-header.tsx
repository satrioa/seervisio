"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  ArrowRight,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Check,
  Settings,
  User,
  Building2,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { SeervisioLogo } from "@/components/brand/logo";
import { landingLogoutAction } from "@/server/actions/auth.actions";
import type { AuthUserData } from "@/app/(landing)/layout";

const NAV = [
  { label: "Solutions", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
];

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [currentLang, setCurrentLang] = React.useState("id");

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
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

  const canAccessBrandSettings = auth.brand && (auth.brand.role === "MASTER_ADMIN" || auth.brand.role === "ADMIN");

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

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-border/40 bg-background/80 backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <SeervisioLogo height={28} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
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
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {mounted ? (
                resolvedTheme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )
              ) : (
                <div className="size-4" />
              )}
            </button>

            {/* Auth button */}
            {isAuth ? (
              <>
                <Button
                  asChild
                  size="sm"
                  className="hidden md:inline-flex gap-1.5 group/dash transition-all duration-200 hover:shadow-md"
                >
                  <Link href={auth.dashboardHref}>
                    Dashboard
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/dash:translate-x-0.5" />
                  </Link>
                </Button>

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

                    {/* Brand info */}
                    {auth.brand && (
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
                      {canAccessBrandSettings && (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/${auth.brand!.slug}/panel/system/brand-profile`}
                            className="cursor-pointer"
                          >
                            <Building2 className="size-4" />
                            Brand Settings
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link
                          href={
                            auth.brand
                              ? `/${auth.brand.slug}/panel/system/account/profile`
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

                      {/* Theme submenu */}
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          {mounted ? (
                            resolvedTheme === "dark" ? (
                              <Moon className="size-4" />
                            ) : resolvedTheme === "light" ? (
                              <Sun className="size-4" />
                            ) : (
                              <Monitor className="size-4" />
                            )
                          ) : (
                            <Sun className="size-4" />
                          )}
                          Theme
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent sideOffset={8}>
                            {THEME_OPTIONS.map((opt) => {
                              const Icon = opt.icon;
                              return (
                                <DropdownMenuItem
                                  key={opt.value}
                                  onClick={() => setTheme(opt.value)}
                                  className="cursor-pointer"
                                >
                                  <Icon className="size-4" />
                                  <span className="flex-1">{opt.label}</span>
                                  {theme === opt.value && (
                                    <Check className="size-3.5" />
                                  )}
                                </DropdownMenuItem>
                              );
                            })}
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
              <Button asChild size="sm" className="hidden md:inline-flex gap-1.5">
                <Link href="/login">
                  Login
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
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
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                {isAuth ? (
                  <>
                    <Button asChild className="gap-1.5">
                      <Link href={auth.dashboardHref} onClick={() => setMobileOpen(false)}>
                        Dashboard
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
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
                  <Button asChild className="gap-1.5">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      Login
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
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
