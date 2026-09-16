/**
 * 🔒 Offline Data Vault & Storage Manager for React Native
 * Handles in-memory caching + AsyncStorage synchronization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VaultState {
  tenantId: string;
  products: any[];
  customers: any[];
  sales: any[];
  expenses: any[];
  dealers: any[];
  staff: any[];
  updatedAt: string;
}

// In-memory instant cache
let memoryVault: Record<string, VaultState> = {};

const STORAGE_KEY_PREFIX = 'shohoj_mobile_vault_';

export function getLocalVaultData(tenantId: string): VaultState {
  const tid = tenantId || 'tenant-1';
  if (!memoryVault[tid]) {
    memoryVault[tid] = {
      tenantId: tid,
      products: [],
      customers: [],
      sales: [],
      expenses: [],
      dealers: [],
      staff: [],
      updatedAt: new Date().toISOString()
    };
  }
  return memoryVault[tid];
}

export function saveLocalVaultSnapshot(tenantId: string, partialData: Partial<VaultState>) {
  const tid = tenantId || 'tenant-1';
  const current = getLocalVaultData(tid);
  const updated: VaultState = {
    ...current,
    ...partialData,
    updatedAt: new Date().toISOString()
  };
  memoryVault[tid] = updated;

  // Asynchronously persist to device storage
  AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${tid}`, JSON.stringify(updated)).catch(() => {});
}

export async function hydrateLocalVault(tenantId: string): Promise<VaultState> {
  const tid = tenantId || 'tenant-1';
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${tid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryVault[tid] = { ...parsed, tenantId: tid };
      return memoryVault[tid];
    }
  } catch (e) {}
  return getLocalVaultData(tid);
}
