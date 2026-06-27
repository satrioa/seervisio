"use client";

import * as React from "react";
import { Store } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface StoreClosedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBukaToko: () => void;
  /** The branch ID that will be passed to open store dialog */
  branchId: string;
}

export function StoreClosedDialog({
  open,
  onOpenChange,
  onBukaToko,
}: StoreClosedDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[380px]">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Store className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <AlertDialogTitle className="text-center text-base">
            Toko Belum Dibuka
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed">
            Anda harus membuka toko terlebih dahulu untuk melakukan aktivitas operasional.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={onBukaToko}
          >
            <Store className="size-3.5" />
            Buka Toko
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
