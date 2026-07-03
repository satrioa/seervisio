"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface LoginFormFieldsProps {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  rememberMe: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const inputClasses =
  "flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200 focus:border-white/20 focus:bg-white/[0.07] focus:ring-1 focus:ring-white/10 disabled:opacity-50";

const ease = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease,
      delay: 0.25 + i * 0.06,
    },
  }),
};

export function LoginFormFields({
  email,
  password,
  isLoading,
  error,
  rememberMe,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onSubmit,
}: LoginFormFieldsProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {/* Error */}
      <motion.div
        key={error ?? "no-error"}
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: error ? 1 : 0,
          height: error ? "auto" : 0,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </motion.div>

      {/* Email */}
      <motion.div
        custom={0}
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-1.5"
      >
        <label
          htmlFor="login-email"
          className="text-xs font-medium text-white/60"
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          placeholder="name@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          autoComplete="email"
          disabled={isLoading}
          className={inputClasses}
          aria-label="Email address"
        />
      </motion.div>

      {/* Password */}
      <motion.div
        custom={1}
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-1.5"
      >
        <label
          htmlFor="login-password"
          className="text-xs font-medium text-white/60"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isLoading}
            className={inputClasses + " pr-11"}
            aria-label="Password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Remember Me + Forgot Password */}
      <motion.div
        custom={2}
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between"
      >
        <label className="flex cursor-pointer items-center gap-2">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
              disabled={isLoading}
              className="peer size-4 appearance-none rounded-md border border-white/20 bg-white/5 checked:border-primary checked:bg-primary transition-colors duration-200"
              id="login-remember"
            />
            <svg
              className="pointer-events-none absolute left-0 top-0 size-4 stroke-white opacity-0 peer-checked:opacity-100 transition-opacity"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M4 8.5L6.5 11L12 5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-xs text-white/50">Remember me</span>
        </label>

        <button
          type="button"
          className="text-xs text-white/40 transition-colors hover:text-white/70"
          aria-label="Forgot password"
        >
          Forgot password?
        </button>
      </motion.div>

      {/* Submit */}
      <motion.div
        custom={3}
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <button
          type="submit"
          disabled={isLoading}
          className={[
            "flex h-11 w-full items-center justify-center gap-2",
            "rounded-xl bg-primary text-sm font-medium text-primary-foreground",
            "transition-all duration-200",
            "hover:brightness-110 hover:shadow-lg hover:shadow-primary/25",
            "active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          ].join(" ")}
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </motion.div>
    </form>
  );
}
