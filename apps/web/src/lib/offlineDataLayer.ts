'use client';

import { getVaultData, saveVaultSnapshot, VaultPayload } from './dataVault';

export interface OfflineAction {
  id: string;
  type: 'create_sale' | 'pos_sale' | 'add_customer_due' | 'add_expense' | 'add_product' | 'update_product' | 'due_payment';
  payload: any;
  timestamp: string;
}

const OUTBOX_KEY = 'shohoj_offline_outbox';

/**
 * Get queued offline actions from LocalStorage
 */
export function getOfflineOutbox(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Queue an action to offline outbox
 */
export function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
  if (typeof window === 'undefined') return;
  try {
    const list = getOfflineOutbox();
    const item: OfflineAction = {
      id: action.id || `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: action.type,
      payload: action.payload,
      timestamp: action.timestamp || new Date().toISOString()
    };
    list.push(item);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('offline-outbox-changed', { detail: { count: list.length } }));
  } catch (e) {
    console.warn('[OfflineData] Failed to queue outbox item', e);
  }
}

/**
 * Clear or remove processed items from outbox
 */
export function clearOfflineOutbox() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OUTBOX_KEY);
    window.dispatchEvent(new CustomEvent('offline-outbox-changed', { detail: { count: 0 } }));
  } catch (e) {}
}

let isSyncing = false;

/**
 * Synchronize all pending offline outbox actions to the backend server
 */
export async function syncOfflineOutbox(tenantId: string): Promise<{ success: boolean; synced: number }> {
  if (typeof window === 'undefined' || !tenantId || isSyncing) return { success: false, synced: 0 };
  const outbox = getOfflineOutbox();
  if (outbox.length === 0) return { success: true, synced: 0 };

  isSyncing = true;
  try {
    const res = await fetch('/api/tenant/sync-outbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        actions: outbox
      })
    });

    if (res.ok) {
      const data = await res.json();
      clearOfflineOutbox();
      console.log(`[OfflineSync] ✅ Successfully synced ${outbox.length} offline actions to cloud!`);
      window.dispatchEvent(new CustomEvent('offline-sync-success', { detail: data }));
      return { success: true, synced: outbox.length };
    }
  } catch (e) {
    console.warn('[OfflineSync] Server not reachable yet, will retry when online.', e);
  } finally {
    isSyncing = false;
  }
  return { success: false, synced: 0 };
}

/**
 * Smart SWR (Stale-While-Revalidate) Fetch with Instant Local Vault Fallback.
 * Solves the slow first-time load problem by hydrating immediately from cache,
 * while refreshing from network in the background!
 */
export async function smartFetch<T>(
  url: string,
  tenantId: string,
  vaultKey: keyof VaultPayload,
  onFreshData?: (data: T) => void
): Promise<{ data: T | null; isCached: boolean }> {
  const vault = getVaultData(tenantId);
  const cached = vault ? (vault[vaultKey] as unknown as T) : null;

  // Background fetch to refresh data
  const bgFetch = fetch(url)
    .then(async (res) => {
      if (res.ok) {
        const fresh = await res.json();
        // Update vault
        saveVaultSnapshot(tenantId, { [vaultKey]: fresh });
        if (onFreshData) {
          onFreshData(fresh);
        }
        return fresh;
      }
      return null;
    })
    .catch((err) => {
      console.warn(`[smartFetch] Network fetch failed for ${url}, using offline cache.`, err);
      return null;
    });

  if (cached) {
    // Return cached immediately!
    bgFetch.catch(() => {});
    return { data: cached, isCached: true };
  }

  // If no cache, wait for network
  const fresh = await bgFetch;
  return { data: fresh || cached, isCached: false };
}
