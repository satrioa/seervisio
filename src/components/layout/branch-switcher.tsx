"use client";

import React from "react";
import { Building2 } from "lucide-react";

interface Branch {
  id: string;
  name: string;
}

interface BranchSwitcherProps {
  branches: Branch[];
  currentBranchId: string | null;
  onSwitch: (branchId: string) => void;
}

export function BranchSwitcher({
  branches,
  currentBranchId,
  onSwitch,
}: BranchSwitcherProps) {
  return (
    <div className="relative">
      <select
        value={currentBranchId ?? ""}
        onChange={(e) => onSwitch(e.target.value)}
        className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1"
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <Building2 className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
