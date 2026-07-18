export interface CouponRow {
  id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  currency: string;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number | null;
  minOrderAmount: number | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
