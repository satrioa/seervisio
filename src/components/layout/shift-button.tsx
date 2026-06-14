"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Play, Square } from "lucide-react";

export function ShiftButton() {
  const [isShiftOpen, setIsShiftOpen] = useState(false);

  const handleOpenShift = () => setIsShiftOpen(true);
  const handleCloseShift = () => setIsShiftOpen(false);

  if (!isShiftOpen) {
    return (
      <Button onClick={handleOpenShift} className="gap-2">
        <Play className="size-4" />
        Buka Shift
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Square className="size-4 fill-current" />
          Shift Aktif
          <ChevronDown className="size-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Shift — Semarang Pusat</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive font-medium"
          onClick={handleCloseShift}
        >
          <Square className="size-4" />
          Akhiri Shift
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
