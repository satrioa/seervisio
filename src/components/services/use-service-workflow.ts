"use client";

/**
 * use-service-workflow.ts
 * React hook for client-side workflow validation.
 *
 * Provides pre-check validation before calling server actions.
 * All UI components should use this hook to:
 * 1. Determine which status actions to show
 * 2. Pre-validate transitions before calling server action
 * 3. Format error messages from validation results
 */

import { useMemo, useCallback } from "react";
import {
  validateServiceStatusTransition,
  validateCancelService,
  validateReopenService,
  getAllowedNextStatuses,
  canCancelService,
  canReopenService,
  getStatusLabel,
  type ServiceWorkflowStatus,
  type ServiceWorkflowRole,
  type TransitionValidationResult,
} from "@/domain/service/service-workflow";
import type { ServiceRecord } from "@/components/services/service-data";

/* ─── Map mock lowercase status to workflow uppercase ─── */

function toWorkflowStatus(status: string): ServiceWorkflowStatus {
  const map: Record<string, ServiceWorkflowStatus> = {
    masuk: "MASUK",
    diagnosa: "DIAGNOSA",
    menunggu_persetujuan: "DIAGNOSA",
    perbaikan: "PERBAIKAN",
    qc: "QC",
    selesai: "SELESAI",
    diambil: "SELESAI",
    batal: "CANCELLED",
    cancelled: "CANCELLED",
  };
  return map[status.toLowerCase()] ?? "MASUK";
}

/* ─── Hook ─── */

export function useServiceWorkflow(role: ServiceWorkflowRole = "MASTER_ADMIN") {
  const getServiceStatus = useCallback(
    (service: ServiceRecord): ServiceWorkflowStatus => {
      return toWorkflowStatus(service.status);
    },
    [],
  );

  const getAllowedActions = useCallback(
    (service: ServiceRecord) => {
      const workflowStatus = getServiceStatus(service);

      const allowedNext = getAllowedNextStatuses(role, workflowStatus);
      const canCancel = canCancelService({
        currentStatus: workflowStatus,
        role,
      });
      const canReopen = canReopenService({
        currentStatus: workflowStatus,
        role,
      });

      return {
        allowedNext,
        canCancel,
        canReopen,
        nextLabel:
          allowedNext.length > 0
            ? getStatusLabel(allowedNext[0])
            : null,
      };
    },
    [role, getServiceStatus],
  );

  const preValidateTransition = useCallback(
    (
      service: ServiceRecord,
      nextStatus: ServiceWorkflowStatus,
      reason?: string,
    ): TransitionValidationResult => {
      const workflowStatus = getServiceStatus(service);

      return validateServiceStatusTransition({
        currentStatus: workflowStatus,
        nextStatus,
        role,
        reason,
      });
    },
    [role, getServiceStatus],
  );

  const preValidateCancel = useCallback(
    (
      service: ServiceRecord,
      reason?: string,
      hasUsedSpareparts?: boolean,
      returnStockConfirmed?: boolean,
    ): TransitionValidationResult => {
      const workflowStatus = getServiceStatus(service);

      return validateCancelService({
        currentStatus: workflowStatus,
        role,
        reason,
        hasUsedSpareparts,
        returnStockConfirmed,
      });
    },
    [role],
  );

  const preValidateReopen = useCallback(
    (
      service: ServiceRecord,
      reason?: string,
    ): TransitionValidationResult => {
      const workflowStatus = getServiceStatus(service);

      return validateReopenService({
        currentStatus: workflowStatus,
        role,
        reason,
      });
    },
    [role],
  );

  return {
    getServiceStatus,
    getAllowedActions,
    preValidateTransition,
    preValidateCancel,
    preValidateReopen,
  };
}
