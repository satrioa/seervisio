/**
 * Payment repository.
 * TODO: Implement queries for payment_methods, payment_accounts, payment_account_movements, service_payments.
 */

export async function getPaymentMethodsByBrandId(brandId: number) {
  console.log(`[PaymentRepository] getPaymentMethodsByBrandId — not implemented`);
  return [];
}

export async function getPaymentAccountsByBrandId(brandId: number) {
  console.log(`[PaymentRepository] getPaymentAccountsByBrandId — not implemented`);
  return [];
}

export async function getActiveBranchPaymentMethods(brandId: number, branchId: string) {
  console.log(`[PaymentRepository] getActiveBranchPaymentMethods — not implemented`);
  return [];
}
