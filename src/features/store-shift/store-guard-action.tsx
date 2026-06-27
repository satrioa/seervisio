"use client";

import * as React from "react";
import { useCallback, useState, useRef } from "react";
import { Store } from "lucide-react";
import { useStoreShift } from "./store-shift-provider";
import { StoreShiftOpenModal } from "@/components/store-shift/StoreShiftOpenModal";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface StoreGuardConfig {
  brandSlug: string;
  branchId: string;
  branchName?: string;
}

/**
 * Hook that provides a guardAction function.
 * If store is open, the action runs immediately.
 * If store is closed, a dialog appears offering to open the store.
 * After the store is successfully opened, the original action retries.
 */
export function useStoreGuardAction(config: StoreGuardConfig) {
  const { activeShift, isShiftLoading, refreshShiftStatus } = useStoreShift();
  const pendingActionRef = useRef<(() => void) | null>(null);
  const [showClosedDialog, setShowClosedDialog] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);

  const isStoreOpen = !!activeShift && activeShift.shiftStatus === "OPEN";

  const guardAction = useCallback((action: () => void) => {
    if (isStoreOpen) {
      action();
    } else {
      pendingActionRef.current = action;
      setShowClosedDialog(true);
    }
  }, [isStoreOpen]);

  const handleBukaToko = useCallback(() => {
    setShowClosedDialog(false);
    setShowOpenShiftModal(true);
  }, []);

  const handleOpenShiftSuccess = useCallback(() => {
    setShowOpenShiftModal(false);
    void refreshShiftStatus();
    // Retry pending action after store opens
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pending) {
      setTimeout(pending, 100);
    }
  }, [refreshShiftStatus]);

  const clearPending = useCallback(() => {
    pendingActionRef.current = null;
    setShowClosedDialog(false);
  }, []);

  const GuardDialog = useCallback(() => (
    <AlertDialog open={showClosedDialog} onOpenChange={setShowClosedDialog}>
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
          <Button variant="outline" size="sm" onClick={clearPending}>
            Batal
          </Button>
          <Button size="sm" className="gap-2" onClick={handleBukaToko}>
            <Store className="size-3.5" />
            Buka Toko
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ), [showClosedDialog, clearPending, handleBukaToko]);

  const OpenShiftModal = useCallback(() => (
    <StoreShiftOpenModal
      open={showOpenShiftModal}
      onOpenChange={setShowOpenShiftModal}
      brandSlug={config.brandSlug}
      branchId={config.branchId}
      branchName={config.branchName}
      onSuccess={handleOpenShiftSuccess}
    />
  ), [showOpenShiftModal, config.brandSlug, config.branchId, config.branchName, handleOpenShiftSuccess]);

  return {
    isStoreOpen,
    isShiftLoading,
    guardAction,
    GuardDialog,
    OpenShiftModal,
    clearPending,
  };
}
