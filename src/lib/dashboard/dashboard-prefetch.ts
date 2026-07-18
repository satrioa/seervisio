let prefetchPromise: Promise<DashboardPrefetchResult> | null = null;
let prefetchBrandSlug: string | null = null;

export interface DashboardPrefetchResult {
  success: boolean;
  data?: any;
  error?: string;
}

export function setDashboardPrefetch(
  brandSlug: string,
  promise: Promise<DashboardPrefetchResult>,
) {
  prefetchBrandSlug = brandSlug;
  prefetchPromise = promise;
}

export function consumeDashboardPrefetch(brandSlug: string): Promise<DashboardPrefetchResult> | null {
  if (prefetchPromise && prefetchBrandSlug === brandSlug) {
    const p = prefetchPromise;
    prefetchPromise = null;
    prefetchBrandSlug = null;
    return p;
  }
  return null;
}
