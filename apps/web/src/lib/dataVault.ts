'use client';

/**
 * ShohojHisab Data Vault & Auto-Restore Safeguard
 * 
 * Protects store owners from losing data when cloud servers (e.g. Render)
 * spin up new containers and wipe ephemeral SQLite disks on redeployment.
 */

export interface VaultPayload {
  tenantId: string;
  updatedAt: string;
  products?: any[];
  sales?: any[];
  saleItems?: any[];
  customers?: any[];
  expenses?: any[];
}

const VAULT_PREFIX = 'shohoj_vault_';

export function getVaultData(tenantId: string): VaultPayload | null {
  if (typeof window === 'undefined' || !tenantId) return null;
  try {
    const raw = localStorage.getItem(VAULT_PREFIX + tenantId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[Vault] Failed to read vault from localStorage', e);
    return null;
  }
}

function mergeById(existingList: any[] = [], newList: any[] = []): any[] {
  const map = new Map<string, any>();
  for (const item of existingList) {
    if (item && (item.id || item.invoiceNo || item.invoice_no || item.name)) {
      const key = String(item.id || item.invoiceNo || item.invoice_no || item.name);
      map.set(key, item);
    }
  }
  for (const item of newList) {
    if (item && (item.id || item.invoiceNo || item.invoice_no || item.name)) {
      const key = String(item.id || item.invoiceNo || item.invoice_no || item.name);
      map.set(key, { ...(map.get(key) || {}), ...item });
    }
  }
  return Array.from(map.values());
}

export function saveVaultSnapshot(tenantId: string, partial: Partial<VaultPayload>): void {
  if (typeof window === 'undefined' || !tenantId) return;
  try {
    const existing = getVaultData(tenantId) || {
      tenantId,
      updatedAt: new Date().toISOString()
    };

    const updated: VaultPayload = {
      ...existing,
      tenantId,
      updatedAt: new Date().toISOString()
    };

    // Deep merge by primary key (id / invoiceNo / name) so historical sales and records are never lost
    if (partial.products && partial.products.length > 0) {
      updated.products = mergeById(existing.products || [], partial.products);
    }
    if (partial.sales && partial.sales.length > 0) {
      updated.sales = mergeById(existing.sales || [], partial.sales);
    }
    if (partial.saleItems && partial.saleItems.length > 0) {
      updated.saleItems = mergeById(existing.saleItems || [], partial.saleItems);
    }
    if (partial.customers && partial.customers.length > 0) {
      updated.customers = mergeById(existing.customers || [], partial.customers);
    }
    if (partial.expenses && partial.expenses.length > 0) {
      updated.expenses = mergeById(existing.expenses || [], partial.expenses);
    }

    localStorage.setItem(VAULT_PREFIX + tenantId, JSON.stringify(updated));
  } catch (e) {
    console.warn('[Vault] Failed to save vault snapshot', e);
  }
}

let isRestoring = false;

/**
 * Automatically checks if server data was wiped (e.g. 0 products and 0 sales on Render redeploy)
 * while the local browser vault has saved data. If wiped, automatically restores
 * everything to the backend in one atomic transaction!
 */
export async function autoRestoreIfWiped(
  tenantId: string,
  currentProductsCount?: number,
  currentSalesCount?: number,
  onRestoreSuccess?: () => void
): Promise<boolean> {
  if (typeof window === 'undefined' || !tenantId || isRestoring) return false;

  const vault = getVaultData(tenantId);
  if (!vault) return false;

  const vaultHasData = (vault.products && vault.products.length > 0) || (vault.sales && vault.sales.length > 0) || (vault.customers && vault.customers.length > 0);
  if (!vaultHasData) return false;

  let serverIsEmpty = false;
  if (currentProductsCount === 0 && currentSalesCount === 0) {
    serverIsEmpty = true;
  } else if (currentProductsCount === undefined && currentSalesCount === undefined) {
    // Check server status directly
    try {
      const pRes = await fetch(`/api/products?tenantId=${tenantId}`);
      const prods = pRes.ok ? await pRes.json() : [];
      const sRes = await fetch(`/api/sales?tenantId=${tenantId}`);
      const sales = sRes.ok ? await sRes.json() : [];
      if ((!Array.isArray(prods) || prods.length === 0) && (!Array.isArray(sales) || sales.length === 0)) {
        serverIsEmpty = true;
      }
    } catch (err) {
      serverIsEmpty = false;
    }
  }

  if (vaultHasData && serverIsEmpty) {
    console.log('[Vault] Server redeploy wipe detected! Auto-restoring from browser vault...');
    isRestoring = true;

    try {
      const res = await fetch('/api/tenant/vault-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          data: vault
        })
      });

      if (res.ok) {
        console.log('[Vault] ✅ Auto-restore completed successfully!');
        if (onRestoreSuccess) {
          onRestoreSuccess();
        }
        window.dispatchEvent(new CustomEvent('vault-restored', { detail: { tenantId } }));
        return true;
      }
    } catch (e) {
      console.error('[Vault] Auto-restore network error', e);
    } finally {
      isRestoring = false;
    }
  }

  return false;
}

/**
 * 1-Click Download JSON Backup
 */
export function downloadBackupFile(tenantId: string, shopName = 'dokan') {
  const vault = getVaultData(tenantId);
  if (!vault) {
    alert('কোনো সংরক্ষিত ডাটা পাওয়া যায়নি!');
    return;
  }

  const blob = new Blob([JSON.stringify(vault, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `${shopName.replace(/\s+/g, '_')}_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
