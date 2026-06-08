/**
 * Service domain types.
 */

import type { ServiceStatus } from "./service-status";

export interface CreateServiceInput {
  brandId: number;
  branchId: string;
  customerId?: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceImei?: string;
  deviceSerialNumber?: string;
  reportedIssue: string;
  diagnosisResult?: string;
  estimatedCost?: number;
}

export interface ServiceListItem {
  id: string;
  serviceNumber: string;
  customerName: string;
  deviceModel: string;
  deviceType: string;
  currentStatus: ServiceStatus;
  finalCost: number;
  createdAt: string;
  branchName: string;
}

export type { ServiceStatus };
