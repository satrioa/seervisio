"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Eye, ShieldAlert } from "lucide-react";
import { exitImpersonationAction } from "@/server/actions/platform-audit.actions";

interface ImpersonationBannerProps {
  brandSlug: string;
  brandName: string;
}

export function ImpersonationBanner({ brandSlug, brandName }: ImpersonationBannerProps) {
  const router = useRouter();
  const [exiting, setExiting] = React.useState(false);

  const handleExit = async () => {
    setExiting(true);
    const res = await exitImpersonationAction();
    if (res.success) {
      router.push("/platform/dashboard");
    }
    setExiting(false);
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-700 backdrop-blur-md dark:text-amber-400">
      <div className="flex items-center gap-2 min-w-0">
        <ShieldAlert className="size-4 shrink-0" />
        <span className="text-xs font-medium truncate">
          Impersonating <span className="font-semibold">{brandName}</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium">
          <Eye className="size-3" />
          Read-only view
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 gap-1.5 border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
        onClick={handleExit}
        disabled={exiting}
      >
        <LogOut className="size-3.5" />
        {exiting ? "Exiting..." : "Exit Impersonation"}
      </Button>
    </div>
  );
}
