/**
 * Remembered accounts — safe metadata of accounts that have logged in.
 * Stored in localStorage. No passwords, tokens, or PINs.
 */

export interface RememberedAccount {
  profileId: string;
  authUserId?: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  brandId?: number | null;
  brandName?: string | null;
  brandSlug?: string | null;
  lastUsedAt: string;
}

const STORAGE_KEY = "seervis:remembered-accounts";
const MAX_ACCOUNTS = 10;

export function loadRememberedAccounts(): RememberedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RememberedAccount[];
  } catch {
    return [];
  }
}

export function saveRememberedAccount(account: RememberedAccount): void {
  const accounts = loadRememberedAccounts();
  const existing = accounts.findIndex(
    (a) => a.email === account.email && a.brandSlug === account.brandSlug,
  );

  if (existing !== -1) {
    accounts[existing] = { ...accounts[existing], ...account, lastUsedAt: new Date().toISOString() };
  } else {
    accounts.unshift({ ...account, lastUsedAt: new Date().toISOString() });
  }

  // Keep only MAX_ACCOUNTS
  const trimmed = accounts.slice(0, MAX_ACCOUNTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function removeRememberedAccount(email: string, brandSlug?: string): void {
  const accounts = loadRememberedAccounts();
  const filtered = accounts.filter(
    (a) => !(a.email === email && (!brandSlug || a.brandSlug === brandSlug)),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
