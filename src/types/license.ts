export type LicenseOrderStatus =
  | "pending_payment"
  | "waiting_verification"
  | "paid"
  | "rejected"
  | "expired"
  | "cancelled";

export type LicenseStatus =
  | "trial"
  | "active"
  | "expired"
  | "cancelled"
  | "pending";

export interface LicenseOrder {
  id: string;
  invoice_number: string;
  brand_id: number;
  package_id: string;
  price: number;
  unique_code: number;
  total_amount: number;
  status: LicenseOrderStatus;
  payment_deadline: string;
  payment_method: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  proof_url: string | null;
  notes: string | null;
  brand_info: Record<string, unknown> | null;
  pic_name: string | null;
  pic_phone: string | null;
  company_address: string | null;
  npwp: string | null;
  invoice_email: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  package_name?: string;
  package_slug?: string;
  brand_name?: string;
  billing_duration_enabled?: boolean;
  billing_duration_type?: "month" | "year" | null;
  billing_duration_value?: number | null;
}

export interface License {
  id: string;
  brand_id: number;
  package_id: string;
  order_id: string | null;
  license_payment_id: string | null;
  status: LicenseStatus;
  started_at: string;
  expires_at: string | null;
  is_trial: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  package_name?: string;
  package_slug?: string;
  brand_name?: string;
  billing_duration_enabled?: boolean;
  billing_duration_type?: "month" | "year" | null;
  billing_duration_value?: number | null;
}

export interface LicensePackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  max_branches: number;
  max_users: number;
  max_storage_mb: number;
  max_transactions: number;
  is_active: boolean;
  billing_duration_enabled: boolean;
  billing_duration_type: "month" | "year" | null;
  billing_duration_value: number | null;
}

export interface CreateLicenseOrderInput {
  package_id: string;
  pic_name: string;
  pic_phone: string;
  company_address: string;
  npwp?: string;
  invoice_email: string;
  notes?: string;
}

export interface BankTransferInfo {
  bank_name: string;
  account_number: string;
  account_holder: string;
}
