/**
 * Inventory domain types.
 */

import type { ItemType } from "@/types/app";

export interface InventoryItemInput {
  brandId: number;
  categoryId?: string;
  itemType: ItemType;
  name: string;
  sku?: string;
  costPrice: number;
  sellingPrice: number;
  minStock?: number;
  trackStock?: boolean;
}

export interface InventoryMovementInput {
  brandId: number;
  branchId: string;
  itemId: string;
  direction: "IN" | "OUT";
  movementType: string;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}

export interface StockSummary {
  itemId: string;
  itemName: string;
  sku?: string;
  itemType: ItemType;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  stockStatus: "OK" | "LOW" | "OUT";
}
