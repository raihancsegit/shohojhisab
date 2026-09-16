/**
 * ☁️ Central Database & Cloud Sync Engine for ShohojHisab Mobile
 * Connects directly to the Fastify / SQLite backend database API (:4005).
 * Fully dual-mode: 100% Instant Offline + Live Automatic Database Sync!
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLocalVaultData,
  saveLocalVaultSnapshot,
  ProductItem,
  CustomerItem,
  SaleRecord
} from './offlineDataVault';

const SERVER_URL_KEY = 'shohoj_server_url';
export const DEFAULT_CANDIDATE_URLS = [
  'http://192.168.0.100:4005', // Direct Local Wi-Fi LAN IP
  'http://localhost:4005',     // Localhost / Web proxy
  'http://10.0.2.2:4005'       // Android Emulator host loopback
];

let cachedWorkingUrl: string | null = null;

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/$/, '');
    }
  } catch (e) {}

  if (cachedWorkingUrl) {
    return cachedWorkingUrl;
  }

  // Probe candidates with 1.2s timeout
  for (const candidate of DEFAULT_CANDIDATE_URLS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${candidate}/api/products`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      clearTimeout(timeout);
      if (res.ok || res.status < 500) {
        cachedWorkingUrl = candidate;
        return candidate;
      }
    } catch (e) {}
  }

  return DEFAULT_CANDIDATE_URLS[0];
}

export async function setServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/$/, '');
  cachedWorkingUrl = clean;
  try {
    await AsyncStorage.setItem(SERVER_URL_KEY, clean);
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
 * 📦 Fetch live products from backend database
 */
export async function fetchProductsFromApi(tenantId: string): Promise<ProductItem[] | null> {
  try {
    const baseUrl = await getServerUrl();
    const res = await fetch(`${baseUrl}/api/products?tenantId=${tenantId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          name: p.bangla_name || p.banglaName || p.name,
          banglaName: p.bangla_name || p.banglaName || p.name,
          category: p.category_id || p.category || 'cat-grocery',
          subCategory: p.sub_category || p.subCategory || 'all',
          price: Number(p.selling_price || p.sellingPrice || p.price || 0),
          costPrice: Number(p.purchase_price || p.purchasePrice || p.costPrice || 0),
          sellingPrice: Number(p.selling_price || p.sellingPrice || p.price || 0),
          purchasePrice: Number(p.purchase_price || p.purchasePrice || p.costPrice || 0),
          stock: Number(p.stock || 0),
          unit: p.unit || 'পিস',
          icon: p.icon || '📦',
          barcode: p.barcode || ''
        }));
      }
    }
  } catch (e) {}
  return null;
}

/**
 * 👥 Fetch live customers from backend database
 */
export async function fetchCustomersFromApi(tenantId: string): Promise<CustomerItem[] | null> {
  try {
    const baseUrl = await getServerUrl();
    const res = await fetch(`${baseUrl}/api/customers?tenantId=${tenantId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          address: c.address || '',
          totalDue: Number(c.total_due || c.totalDue || c.due || 0),
          due: Number(c.total_due || c.totalDue || c.due || 0),
          lastPurchaseDate: c.last_purchase_date || c.lastPurchaseDate || ''
        }));
      }
    }
  } catch (e) {}
  return null;
}

/**
 * 🛒 Post Sale to backend database
 */
export async function postSaleToApi(tenantId: string, saleRecord: SaleRecord): Promise<boolean> {
  try {
    const baseUrl = await getServerUrl();
    const res = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        items: saleRecord.items.map(it => ({
          productId: it.id,
          productName: it.name,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.price,
          totalPrice: it.total,
          unit: it.unit
        })),
        subtotal: saleRecord.subtotal,
        discount: saleRecord.discount,
        total: saleRecord.total,
        totalAmount: saleRecord.total,
        paidAmount: saleRecord.paidAmount,
        dueAmount: saleRecord.dueAmount,
        paymentMethod: saleRecord.paymentMethod,
        customerId: saleRecord.customerId,
        customerName: saleRecord.customerName,
        cashier: 'মোবাইল অ্যাপ'
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 🔄 Full bi-directional sync with central backend database
 */
export async function syncWithDatabase(tenantId: string): Promise<SyncResult> {
  try {
    const baseUrl = await getServerUrl();
    console.log(`[CloudSync] Syncing with database at: ${baseUrl}...`);

    const vault = getLocalVaultData(tenantId);

    // 1. Fetch live products and customers in parallel
    const [serverProducts, serverCustomers] = await Promise.all([
      fetchProductsFromApi(tenantId),
      fetchCustomersFromApi(tenantId)
    ]);

    // 2. Post offline pending sales
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

    // Merge server data into local vault
    const mergedProducts = serverProducts && serverProducts.length > 0 ? serverProducts : vault.products;
    const mergedCustomers = serverCustomers && serverCustomers.length > 0 ? serverCustomers : vault.customers;

    saveLocalVaultSnapshot(tenantId, {
      products: mergedProducts,
      customers: mergedCustomers
    });

    return {
      success: true,
      message: 'সেন্ট্রাল ডাটাবেজের সাথে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে!',
      syncedProducts: mergedProducts.length,
      syncedSales: syncedSalesCount,
      syncedCustomers: mergedCustomers.length
    };
  } catch (error: any) {
    console.warn('[CloudSync] Sync fallback to local vault:', error);
    return {
      success: false,
      message: 'সার্ভারে সংযোগ পাওয়া যায়নি। অফলাইন মোডে ডাটা সুরক্ষিত আছে।'
    };
  }
}
