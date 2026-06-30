"use client";

import { ThemeProvider } from "next-themes";
import { BootProvider } from "@/components/system-loader/BootProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <BootProvider>
        {children}
      </BootProvider>
    </ThemeProvider>
  );
}
