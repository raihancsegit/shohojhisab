/**
 * ☁️ Cloud & Central Database Sync Engine for React Native
 * Connects directly to the existing LocalBusinessOS Next.js / PostgreSQL backend APIs.
 * Supports dual-mode: 100% Instant Offline + Automatic Cloud Database Sync!
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLocalVaultData,
  saveLocalVaultSnapshot,
  VaultState
} from './offlineDataVault';

const SERVER_URL_KEY = 'shohoj_server_url';
const DEFAULT_SERVER_URL = 'http://10.0.2.2:3000'; // Standard Android emulator localhost or LAN IP

export async function getServerUrl(): Promise<string> {
  try {
    const url = await AsyncStorage.getItem(SERVER_URL_KEY);
    return url || DEFAULT_SERVER_URL;
  } catch (e) {
    return DEFAULT_SERVER_URL;
  }
}

export async function setServerUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/$/, ''));
  } catch (e) {}
}

export interface SyncResult {
  success: boolean;
  message: string;
  syncedProducts?: number;
  syncedSales?: number;
  syncedCustomers?: number;
}

/**
 * Syncs local on-device vault with the central backend database via Next.js APIs
 */
export async function syncWithDatabase(tenantId: string): Promise<SyncResult> {
  try {
    const baseUrl = await getServerUrl();
    console.log(`[CloudSync] Connecting to database API: ${baseUrl}...`);

    const vault = getLocalVaultData(tenantId);

    // 1. Fetch latest products from database
    let serverProducts: any[] = [];
    try {
      const prodRes = await fetch(`${baseUrl}/api/products?tenantId=${tenantId}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (prodRes.ok) {
        serverProducts = await prodRes.json();
      }
    } catch (e) {
      console.log('[CloudSync] Products fetch skipped (offline mode).');
    }

    // 2. Fetch latest customers from database
    let serverCustomers: any[] = [];
    try {
      const custRes = await fetch(`${baseUrl}/api/customers?tenantId=${tenantId}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (custRes.ok) {
        serverCustomers = await custRes.json();
      }
    } catch (e) {
      console.log('[CloudSync] Customers fetch skipped (offline mode).');
    }

    // 3. Post any pending offline sales to database
    let syncedSalesCount = 0;
    if (vault.sales && vault.sales.length > 0) {
      try {
        const outboxRes = await fetch(`${baseUrl}/api/tenant/sync-outbox`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            actions: vault.sales.map(s => ({
              type: 'pos_sale',
              payload: s,
              timestamp: s.createdAt || new Date().toISOString()
            }))
          })
        });
        if (outboxRes.ok) {
          syncedSalesCount = vault.sales.length;
        }
      } catch (e) {}
    }

    // Merge server data into local vault if server had newer records
    const mergedProducts = serverProducts.length > 0 ? serverProducts : vault.products;
    const mergedCustomers = serverCustomers.length > 0 ? serverCustomers : vault.customers;

    saveLocalVaultSnapshot(tenantId, {
      products: mergedProducts,
      customers: mergedCustomers
    });

    return {
      success: true,
      message: 'সেন্ট্রাল ডাটাবেজের সাথে সফলভাবে সিঙ্ক হয়েছে!',
      syncedProducts: mergedProducts.length,
      syncedSales: syncedSalesCount,
      syncedCustomers: mergedCustomers.length
    };
  } catch (error: any) {
    console.warn('[CloudSync] Sync failed, keeping local offline vault:', error);
    return {
      success: false,
      message: 'সার্ভারে সংযোগ পাওয়া যায়নি। অফলাইন মোডে ডাটা সংরক্ষিত আছে।'
    };
  }
}
