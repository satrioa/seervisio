/**
 * Service repository.
 * TODO: Implement queries for public.services, service_sparepart_usages, service_status_history.
 */

export async function getServicesByBranch(brandId: number, branchId: string) {
  console.log(`[ServiceRepository] getServicesByBranch — not implemented`);
  return [];
}

export async function getServiceById(id: string) {
  console.log(`[ServiceRepository] getServiceById — not implemented`);
  return null;
}

export async function getServiceStatusSummary(brandId: number, branchId: string) {
  console.log(`[ServiceRepository] getServiceStatusSummary — not implemented`);
  return [];
}
