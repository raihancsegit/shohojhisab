import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

export interface AgentExecutionResult {
  success: boolean;
  action: string;
  speech: string;
  reply: string;
  navigateTo?: string;
  actionLink?: { text: string; href: string };
  data?: any;
  undoAvailable?: boolean;
  actionId?: string;
}

export interface LastActionEntry {
  actionId: string;
  tenantId: string;
  timestamp: number;
  type: 'due_given' | 'due_paid' | 'sale' | 'expense' | 'restock' | 'multi_action' | 'invoice_commit';
  customerId?: string;
  customerName?: string;
  previousDue?: number;
  newDue?: number;
  saleId?: string;
  saleIds?: string[];
  expenseId?: string;
  amount: number;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    stockDeduction: number;
    unit?: string;
    lineTotal?: number;
  }>;
}

// In-memory store for 1-tap undo capability (2-minute window)
export const lastActionsByTenant = new Map<string, LastActionEntry>();

// In-memory session memory for multi-turn contextual follow-ups (3-minute window)
export interface TenantSessionContext {
  lastCustomerId?: string;
  lastCustomerName?: string;
  lastProductId?: string;
  lastProductName?: string;
  lastActionType?: string;
  lastTimestamp: number;
}

export const sessionContextByTenant = new Map<string, TenantSessionContext>();

export function getSessionContext(tenantId: string): TenantSessionContext | null {
  const ctx = sessionContextByTenant.get(tenantId);
  if (!ctx) return null;
  if (Date.now() - ctx.lastTimestamp > 180000) {
    sessionContextByTenant.delete(tenantId);
    return null;
  }
  return ctx;
}

export function updateSessionContext(tenantId: string, updates: Partial<TenantSessionContext>) {
  const existing = getSessionContext(tenantId) || { lastTimestamp: Date.now() };
  sessionContextByTenant.set(tenantId, {
    ...existing,
    ...updates,
    lastTimestamp: Date.now()
  });
}

export function recordLastAction(tenantId: string, entry: LastActionEntry) {
  lastActionsByTenant.set(tenantId, entry);
}

export function getUndoAction(tenantId: string): LastActionEntry | null {
  const entry = lastActionsByTenant.get(tenantId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > 120000) {
    lastActionsByTenant.delete(tenantId);
    return null;
  }
  return entry;
}

export function undoLastAction(db: Database.Database, tenantId: string): { success: boolean; message: string; data?: any } {
  const entry = getUndoAction(tenantId);
  if (!entry) {
    return { success: false, message: 'বাতিল করার মতো কোনো সাম্প্রতিক অ্যাকশন পাওয়া যায়নি বা সময় উত্তীর্ণ হয়েছে।' };
  }

  try {
    db.transaction(() => {
      // 1. Revert customer due if applicable
      if (entry.customerId && entry.previousDue !== undefined) {
        db.prepare('UPDATE customers SET total_due = ? WHERE id = ?').run(entry.previousDue, entry.customerId);
      }

      // 2. Revert deducted stock
      if (entry.items && entry.items.length > 0) {
        const restockStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        for (const it of entry.items) {
          if (it.productId && it.stockDeduction !== 0) {
            restockStmt.run(it.stockDeduction, it.productId);
          }
        }
      }

      // 3. Remove sales, sale_items, and stock_logs for this sale
      if (entry.saleId) {
        db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(entry.saleId);
        db.prepare('DELETE FROM sales WHERE id = ?').run(entry.saleId);
        db.prepare('DELETE FROM stock_logs WHERE source_ref LIKE ?').run(`%${entry.saleId.slice(-5)}%`);
      }

      if (entry.saleIds && entry.saleIds.length > 0) {
        for (const sid of entry.saleIds) {
          db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(sid);
          db.prepare('DELETE FROM sales WHERE id = ?').run(sid);
          db.prepare('DELETE FROM stock_logs WHERE source_ref LIKE ?').run(`%${sid.slice(-5)}%`);
        }
      }

      // 4. Remove expense if applicable
      if (entry.expenseId) {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(entry.expenseId);
      }
    })();

    lastActionsByTenant.delete(tenantId);
    return {
      success: true,
      message: `✓ ${entry.customerName ? `${entry.customerName}-এর ` : ''}এন্ট্রিটি বাতিল করা হয়েছে এবং পণ্যের স্টক পূর্বাবস্থায় ফিরিয়ে আনা হয়েছে।`,
      data: { revertedActionId: entry.actionId, customerId: entry.customerId, previousDue: entry.previousDue }
    };
  } catch (err: any) {
    console.error('[AI Agent] Undo failed:', err);
    return { success: false, message: 'অ্যাকশন বাতিল করতে সমস্যা হয়েছে: ' + (err.message || 'ডাটাবেজ এরর') };
  }
}

/**
 * Executes a verified stock sale or customer due addition with full database atomic integrity
 */
export function executeStockSaleOrDue(
  db: Database.Database,
  tenantId: string,
  params: {
    customerId?: string;
    customerName?: string;
    isDue: boolean;
    items: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unit?: string;
      unitPrice?: number;
      lineTotal?: number;
    }>;
    explicitTotalAmount?: number;
    note?: string;
  }
): AgentExecutionResult {
  const now = new Date().toISOString();
  const saleId = 'sale-' + uuidv4().slice(0, 8);
  const invoiceNo = (params.isDue ? 'BK-' : 'MEMO-') + Date.now().toString().slice(-5);

  let customer: any = null;
  if (params.customerId) {
    customer = db.prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ?').get(params.customerId, tenantId) as any;
  } else if (params.customerName) {
    customer = db.prepare("SELECT * FROM customers WHERE tenant_id = ? AND (name LIKE ? OR ? LIKE '%' || name || '%') LIMIT 1")
      .get(tenantId, `%${params.customerName}%`, params.customerName) as any;
  }

  // If customer doesn't exist and this is a due sale, create new customer automatically
  if (!customer && params.isDue && params.customerName && params.customerName.trim().length >= 2) {
    const newCustId = 'cust-' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO customers (id, tenant_id, name, phone, address, total_due, credit_limit, created_at)
      VALUES (?, ?, ?, ?, ?, 0, 5000, ?)
    `).run(newCustId, tenantId, params.customerName.trim(), '01XXXXXXXXX', 'দোকানের খরিদ্দার', now);
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(newCustId) as any;
  }

  const allProducts = db.prepare('SELECT * FROM products WHERE tenant_id = ?').all(tenantId) as any[];

  if (!params.items || params.items.length === 0) {
    return {
      success: false,
      action: 'no_items_specified',
      speech: '⚠️ বিক্রির জন্য কোনো পণ্য উল্লেখ করা হয়নি। কিসের বিক্রি তা মুখে বলুন (যেমন: ২ কেজি চিনি বিক্রি)।',
      reply: '⚠️ **পণ্যের নাম প্রয়োজন:** বিক্রির জন্য কোনো পণ্য পাওয়া যায়নি।'
    };
  }

  // 🚨 STRICT INVENTORY ENFORCEMENT: Validate EVERY item exists in stock and has sufficient quantity
  for (const rawItem of params.items) {
    const qty = Number(rawItem.quantity) || 1;
    let matchedProd: any = null;

    if (rawItem.productId) {
      matchedProd = allProducts.find(p => p.id === rawItem.productId);
    }
    if (!matchedProd && rawItem.productName) {
      const cleanName = rawItem.productName.toLowerCase().trim();
      matchedProd = allProducts.find(p => {
        const bn = (p.bangla_name || '').toLowerCase();
        const nm = (p.name || '').toLowerCase();
        const gen = (p.generic_name || '').toLowerCase();
        return bn.includes(cleanName) || cleanName.includes(bn) || nm.includes(cleanName) || cleanName.includes(nm) || (gen && gen.includes(cleanName));
      });
    }

    // Rule 1: Product MUST exist in store inventory
    if (!matchedProd) {
      const missingName = rawItem.productName || 'পণ্য';
      return {
        success: false,
        action: 'product_not_in_stock',
        speech: `⚠️ "${missingName}" আপনার দোকানের পণ্য তালিকায় বা স্টকে নেই। স্টক বহির্ভূত কোনো পণ্য বিক্রি করা যাবে না। দয়া করে পণ্যটি আগে তালিকায় যোগ করুন।`,
        reply: `⚠️ **পণ্যটি স্টকে নেই:** "${missingName}" আপনার পণ্য তালিকায় পাওয়া যায়নি।\n\n*দোকানের স্টক বহির্ভূত কোনো পণ্য বিক্রি বা বাকি যোগ করা যাবে না। পণ্যটি আগে স্টকে যোগ করুন।*`,
        navigateTo: '/products',
        actionLink: { text: 'নতুন পণ্য যোগ করুন →', href: '/products' }
      };
    }

    const currentStock = Number(matchedProd.stock) || 0;
    const pName = matchedProd.bangla_name || matchedProd.name;
    const pUnit = matchedProd.unit || 'টি';

    // Rule 2: Product MUST NOT be out of stock (stock > 0)
    if (currentStock <= 0) {
      return {
        success: false,
        action: 'out_of_stock',
        speech: `⚠️ "${pName}" এর বর্তমান স্টক শূন্য (০ ${pUnit})। স্টকে মাল না থাকায় বিক্রি করা সম্ভব নয়।`,
        reply: `⚠️ **স্টক শূন্য (Out of Stock):** **${pName}** এর বর্তমান মজুদ ০ ${pUnit}।\n\n*স্টক রিস্টক না করে বিক্রি করা যাবে না।*`,
        navigateTo: '/stock',
        actionLink: { text: 'স্টক রিস্টক করুন →', href: `/stock?search=${encodeURIComponent(pName)}` }
      };
    }

    // Calculate actual stock deduction based on units
    let stockDeduction = qty;
    const baseUnit = (matchedProd.unit || '').trim().toLowerCase();
    const subUnit = (matchedProd.sub_unit || '').trim().toLowerCase();
    const spokenUnit = (rawItem.unit || baseUnit).trim().toLowerCase();
    const ratio = Number(matchedProd.conversion_ratio) || 1;

    if (subUnit && (spokenUnit.includes(subUnit) || subUnit.includes(spokenUnit))) {
      stockDeduction = ratio > 0 ? (qty / ratio) : qty;
    } else if (spokenUnit === 'গ্রাম' && (baseUnit.includes('কেজি') || subUnit.includes('কেজি'))) {
      stockDeduction = qty / 1000;
    }

    // Rule 3: Requested quantity MUST NOT exceed available stock
    if (stockDeduction > currentStock) {
      return {
        success: false,
        action: 'insufficient_stock',
        speech: `⚠️ "${pName}" এর পর্যাপ্ত স্টক নেই। আপনার দোকানে মজুদ আছে মাত্র ${currentStock} ${pUnit}, কিন্তু বিক্রি করতে চেয়েছেন ${qty} ${rawItem.unit || pUnit}।`,
        reply: `⚠️ **পর্যাপ্ত স্টক নেই:** **${pName}**\n• দোকানে মজুদ: **${currentStock} ${pUnit}**\n• বিক্রির চাওয়া হয়েছে: **${qty} ${rawItem.unit || pUnit}**\n\n*মজুদের চেয়ে অতিরিক্ত বিক্রি করার অনুমতি নেই।*`,
        navigateTo: '/stock',
        actionLink: { text: 'স্টক দেখুন →', href: `/stock?search=${encodeURIComponent(pName)}` }
      };
    }
  }

  const processedItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
    stockDeduction: number;
    currentStock: number;
    newStock: number;
  }> = [];

  let calculatedTotal = 0;

  for (const rawItem of params.items) {
    const qty = Number(rawItem.quantity) || 1;
    let matchedProd: any = null;

    if (rawItem.productId) {
      matchedProd = allProducts.find(p => p.id === rawItem.productId);
    }
    if (!matchedProd && rawItem.productName) {
      const cleanName = rawItem.productName.toLowerCase().trim();
      matchedProd = allProducts.find(p => {
        const bn = (p.bangla_name || '').toLowerCase();
        const nm = (p.name || '').toLowerCase();
        const gen = (p.generic_name || '').toLowerCase();
        return bn.includes(cleanName) || cleanName.includes(bn) || nm.includes(cleanName) || cleanName.includes(nm) || (gen && gen.includes(cleanName));
      });
    }

    let unit = rawItem.unit || (matchedProd?.unit) || 'পিস';
    let unitPrice = Number(rawItem.unitPrice) || Number(matchedProd?.selling_price) || 0;
    let stockDeduction = qty;

    if (matchedProd) {
      const baseSellingPrice = Number(matchedProd.selling_price) || 0;
      const ratio = Number(matchedProd.conversion_ratio) || 1;
      const baseUnit = (matchedProd.unit || '').trim().toLowerCase();
      const subUnit = (matchedProd.sub_unit || '').trim().toLowerCase();
      const spokenUnit = unit.trim().toLowerCase();

      if (subUnit && (spokenUnit.includes(subUnit) || subUnit.includes(spokenUnit))) {
        unitPrice = ratio > 0 ? (baseSellingPrice / ratio) : baseSellingPrice;
        stockDeduction = ratio > 0 ? (qty / ratio) : qty;
      } else if (spokenUnit === 'গ্রাম' && (baseUnit.includes('কেজি') || subUnit.includes('কেজি'))) {
        unitPrice = baseSellingPrice / 1000;
        stockDeduction = qty / 1000;
      } else {
        unitPrice = baseSellingPrice;
        stockDeduction = qty;
      }
    }

    const lineTotal = Number(rawItem.lineTotal) || Math.round(qty * unitPrice);
    calculatedTotal += lineTotal;

    const currentStock = Number(matchedProd?.stock) || 0;
    const newStock = Math.max(0, parseFloat((currentStock - stockDeduction).toFixed(3)));

    processedItems.push({
      productId: matchedProd.id,
      productName: matchedProd.bangla_name || matchedProd.name,
      quantity: qty,
      unit,
      unitPrice: Math.round(unitPrice),
      lineTotal,
      stockDeduction,
      currentStock,
      newStock
    });
  }

  const finalTotalAmount = params.explicitTotalAmount && params.explicitTotalAmount > 0
    ? params.explicitTotalAmount
    : (calculatedTotal > 0 ? calculatedTotal : 100);

  const previousDue = customer ? Number(customer.total_due || 0) : 0;
  const newDue = params.isDue && customer ? (previousDue + finalTotalAmount) : previousDue;
  const creditLimit = customer ? Number(customer.credit_limit || 5000) : 5000;
  const isCreditLimitExceeded = params.isDue && customer && newDue > creditLimit;

  const summaryList = processedItems.length > 0
    ? processedItems.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')
    : (params.note || 'পণ্য সামগ্রী');

  // Atomic database execution
  db.transaction(() => {
    // 1. Update customer due if credit
    if (customer && params.isDue) {
      db.prepare('UPDATE customers SET total_due = ? WHERE id = ?').run(newDue, customer.id);
    }

    // 2. Insert into sales
    db.prepare(`
      INSERT INTO sales (id, tenant_id, invoice_no, subtotal, discount, total_amount, paid_amount, due_amount, profit_amount, payment_method, customer_id, customer_name, cashier, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      saleId,
      tenantId,
      invoiceNo,
      finalTotalAmount,
      0,
      finalTotalAmount,
      params.isDue ? 0 : finalTotalAmount,
      params.isDue ? finalTotalAmount : 0,
      Math.round(finalTotalAmount * 0.15),
      params.isDue ? 'due' : 'cash',
      customer ? customer.id : null,
      customer ? customer.name : 'খুচরা কাস্টমার',
      'হিসাব সহকারী (ভয়েস)',
      now
    );

    // 3. Process items & deduct inventory stock
    for (const it of processedItems) {
      db.prepare(`
        INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, purchase_price, selling_price, total_price, profit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'sitem-' + uuidv4().slice(0, 8),
        saleId,
        it.productId,
        it.productName,
        it.quantity,
        Math.round(it.unitPrice * 0.8),
        it.unitPrice,
        it.lineTotal,
        Math.round(it.lineTotal * 0.2)
      );

      if (it.productId) {
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(it.newStock, it.productId);

        const logId = 'stklog-' + uuidv4().slice(0, 8);
        db.prepare(`
          INSERT INTO stock_logs (id, tenant_id, product_id, product_name, type, quantity, unit, base_quantity, unit_price, source_ref, note, created_at)
          VALUES (?, ?, ?, ?, 'sale', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId,
          tenantId,
          it.productId,
          it.productName,
          it.stockDeduction,
          it.unit,
          it.stockDeduction,
          it.lineTotal,
          invoiceNo,
          params.isDue ? 'ভয়েস বাকি বিক্রি' : 'ভয়েস ক্যাশ বিক্রি',
          now
        );
      }
    }
  })();

  const actionId = 'act-' + uuidv4().slice(0, 8);
  lastActionsByTenant.set(tenantId, {
    actionId,
    tenantId,
    timestamp: Date.now(),
    type: params.isDue ? 'due_given' : 'sale',
    customerId: customer?.id,
    customerName: customer?.name,
    previousDue,
    newDue,
    saleId,
    amount: finalTotalAmount,
    items: processedItems
  });

  // Remember context for follow-up turns
  if (customer) {
    updateSessionContext(tenantId, { lastCustomerId: customer.id, lastCustomerName: customer.name });
  }
  if (processedItems.length > 0 && processedItems[0].productId) {
    updateSessionContext(tenantId, { lastProductId: processedItems[0].productId, lastProductName: processedItems[0].productName });
  }

  const stockSummaryList = processedItems.map(i => `${i.productName} (অবশিষ্ট: ${i.newStock} ${i.unit})`).join(', ');

  const creditWarning = isCreditLimitExceeded
    ? ` ⚠️ সতর্কবার্তা: ${customer.name}-এর বাকি লিমিট (৳${creditLimit.toLocaleString('bn-BD')}) পার হয়ে গেছে!`
    : '';

  const speech = params.isDue
    ? `✓ ${customer ? customer.name : 'কাস্টমার'} এর বাকি খাতায় ৳${finalTotalAmount} টাকা (${summaryList}) যোগ হয়েছে। অবশিষ্ট স্টক: ${stockSummaryList}।${creditWarning}`
    : `✓ ক্যাশ বিক্রি ৳${finalTotalAmount} টাকা সম্পন্ন! স্টক থেকে ${summaryList} কাটা হয়েছে। অবশিষ্ট স্টক: ${stockSummaryList}।`;

  const reply = `✅ **${params.isDue ? 'বাকি এন্ট্রি ও স্টক আপডেট সম্পন্ন!' : 'ক্যাশ বিক্রয় সম্পন্ন!'}**\n` +
    (customer ? `• কাস্টমার: **${customer.name}**\n` : '') +
    `• মোট টাকা: **৳${finalTotalAmount.toLocaleString('en-US')}**\n` +
    (params.isDue && customer ? `• বর্তমান মোট বকেয়া: **৳${newDue.toLocaleString('en-US')}** ${isCreditLimitExceeded ? '⚠️ *(লিমিট অতিক্রান্ত)*' : ''}\n` : '') +
    `• বিক্রিত পণ্য: **${summaryList}**\n` +
    `• 📦 **দোকানে বাকি মজুদ (Stock):**\n` +
    processedItems.map(i => `   └ ${i.productName}: **${i.newStock} ${i.unit}**`).join('\n');

  return {
    success: true,
    action: params.isDue ? 'due_given' : 'sale',
    speech,
    reply,
    navigateTo: params.isDue ? '/khata' : '/pos',
    actionLink: { text: params.isDue ? 'খাতায় দেখুন →' : 'রসিদ দেখুন →', href: params.isDue ? '/khata' : '/pos' },
    undoAvailable: true,
    actionId,
    data: {
      actionId,
      customerName: customer?.name,
      amount: finalTotalAmount,
      previousDue,
      newDue,
      invoiceNo,
      items: processedItems
    }
  };
}

/**
 * Restock / Stock-In Execution via Voice Agent
 */
export function executeStockRestock(
  db: Database.Database,
  tenantId: string,
  params: {
    productId?: string;
    productName: string;
    quantity: number;
    unit?: string;
  }
): AgentExecutionResult {
  const now = new Date().toISOString();
  const allProducts = db.prepare('SELECT * FROM products WHERE tenant_id = ?').all(tenantId) as any[];
  let matchedProd: any = null;

  if (params.productId) {
    matchedProd = allProducts.find(p => p.id === params.productId);
  }
  if (!matchedProd && params.productName) {
    const clean = params.productName.toLowerCase().trim();
    matchedProd = allProducts.find(p => {
      const bn = (p.bangla_name || '').toLowerCase();
      const nm = (p.name || '').toLowerCase();
      return bn.includes(clean) || clean.includes(bn) || nm.includes(clean) || clean.includes(nm);
    });
  }

  if (!matchedProd) {
    return {
      success: false,
      action: 'product_not_found',
      speech: `⚠️ "${params.productName}" নামের কোনো পণ্য তালিকায় পাওয়া যায়নি। পণ্যটি প্রথমে তালিকায় যোগ করুন।`,
      reply: `⚠️ **পণ্য পাওয়া যায়নি:** "${params.productName}" তালিকায় নেই।`,
      actionLink: { text: 'নতুন পণ্য যোগ করুন →', href: '/products' }
    };
  }

  const qty = Number(params.quantity) || 1;
  const currentStock = Number(matchedProd.stock) || 0;
  const newStock = Math.max(0, parseFloat((currentStock + qty).toFixed(3)));
  const unit = params.unit || matchedProd.unit || 'টি';
  const pName = matchedProd.bangla_name || matchedProd.name;

  db.transaction(() => {
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, matchedProd.id);
    const logId = 'stklog-' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO stock_logs (id, tenant_id, product_id, product_name, type, quantity, unit, base_quantity, unit_price, source_ref, note, created_at)
      VALUES (?, ?, ?, ?, 'stock_in', ?, ?, ?, ?, 'ভয়েস স্টক ইন', 'ভয়েস সহকারী দ্বারা নতুন মাল যোগ', ?)
    `).run(logId, tenantId, matchedProd.id, pName, qty, unit, qty, matchedProd.purchase_price || 0, now);
  })();

  const actionId = 'act-' + uuidv4().slice(0, 8);
  lastActionsByTenant.set(tenantId, {
    actionId,
    tenantId,
    timestamp: Date.now(),
    type: 'restock',
    amount: 0,
    items: [{
      productId: matchedProd.id,
      productName: pName,
      quantity: -qty, // negative deduction so undo reverts correctly
      stockDeduction: -qty,
      unit
    }]
  });

  updateSessionContext(tenantId, { lastProductId: matchedProd.id, lastProductName: pName });

  return {
    success: true,
    action: 'restock',
    speech: `✓ ${qty} ${unit} ${pName} সফলভাবে স্টকে যুক্ত হয়েছে। নতুন মোট মজুদ: ${newStock} ${unit}।`,
    reply: `✅ **স্টক ইন সম্পন্ন!**\n• পণ্য: **${pName}**\n• নতুন যোগ: **+${qty} ${unit}**\n• বর্তমান মোট মজুদ: **${newStock} ${unit}**`,
    navigateTo: '/stock',
    actionLink: { text: 'স্টক খাতা দেখুন →', href: `/stock?search=${encodeURIComponent(pName)}` },
    undoAvailable: true,
    actionId,
    data: { product: matchedProd, addedQty: qty, newStock }
  };
}

/**
 * Live Business Intelligence & Analytics Queries
 */
export function executeBusinessAnalyticsQuery(
  db: Database.Database,
  tenantId: string,
  queryType: 'today_profit' | 'market_due' | 'low_stock' | 'overdue_customers'
): AgentExecutionResult {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  if (queryType === 'today_profit') {
    const todaySales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as totalSales,
             COALESCE(SUM(paid_amount), 0) as cashIn,
             COALESCE(SUM(due_amount), 0) as dueGiven,
             COALESCE(SUM(profit_amount), 0) as grossProfit,
             COUNT(*) as orderCount
      FROM sales
      WHERE tenant_id = ? AND created_at LIKE ? AND payment_method != 'due_payment'
    `).get(tenantId, `${todayStr}%`) as any;

    const todayExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as totalExpense
      FROM expenses
      WHERE tenant_id = ? AND created_at LIKE ?
    `).get(tenantId, `${todayStr}%`) as any;

    const salesTotal = Number(todaySales?.totalSales) || 0;
    const grossProfit = Number(todaySales?.grossProfit) || Math.round(salesTotal * 0.18);
    const expensesTotal = Number(todayExpenses?.totalExpense) || 0;
    const netProfit = grossProfit - expensesTotal;

    return {
      success: true,
      action: 'today_profit',
      speech: `আজকের হিসাব: মোট বিক্রি ৳${salesTotal.toLocaleString('bn-BD')} টাকা, খরচ ৳${expensesTotal.toLocaleString('bn-BD')} টাকা এবং আপনার আনুমানিক নেট লাভ ৳${netProfit.toLocaleString('bn-BD')} টাকা।`,
      reply: `📊 **আজকের লাইভ লাভ-ক্ষতি রিপোর্ট (${todayStr}):**\n• মোট বিক্রি: **৳${salesTotal.toLocaleString('en-US')}**\n• নগদ আদায়: **৳${Number(todaySales?.cashIn || 0).toLocaleString('en-US')}**\n• মোট খরচ: **৳${expensesTotal.toLocaleString('en-US')}**\n• মোট মেমো: **${todaySales?.orderCount || 0}টি**\n• 💰 **নেট লাভ:** **৳${netProfit.toLocaleString('en-US')}**`,
      navigateTo: '/reports',
      actionLink: { text: 'সম্পূর্ণ রিপোর্ট দেখুন →', href: '/reports' }
    };
  }

  if (queryType === 'market_due') {
    const dueData = db.prepare(`
      SELECT COALESCE(SUM(total_due), 0) as totalDue, COUNT(*) as custCount
      FROM customers
      WHERE tenant_id = ? AND total_due > 0
    `).get(tenantId) as any;

    const totalDue = Number(dueData?.totalDue) || 0;
    const custCount = Number(dueData?.custCount) || 0;

    return {
      success: true,
      action: 'market_due',
      speech: `বর্তমানে ${custCount} জন খরিদ্দারের কাছে মোট ৳${totalDue.toLocaleString('bn-BD')} টাকা বাকি পাওনা রয়েছে।`,
      reply: `📒 **মার্কেট বকেয়া সামারি:**\n• মোট বাকি খরিদ্দার: **${custCount} জন**\n• মোট বকেয়া পাওনা: **৳${totalDue.toLocaleString('en-US')}**`,
      navigateTo: '/khata',
      actionLink: { text: 'বাকি খাতা দেখুন →', href: '/khata' }
    };
  }

  if (queryType === 'low_stock') {
    const lowProds = db.prepare(`
      SELECT bangla_name, name, stock, unit, low_stock_threshold
      FROM products
      WHERE tenant_id = ? AND stock <= COALESCE(low_stock_threshold, 5)
      ORDER BY stock ASC LIMIT 6
    `).all(tenantId) as any[];

    if (lowProds.length === 0) {
      return {
        success: true,
        action: 'low_stock',
        speech: 'আলহামদুলিল্লাহ! আপনার দোকানে কোনো পণ্যের স্টক সংকট নেই। সব পণ্যের পর্যাপ্ত মজুদ রয়েছে।',
        reply: '✅ **মজুদ স্ট্যাটাস:** সব পণ্যের পর্যাপ্ত স্টক রয়েছে। কোনো মাল শেষ হয়নি।',
        navigateTo: '/stock'
      };
    }

    const listStr = lowProds.map(p => `• ${p.bangla_name || p.name}: **${p.stock} ${p.unit || 'টি'}**`).join('\n');
    const speechList = lowProds.slice(0, 3).map(p => `${p.bangla_name || p.name} (${p.stock} ${p.unit || 'টি'})`).join(', ');

    return {
      success: true,
      action: 'low_stock',
      speech: `সতর্কতা: ${lowProds.length}টি পণ্যের স্টক কমে গেছে। যেমন: ${speechList}।`,
      reply: `⚠️ **কম স্টক সতর্কতা (${lowProds.length}টি পণ্য):**\n${listStr}`,
      navigateTo: '/stock',
      actionLink: { text: 'স্টক রিস্টক করুন →', href: '/stock' }
    };
  }

  if (queryType === 'overdue_customers') {
    const overdueCusts = db.prepare(`
      SELECT name, phone, total_due, promise_date
      FROM customers
      WHERE tenant_id = ? AND total_due > 0 AND promise_date IS NOT NULL AND promise_date != '' AND promise_date <= ?
      ORDER BY total_due DESC LIMIT 5
    `).all(tenantId, todayStr) as any[];

    if (overdueCusts.length === 0) {
      return {
        success: true,
        action: 'overdue_customers',
        speech: 'আজকের তারিখে কোনো খরিদ্দারের বাকি পরিশোধের ওয়াদা অতিক্রান্ত নেই।',
        reply: '✅ **কোনো ওভারডিউ বাকি নেই:** আজকের মধ্যে দেওয়ার কথা ছিল এমন কোনো বকেয়া নেই।',
        navigateTo: '/khata'
      };
    }

    const listStr = overdueCusts.map(c => `• ${c.name}: **৳${c.total_due}** (ওয়াদা: ${c.promise_date})`).join('\n');
    return {
      success: true,
      action: 'overdue_customers',
      speech: `সতর্কতা: ${overdueCusts.length} জন খরিদ্দারের বাকি পরিশোধের তারিখ পার হয়ে গেছে। যেমন: ${overdueCusts[0].name} (৳${overdueCusts[0].total_due})।`,
      reply: `🚨 **ওয়াদা পার হওয়া খরিদ্দার তালিকা (${overdueCusts.length} জন):**\n${listStr}\n\n*উনাদের হোয়াটসঅ্যাপে তাগাদা স্লিপ পাঠাতে পারেন।*`,
      navigateTo: '/khata',
      actionLink: { text: 'খাতায় তাগাদা দিন →', href: '/khata' }
    };
  }

  return {
    success: false,
    action: 'unknown',
    speech: 'দয়া করে স্পষ্ট করে বলুন।',
    reply: 'দয়া করে স্পষ্ট করে বলুন।'
  };
}

/**
 * 🌟 1. Proactive Morning & Evening Business Advisor & Briefing Generator
 */
export function generateProactiveBriefing(
  db: Database.Database,
  tenantId: string,
  mode: 'morning' | 'evening' | 'auto' = 'auto',
  speakerRole?: string
): AgentExecutionResult {
  const tenant = db.prepare('SELECT shop_name, owner_name FROM tenants WHERE id = ?').get(tenantId) as any;
  const shopName = tenant?.shop_name || 'আমাদের দোকান';
  const ownerName = tenant?.owner_name || 'ভাই';

  // Determine current BD time and resolved mode
  const now = new Date();
  const bdHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', hour12: false }).format(now));
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const resolvedMode = mode === 'auto' ? (bdHour < 15 ? 'morning' : 'evening') : mode;

  // Bengali date formatting
  const bdDateDisplay = new Intl.DateTimeFormat('bn-BD', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now);

  if (resolvedMode === 'morning') {
    // 1. Due promises today or overdue
    const duePromises = db.prepare(`
      SELECT name, phone, total_due, promise_date
      FROM customers
      WHERE tenant_id = ? AND total_due > 0 AND promise_date IS NOT NULL AND promise_date != '' AND promise_date <= ?
      ORDER BY total_due DESC LIMIT 4
    `).all(tenantId, todayStr) as any[];

    const totalDueToCollect = duePromises.reduce((acc, c) => acc + (Number(c.total_due) || 0), 0);

    // 2. Critical low-stock products
    const lowProds = db.prepare(`
      SELECT bangla_name, name, stock, unit, low_stock_threshold
      FROM products
      WHERE tenant_id = ? AND stock <= COALESCE(low_stock_threshold, 5)
      ORDER BY stock ASC LIMIT 4
    `).all(tenantId) as any[];

    // 3. Yesterday's performance
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(yesterdayDate);

    const ySales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(profit_amount), 0) as profit, COUNT(*) as count
      FROM sales
      WHERE tenant_id = ? AND created_at LIKE ? AND payment_method != 'due_payment'
    `).get(tenantId, `${yesterdayStr}%`) as any;

    const yExpense = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE tenant_id = ? AND created_at LIKE ?
    `).get(tenantId, `${yesterdayStr}%`) as any;

    const yTotal = Number(ySales?.total) || 0;
    const yNetProfit = Math.max(0, (Number(ySales?.profit) || Math.round(yTotal * 0.18)) - (Number(yExpense?.total) || 0));

    // Bengali Speech
    let speech = `শুভ সকাল ${ownerName}! আজ ${bdDateDisplay}। `;
    if (duePromises.length > 0) {
      const topCustNames = duePromises.slice(0, 2).map(c => c.name).join(' ও ');
      speech += `আজ ${topCustNames} সহ ${duePromises.length} জন খরিদ্দারের বাকি পরিশোধের ওয়াদার তারিখ রয়েছে (মোট বকেয়া ৳${totalDueToCollect.toLocaleString('bn-BD')} টাকা)। `;
    } else {
      speech += `আজ বকেয়া পরিশোধের জরুরি কোনো ওয়াদা ওভারডিউ নেই। `;
    }

    if (lowProds.length > 0) {
      const topLow = lowProds.slice(0, 2).map(p => p.bangla_name || p.name).join(' ও ');
      speech += `দোকানে ${topLow} সহ ${lowProds.length}টি পণ্যের স্টক শেষ হয়ে আসছে। `;
    }

    if (speakerRole !== 'staff' && yTotal > 0) {
      speech += `গতকাল আপনার দোকানে মোট বিক্রি হয়েছিল ৳${yTotal.toLocaleString('bn-BD')} টাকা এবং নেট লাভ হয়েছিল ৳${yNetProfit.toLocaleString('bn-BD')} টাকা। আজকের দিনের বেচাকেনার জন্য শুভকামনা!`;
    } else {
      speech += `আজকের দিনের বেচাকেনার জন্য শুভকামনা!`;
    }

    // Markdown Reply
    let reply = `🌅 **শুভ সকাল! ${shopName} - দৈনিক সকালের ব্রিফিং**\n`;
    reply += `📅 তারিখ: **${bdDateDisplay}**\n\n`;

    if (duePromises.length > 0) {
      reply += `📌 **আজ যাদের বাকি দেওয়ার কথা (${duePromises.length} জন — মোট ৳${totalDueToCollect.toLocaleString('en-US')}):**\n`;
      for (const c of duePromises) {
        reply += `• **${c.name}**: ৳${Number(c.total_due).toLocaleString('en-US')} *(ওয়াদা: ${c.promise_date})*\n`;
      }
      reply += `\n`;
    } else {
      reply += `✅ **আজ ওভারডিউ বাকি নেই**\n\n`;
    }

    if (lowProds.length > 0) {
      reply += `⚠️ **স্টক শেষ হওয়ার সতর্কবার্তা (${lowProds.length}টি পণ্য):**\n`;
      for (const p of lowProds) {
        reply += `• ${p.bangla_name || p.name}: বর্তমান মজুদ **${p.stock} ${p.unit || 'টি'}**\n`;
      }
      reply += `\n`;
    }

    if (speakerRole !== 'staff' && yTotal > 0) {
      reply += `📈 **গতকালের সারাংশ:** বিক্রি: **৳${yTotal.toLocaleString('en-US')}** | মেমো: **${ySales?.count || 0}টি** | নিট লাভ: **৳${yNetProfit.toLocaleString('en-US')}**\n`;
    }

    return {
      success: true,
      action: 'morning_briefing',
      speech,
      reply,
      navigateTo: duePromises.length > 0 ? '/khata' : (lowProds.length > 0 ? '/stock' : '/pos'),
      actionLink: {
        text: duePromises.length > 0 ? 'বাকির খাতা দেখুন →' : 'পণ্য স্টক দেখুন →',
        href: duePromises.length > 0 ? '/khata' : '/stock'
      },
      data: { mode: 'morning', duePromises, lowProds, yesterday: { total: yTotal, profit: yNetProfit } }
    };
  }

  // Evening Closing Audit & Cash Drawer Reconciliation
  const todaySales = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as totalSales,
           COALESCE(SUM(paid_amount), 0) as cashSales,
           COALESCE(SUM(due_amount), 0) as dueGiven,
           COALESCE(SUM(profit_amount), 0) as grossProfit,
           COUNT(*) as orderCount
    FROM sales
    WHERE tenant_id = ? AND created_at LIKE ? AND payment_method != 'due_payment'
  `).get(tenantId, `${todayStr}%`) as any;

  const todayDuePayments = db.prepare(`
    SELECT COALESCE(SUM(paid_amount), 0) as dueCollected
    FROM sales
    WHERE tenant_id = ? AND created_at LIKE ? AND payment_method = 'due_payment'
  `).get(tenantId, `${todayStr}%`) as any;

  const todayExpense = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as totalExpense, COUNT(*) as expCount
    FROM expenses
    WHERE tenant_id = ? AND created_at LIKE ?
  `).get(tenantId, `${todayStr}%`) as any;

  const salesTotal = Number(todaySales?.totalSales) || 0;
  const cashSales = Number(todaySales?.cashSales) || 0;
  const dueCollected = Number(todayDuePayments?.dueCollected) || 0;
  const dueGiven = Number(todaySales?.dueGiven) || 0;
  const expensesTotal = Number(todayExpense?.totalExpense) || 0;

  // Expected Cash in Drawer = Cash from Sales + Due Cash Collected - Cash Expenses
  const expectedCashInDrawer = Math.max(0, (cashSales + dueCollected) - expensesTotal);
  const grossProfit = Number(todaySales?.grossProfit) || Math.round(salesTotal * 0.18);
  const netProfit = grossProfit - expensesTotal;

  let speech = `আজকের দিন সমাপ্তির হিসাব: মোট বেচাকেনা ৳${salesTotal.toLocaleString('bn-BD')} টাকা। `;
  speech += `নগদ আদায় হয়েছে ৳${(cashSales + dueCollected).toLocaleString('bn-BD')} টাকা এবং দোকান খরচ ৳${expensesTotal.toLocaleString('bn-BD')} টাকা। `;
  speech += `হিসাব অনুযায়ী আপনার ক্যাশ বাক্সে ঠিক ৳${expectedCashInDrawer.toLocaleString('bn-BD')} টাকা থাকার কথা। `;
  if (speakerRole !== 'staff') {
    speech += `আজ আপনার আনুমানিক নেট লাভ ৳${netProfit.toLocaleString('bn-BD')} টাকা। মিলিয়ে ড্রয়ার বন্ধ করুন।`;
  } else {
    speech += `ক্যাশ মেমো মিলিয়ে ড্রয়ার বন্ধ করুন। ধন্যবাদ।`;
  }

  let reply = `🌙 **দিনের সমাপ্তি ও ক্যাশ ড্রয়ার অডিট (${bdDateDisplay})**\n\n`;
  reply += `• মোট বিক্রি (মেমো: ${todaySales?.orderCount || 0}টি): **৳${salesTotal.toLocaleString('en-US')}**\n`;
  reply += `• নগদ বিক্রি আদায়: **৳${cashSales.toLocaleString('en-US')}**\n`;
  if (dueCollected > 0) {
    reply += `• বাকি আদায় (Cash In): **+৳${dueCollected.toLocaleString('en-US')}**\n`;
  }
  if (dueGiven > 0) {
    reply += `• নতুন বাকি দেওয়া: **৳${dueGiven.toLocaleString('en-US')}**\n`;
  }
  reply += `• আজকের দোকান খরচ (${todayExpense?.expCount || 0}টি): **-৳${expensesTotal.toLocaleString('en-US')}**\n`;
  reply += `────────────────────────────\n`;
  reply += `💼 **ক্যাশ বাক্সে থাকার কথা (Expected Cash):** **৳${expectedCashInDrawer.toLocaleString('en-US')}**\n`;

  if (speakerRole !== 'staff') {
    reply += `💰 **আজকের নেট লাভ:** **৳${netProfit.toLocaleString('en-US')}**\n`;
  }

  reply += `\n*ক্যাশ ড্রয়ারের নগদ টাকার সাথে মিলিয়ে নিন।*`;

  return {
    success: true,
    action: 'evening_audit',
    speech,
    reply,
    navigateTo: '/reports',
    actionLink: { text: 'সম্পূর্ণ রিপোর্ট দেখুন →', href: '/reports' },
    data: {
      mode: 'evening',
      salesTotal,
      cashSales,
      dueCollected,
      dueGiven,
      expensesTotal,
      expectedCashInDrawer,
      netProfit
    }
  };
}

/**
 * 🌟 2. Autonomous Customer Relationship & Due Recovery (WhatsApp/SMS Tagada Draft)
 */
export function generateDueReminder(
  db: Database.Database,
  tenantId: string,
  customerQuery: string
): AgentExecutionResult {
  const clean = (customerQuery || '').trim();
  let customer = db.prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ?').get(clean, tenantId) as any;

  if (!customer) {
    customer = db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND (name LIKE ? OR phone LIKE ?) LIMIT 1')
      .get(tenantId, `%${clean}%`, `%${clean}%`) as any;
  }

  if (!customer) {
    return {
      success: false,
      action: 'customer_not_found',
      speech: `⚠️ "${clean}" নামের কোনো খরিদ্দার পাওয়া যায়নি। নাম অথবা ফোন নম্বর নিশ্চিত করুন।`,
      reply: `⚠️ **খরিদ্দার পাওয়া যায়নি:** "${clean}" তালিকায় নেই।`,
      navigateTo: '/khata'
    };
  }

  const due = Number(customer.total_due) || 0;
  if (due <= 0) {
    return {
      success: true,
      action: 'no_due',
      speech: `${customer.name}-এর কোনো বকেয়া বাকি নেই। উনার বর্তমান বাকি শূন্য টাকা।`,
      reply: `✅ **বকেয়া নেই:** ${customer.name}-এর কোনো বাকি পাওনা নেই। বর্তমান বকেয়া: ৳০।`,
      navigateTo: '/khata'
    };
  }

  const tenant = db.prepare('SELECT shop_name, phone FROM tenants WHERE id = ?').get(tenantId) as any;
  const shopName = tenant?.shop_name || 'আমাদের দোকান';
  const shopPhone = tenant?.phone || '';

  // Clean phone number for WhatsApp
  let rawPhone = String(customer.phone || '').replace(/\D/g, '');
  if (rawPhone.startsWith('01')) {
    rawPhone = '88' + rawPhone;
  } else if (!rawPhone.startsWith('8801') && rawPhone.length === 10) {
    rawPhone = '880' + rawPhone;
  }

  // 3 Distinct culturally polite Bengali message templates
  const politeMessage = `আসসালামু আলাইকুম ${customer.name} ভাই/সাহেব। ${shopName} থেকে বিনীতভাবে জানাচ্ছি যে, আপনার পূর্বের বকেয়া ৳${due.toLocaleString('en-US')} টাকা বাকি রয়েছে। সুবিধাজনক সময়ে পরিশোধ করলে আমরা বিশেষভাবে উপকৃত হব। ধন্যবাদান্তে, ${shopName} (${shopPhone})।`;

  const friendlyPromiseMessage = `প্রিয় ${customer.name} ভাই, আশা করি ভালো আছেন। ${shopName}-এ আপনার মোট বকেয়া ৳${due.toLocaleString('en-US')} টাকা${customer.promise_date ? ` (${customer.promise_date} তারিখে দেওয়ার কথা ছিল)` : ''}। চলতি সপ্তাহের মধ্যে পরিশোধের অনুরোধ রইল। ধন্যবাদ।`;

  const urgentMessage = `জরুরি তাগাদা: জনাব ${customer.name}, ${shopName}-এ আপনার বকেয়া ৳${due.toLocaleString('en-US')} টাকা পরিশোধের সময় অতিক্রান্ত হয়েছে। অনুগ্রহ করে আজই যোগাযোগ করে বকেয়া পরিশোধ করার অনুরোধ করছি।`;

  const encodedWaText = encodeURIComponent(politeMessage);
  const waUrl = rawPhone ? `https://wa.me/${rawPhone}?text=${encodedWaText}` : '';
  const smsUrl = customer.phone ? `sms:${customer.phone}?body=${encodeURIComponent(politeMessage)}` : '';

  updateSessionContext(tenantId, { lastCustomerId: customer.id, lastCustomerName: customer.name });

  const speech = `${customer.name}-এর ৳${due.toLocaleString('bn-BD')} টাকা বকেয়ার জন্য তাগাদা মেসেজ প্রস্তুত হয়েছে। ১-ট্যাপে হোয়াটসঅ্যাপ বা এসএমএস পাঠাতে পারেন।`;

  let reply = `📱 **বাকি তাগাদা ড্রাফট — ${customer.name}**\n`;
  reply += `• বর্তমান মোট বকেয়া: **৳${due.toLocaleString('en-US')}**\n`;
  reply += `• ফোন: **${customer.phone || 'দেওয়া নেই'}**\n`;
  if (customer.promise_date) {
    reply += `• ওয়াদার তারিখ: **${customer.promise_date}**\n`;
  }
  reply += `\n💬 **প্রস্তুতকৃত বার্তা (নম্র তাগাদা):**\n> "${politeMessage}"\n\n`;

  if (waUrl) {
    reply += `👉 [🟢 হোয়াটসঅ্যাপে পাঠান](${waUrl})  |  [💬 SMS পাঠান](${smsUrl})`;
  } else {
    reply += `*(কাস্টমারের সঠিক মোবাইল নম্বর যুক্ত করলে সরাসরি হোয়াটসঅ্যাপ পাঠানো যাবে)*`;
  }

  return {
    success: true,
    action: 'due_reminder_generated',
    speech,
    reply,
    navigateTo: '/khata',
    actionLink: waUrl ? { text: 'হোয়াটসঅ্যাপে পাঠান →', href: waUrl } : { text: 'খাতা দেখুন →', href: '/khata' },
    data: {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      due,
      templates: {
        polite: politeMessage,
        friendly: friendlyPromiseMessage,
        urgent: urgentMessage
      },
      whatsappUrl: waUrl,
      smsUrl
    }
  };
}

/**
 * 🌟 3. Smart Predictive Reordering & Vendor Purchase Order Generator
 */
export function generateSmartPurchaseOrder(
  db: Database.Database,
  tenantId: string,
  categoryOrDealer?: string
): AgentExecutionResult {
  // 1. Analyze sales velocity over the last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoffStr = fourteenDaysAgo.toISOString();

  // Aggregate quantity sold per product
  const recentSales = db.prepare(`
    SELECT si.product_id, si.product_name, SUM(si.quantity) as total_sold
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.tenant_id = ? AND s.created_at >= ?
    GROUP BY si.product_id
  `).all(tenantId, cutoffStr) as Array<{ product_id: string; product_name: string; total_sold: number }>;

  const salesVelocityMap = new Map<string, number>();
  for (const s of recentSales) {
    if (s.product_id) {
      salesVelocityMap.set(s.product_id, (s.total_sold || 0) / 14); // daily velocity
    }
  }

  // 2. Query products and find ones running out within 3-5 days or below threshold
  const allProds = db.prepare(`
    SELECT id, bangla_name, name, stock, unit, purchase_price, selling_price, low_stock_threshold
    FROM products
    WHERE tenant_id = ?
    ORDER BY stock ASC
  `).all(tenantId) as any[];

  const orderItems: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    dailyVelocity: number;
    daysOfStockLeft: number;
    suggestedOrderQty: number;
    unit: string;
    unitPrice: number;
    estimatedCost: number;
    urgency: 'critical' | 'high' | 'medium';
  }> = [];

  for (const p of allProds) {
    const dailyVelocity = salesVelocityMap.get(p.id) || 0.3; // minimum assumed velocity if active
    const stock = Number(p.stock) || 0;
    const threshold = Number(p.low_stock_threshold) || 5;
    const daysLeft = dailyVelocity > 0 ? parseFloat((stock / dailyVelocity).toFixed(1)) : 99;

    if (stock <= threshold || daysLeft <= 4) {
      // Recommend 7-10 days buffer
      const bufferDays = 7;
      let orderQty = Math.ceil(dailyVelocity * bufferDays);
      if (orderQty < 5 && (p.unit === 'পিস' || p.unit === 'টি')) orderQty = 10;
      if (orderQty < 2 && p.unit === 'কেজি') orderQty = 10;

      const unitCost = Number(p.purchase_price) || Math.round(Number(p.selling_price) * 0.8) || 50;
      const estimatedCost = orderQty * unitCost;

      orderItems.push({
        productId: p.id,
        productName: p.bangla_name || p.name,
        currentStock: stock,
        dailyVelocity: parseFloat(dailyVelocity.toFixed(2)),
        daysOfStockLeft: daysLeft,
        suggestedOrderQty: orderQty,
        unit: p.unit || 'টি',
        unitPrice: unitCost,
        estimatedCost,
        urgency: stock <= 0 ? 'critical' : (daysLeft <= 2 ? 'high' : 'medium')
      });
    }
  }

  if (orderItems.length === 0) {
    return {
      success: true,
      action: 'purchase_order',
      speech: 'আলহামদুলিল্লাহ! আপনার দোকানে পর্যাপ্ত স্টক রয়েছে। আগামী কয়েক দিনের মধ্যে কোনো পণ্য শেষ হওয়ার আশঙ্কা নেই।',
      reply: '✅ **কোনো অর্ডার প্রয়োজন নেই:** সব পণ্যের পর্যাপ্ত মজুদ রয়েছে।',
      navigateTo: '/stock'
    };
  }

  // Sort by urgency: critical first
  orderItems.sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft);
  const topItems = orderItems.slice(0, 8);
  const totalEstimatedBudget = topItems.reduce((acc, i) => acc + i.estimatedCost, 0);

  const speechList = topItems.slice(0, 3).map(i => `${i.productName} (${i.suggestedOrderQty} ${i.unit})`).join(', ');
  const speech = `আপনার দোকানে বিক্রির গতি বিশ্লেষণ করে ${topItems.length}টি পণ্যের ডিলার পারচেজ অর্ডার তৈরি করা হয়েছে। যেমন: ${speechList}। আনুমানিক খরচ ৳${totalEstimatedBudget.toLocaleString('bn-BD')} টাকা।`;

  let reply = `📦 **স্মার্ট ডিলার পারচেজ অর্ডার ড্রাফট (${topItems.length}টি পণ্য)**\n`;
  reply += `• মোট আনুমানিক খরচ: **৳${totalEstimatedBudget.toLocaleString('en-US')}**\n\n`;
  reply += `| পণ্য | বর্তমান স্টক | বাকি দিন | প্রস্তাবিত অর্ডার | খরচ |\n`;
  reply += `|---|---|---|---|---|\n`;

  for (const item of topItems) {
    const badge = item.urgency === 'critical' ? '🔴 শেষ' : (item.urgency === 'high' ? '🟠 ২ দিন' : '🟡 ৪ দিন');
    reply += `| **${item.productName}** | ${item.currentStock} ${item.unit} | ${badge} | **+${item.suggestedOrderQty} ${item.unit}** | ৳${item.estimatedCost.toLocaleString('en-US')} |\n`;
  }

  reply += `\n*উক্ত তালিকাটি ডিলারের সাথে শেয়ার করে সহজে মাল তুলতে পারেন।*`;

  return {
    success: true,
    action: 'purchase_order',
    speech,
    reply,
    navigateTo: '/stock',
    actionLink: { text: 'স্টক খাতা দেখুন →', href: '/stock' },
    data: {
      orderItems: topItems,
      totalEstimatedBudget
    }
  };
}

/**
 * 🌟 4. Multi-Modal Vision: Dealer Handwritten / Printed Challan & Memo OCR Scanner
 */
export async function scanDealerInvoice(
  db: Database.Database,
  tenantId: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{
  success: boolean;
  supplierName?: string;
  supplierPhone?: string;
  challanNo?: string;
  date?: string;
  items: Array<{
    productId?: string;
    name: string;
    qty: number;
    unit: string;
    unitCost: number;
    sellingPrice: number;
    totalCost: number;
    isMatched?: boolean;
    isNewProduct?: boolean;
  }>;
  totalAmount: number;
  cashPaid: number;
  dueAdded: number;
  error?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Fetch tenant product catalog for intelligent matching
  const tenantProducts = db.prepare(`
    SELECT id, name, bangla_name, purchase_price, selling_price, unit, category_id
    FROM products
    WHERE tenant_id = ?
    LIMIT 120
  `).all(tenantId) as any[];

  const catalogSummary = tenantProducts.map(p => `${p.id}:${p.bangla_name || p.name}(৳${p.purchase_price || 0}/${p.unit || 'পিস'})`).join('; ');

  // Clean base64 string
  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(';base64,')) {
    const parts = cleanBase64.split(';base64,');
    cleanBase64 = parts[1] || '';
  }

  const prompt = `You are an Expert Optical Character Recognition (OCR) Engine & Retail Accountant for Bangladeshi retail shops.
Inspect this handwritten or printed supplier challan / dealer memo invoice image.
Extract the supplier/dealer name, memo/challan number, date, and every single line item of products purchased.

Existing Shop Products Grounding:
${catalogSummary || 'None'}

Instructions:
1. Extract supplierName (e.g. "মেঘনা গ্রুপ", "আকিজ ফুডস", "স্কয়ার ডিপো", "পাইকারি বাজার"), phone if present, challanNo, and date (YYYY-MM-DD or Bengali date).
2. For each line item:
   - "name": Clean Bengali/English product name (e.g. "তীর সয়াবিন তেল ১ লিটার", "ফ্রেশ চিনি", "নাপা ৫০০ এমজি").
   - "qty": Quantity received (number).
   - "unit": "লিটার"|"কেজি"|"পিস"|"পাতা"|"বস্তা"|"প্যাকেট"|"ডজন"|"কার্টুন"|"বক্স".
   - "unitCost": Purchase price per unit in Taka.
   - "totalCost": Line total (qty * unitCost).
   - "productId": If this item matches an existing product in the grounding list above, provide its ID. Otherwise null.
   - "sellingPrice": If existing, use its current selling price, or suggest selling price (around 12-18% profit margin over unitCost).
3. Compute totalAmount, and estimate cashPaid and dueAdded if written on memo (otherwise cashPaid=0, dueAdded=totalAmount).

RESPOND WITH STRICT JSON ONLY (NO markdown wrap, NO comments):
{
  "supplierName": "...",
  "supplierPhone": "...",
  "challanNo": "...",
  "date": "...",
  "items": [
    {
      "productId": "id from list or null",
      "name": "...",
      "qty": 10,
      "unit": "কেজি",
      "unitCost": 120,
      "sellingPrice": 140,
      "totalCost": 1200,
      "isMatched": true
    }
  ],
  "totalAmount": 1200,
  "cashPaid": 500,
  "dueAdded": 700
}`;

  const visionModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  for (const model of visionModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: "application/json"
          }
        })
      });

      clearTimeout(timeout);

      if (!resp.ok) continue;

      const data = await resp.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        // Post-process items with fallback ID matching
        const items = parsed.items.map((it: any) => {
          let matched = tenantProducts.find(p => p.id === it.productId);
          if (!matched && it.name) {
            const clean = it.name.toLowerCase().trim();
            matched = tenantProducts.find(p => {
              const bn = (p.bangla_name || '').toLowerCase();
              const nm = (p.name || '').toLowerCase();
              return bn.includes(clean) || clean.includes(bn) || nm.includes(clean);
            });
          }

          const qty = Number(it.qty) || 1;
          const unitCost = Number(it.unitCost) || (matched ? Number(matched.purchase_price) : 0);
          const totalCost = Number(it.totalCost) || (qty * unitCost);
          const sellingPrice = Number(it.sellingPrice) || (matched ? Number(matched.selling_price) : Math.round(unitCost * 1.15));

          return {
            productId: matched ? matched.id : null,
            name: matched ? (matched.bangla_name || matched.name) : it.name,
            qty,
            unit: it.unit || (matched?.unit) || 'পিস',
            unitCost,
            sellingPrice,
            totalCost,
            isMatched: !!matched,
            isNewProduct: !matched
          };
        });

        const totalAmount = Number(parsed.totalAmount) || items.reduce((acc: number, i: any) => acc + i.totalCost, 0);
        const cashPaid = Number(parsed.cashPaid) || 0;
        const dueAdded = Number(parsed.dueAdded) !== undefined ? Number(parsed.dueAdded) : Math.max(0, totalAmount - cashPaid);

        return {
          success: true,
          supplierName: parsed.supplierName || 'ডিলার চালান',
          supplierPhone: parsed.supplierPhone || '',
          challanNo: parsed.challanNo || ('CH-' + Date.now().toString().slice(-5)),
          date: parsed.date || new Date().toISOString().slice(0, 10),
          items,
          totalAmount,
          cashPaid,
          dueAdded
        };
      }
    } catch (e) {
      console.warn(`[OCR Vision] Model ${model} failed:`, e);
    }
  }

  throw new Error('চালানের ছবি থেকে লেখা পড়তে সমস্যা হয়েছে। দয়া করে স্পষ্ট ছবি তুলুন।');
}

/**
 * Commits a scanned invoice directly into DB stock & creates full audit logs
 */
export function commitScannedInvoice(
  db: Database.Database,
  tenantId: string,
  invoiceData: {
    supplierName?: string;
    supplierPhone?: string;
    challanNo?: string;
    items: Array<{
      productId?: string;
      name: string;
      qty: number;
      unit?: string;
      unitCost?: number;
      sellingPrice?: number;
      totalCost?: number;
    }>;
    totalAmount?: number;
    cashPaid?: number;
    dueAdded?: number;
  }
): AgentExecutionResult {
  const now = new Date().toISOString();
  const safeSupplier = invoiceData.supplierName ? String(invoiceData.supplierName).trim() : 'ডিলার চালান';
  const safeChallanNo = invoiceData.challanNo ? String(invoiceData.challanNo).trim() : ('CH-' + Date.now().toString().slice(-5));
  const processedItems: Array<any> = [];

  db.transaction(() => {
    for (const it of invoiceData.items) {
      const name = (it.name || '').trim();
      if (!name) continue;
      const qty = Number(it.qty) || 1;
      const cost = Number(it.unitCost) || 0;
      const sell = Number(it.sellingPrice) || Math.round(cost * 1.15);
      const unit = it.unit || 'পিস';

      let prod: any = null;
      if (it.productId) {
        prod = db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(it.productId, tenantId);
      }
      if (!prod) {
        prod = db.prepare('SELECT * FROM products WHERE tenant_id = ? AND (bangla_name = ? OR name = ?) LIMIT 1')
          .get(tenantId, name, name);
      }

      let prodId = '';
      let newStock = qty;

      if (prod) {
        prodId = prod.id;
        newStock = (Number(prod.stock) || 0) + qty;
        db.prepare(`
          UPDATE products SET
            stock = ?,
            purchase_price = ?,
            selling_price = COALESCE(?, selling_price)
          WHERE id = ?
        `).run(newStock, cost > 0 ? cost : prod.purchase_price, sell > 0 ? sell : null, prodId);
      } else {
        prodId = 'prod-' + uuidv4().slice(0, 8);
        const barcode = '894' + Math.floor(10000000 + Math.random() * 90000000);
        db.prepare(`
          INSERT INTO products (id, tenant_id, barcode, name, bangla_name, category_id, purchase_price, selling_price, stock, unit, low_stock_threshold, created_at)
          VALUES (?, ?, ?, ?, ?, 'general', ?, ?, ?, ?, 5, ?)
        `).run(prodId, tenantId, barcode, name, name, cost, sell, qty, unit, now);
      }

      // Record stock log
      const logId = 'stklog-' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO stock_logs (id, tenant_id, product_id, product_name, type, quantity, unit, base_quantity, unit_price, source_ref, note, created_at)
        VALUES (?, ?, ?, ?, 'stock_in', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        tenantId,
        prodId,
        name,
        qty,
        unit,
        qty,
        cost,
        safeChallanNo,
        `চালান থেকে স্টক ইন (${safeSupplier})`,
        now
      );

      processedItems.push({
        productId: prodId,
        productName: name,
        quantity: -qty, // negative deduction so undo reverts correctly
        stockDeduction: -qty,
        unit
      });
    }

    // Optional: Log dealer payable if dueAdded > 0
    const dueAdded = Number(invoiceData.dueAdded) || 0;
    if (dueAdded > 0 && safeSupplier) {
      let dealer = db.prepare('SELECT * FROM dealers WHERE tenant_id = ? AND company_name = ? LIMIT 1').get(tenantId, safeSupplier) as any;
      if (dealer) {
        db.prepare('UPDATE dealers SET payable_due = payable_due + ? WHERE id = ?').run(dueAdded, dealer.id);
      } else {
        const dId = 'deal-' + uuidv4().slice(0, 8);
        db.prepare(`
          INSERT INTO dealers (id, tenant_id, company_name, representative_name, phone, payable_due, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(dId, tenantId, safeSupplier, safeSupplier, invoiceData.supplierPhone || '01XXXXXXXXX', dueAdded, now);
      }
    }
  })();

  const actionId = 'act-' + uuidv4().slice(0, 8);
  lastActionsByTenant.set(tenantId, {
    actionId,
    tenantId,
    timestamp: Date.now(),
    type: 'invoice_commit',
    amount: Number(invoiceData.totalAmount) || 0,
    items: processedItems
  });

  const count = invoiceData.items.length;
  const speech = `চালান নম্বর ${safeChallanNo}-এর মোট ${count}টি পণ্য সফলভাবে স্টকে যুক্ত করা হয়েছে।`;
  const reply = `✅ **চালান থেকে পণ্য স্টকে যোগ সম্পন্ন!**\n• ডিলার: **${safeSupplier}**\n• চালান নং: **${safeChallanNo}**\n• মোট যুক্ত পণ্য: **${count}টি পদ**\n• মোট চালানের টাকা: **৳${Number(invoiceData.totalAmount || 0).toLocaleString('en-US')}**`;

  return {
    success: true,
    action: 'invoice_committed',
    speech,
    reply,
    navigateTo: '/stock',
    actionLink: { text: 'স্টক খাতা দেখুন →', href: '/stock' },
    undoAvailable: true,
    actionId,
    data: { challanNo: safeChallanNo, itemCount: count }
  };
}

/**
 * 🌟 5. Intelligent Multi-Action Bengali LLM AI Agent with Multi-Turn Memory & Native Tool Calling
 */
export async function runGeminiShopAgent(
  db: Database.Database,
  tenantId: string,
  spokenText: string,
  speakerRole?: string,
  speakerName?: string
): Promise<AgentExecutionResult | null> {
  // 👔 Staff Security Guardrail: Reject sensitive owner financial queries immediately (Zero-latency & Offline safe)
  if (speakerRole === 'staff') {
    const isSensitive = /(লাভ|মুনাফা|প্রফিট|ব্যবসায়িক লাভ|নিট লাভ|মোট লাভ|ক্যাশ ড্রয়ার|ক্যাশ বাক্স|দিন শেষ|ড্রয়ার মেলাও)/i.test(spokenText);
    if (isSensitive) {
      return {
        success: false,
        action: 'permission_denied',
        speech: `👔 সম্মানিত কর্মী ভাই, দোকানের মোট লাভ বা আর্থিক গোপনীয় তথ্য দেখার অনুমতি কেবল মালিকের রয়েছে।`,
        reply: `👔 **অনুমতি সংরক্ষিত:** [কর্মচারী মোড] মুনাফা বা ক্যাশ ড্রয়ার অডিট শুধুমাত্র মালিক দেখতে পারবেন।`
      };
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  // Retrieve Session Memory Context for pronouns ("তার", "তাকে", "উনার", "আরও")
  const sessionCtx = getSessionContext(tenantId);

  const tenant = db.prepare('SELECT id, shop_name, owner_name, industry_category_id FROM tenants WHERE id = ?').get(tenantId) as any;
  const products = db.prepare('SELECT id, bangla_name, name, stock, unit, sub_unit, selling_price, purchase_price, low_stock_threshold, conversion_ratio FROM products WHERE tenant_id = ? LIMIT 90').all(tenantId) as any[];
  const customers = db.prepare('SELECT id, name, phone, total_due, credit_limit, promise_date FROM customers WHERE tenant_id = ? LIMIT 60').all(tenantId) as any[];

  // Grounding strings
  const productListStr = products.map(p => `${p.id}:${p.bangla_name || p.name}(৳${p.selling_price}/${p.unit || 'টি'},স্টক:${p.stock})`).join('; ');
  const customerListStr = customers.map(c => `${c.id}:${c.name}(বকেয়া:${c.total_due},লিমিট:${c.credit_limit || 5000})`).join('; ');

  const contextStr = sessionCtx ? `Active Session Context (Last discussed): Customer=${sessionCtx.lastCustomerName || 'None'} (ID: ${sessionCtx.lastCustomerId || 'None'}), Product=${sessionCtx.lastProductName || 'None'} (ID: ${sessionCtx.lastProductId || 'None'})` : 'No active context';

  const categoryId = tenant?.industry_category_id || 'cat-grocery';
  const categoryNames: Record<string, string> = {
    'cat-pharmacy': 'Pharmacy & Medicine Store',
    'cat-grocery': 'Grocery & General Store',
    'cat-clothing': 'Clothing & Fashion Store',
    'cat-shoes': 'Footwear & Shoe Store',
    'cat-hardware': 'Hardware, Electrical & Sanitary Store',
    'cat-mobile': 'Mobile, Gadgets & Electronics Store',
    'cat-restaurant': 'Restaurant & Food Service',
    'cat-tea': 'Tea Stall & Snacks Corner',
    'cat-meat-fish': 'Meat, Poultry & Fish Market',
    'cat-sweet': 'Sweetmeat & Bakery Shop',
    'cat-furniture': 'Furniture & Woodwork Store',
    'cat-stationery': 'Stationery, Books & Library',
    'cat-cosmetics': 'Cosmetics & Beauty Parlour'
  };
  const categoryName = categoryNames[categoryId] || 'Retail Store';

  const systemInstruction = `You are the Super-Intelligent AI Shop Business Partner & Manager for "${tenant?.shop_name || 'আমাদের দোকান'}" (${categoryName}) in Bangladesh.
Your task is to understand shopkeeper Bengali commands and execute structured actions.
You support both single actions AND MULTI-ACTION compound sentences (e.g. sale + due payment at the same time).

Grounding Inventory Data:
Products: ${productListStr || 'None'}
Customers: ${customerListStr || 'None'}
Context: ${contextStr}

CRITICAL INVENTORY & STOCK ENFORCEMENT RULES:
1. The shop operates on a 100% STRICT INVENTORY RULE: Absolutely NO product can be sold unless it explicitly exists in the "Grounding Inventory Data: Products" list above with stock > 0.
2. If the user mentions or asks to sell any product that does NOT exist in the Products list above (or has 0 stock), DO NOT invent a productId and DO NOT pretend it was sold.
   - For an unlisted item, set "productId": null with the requested productName, so the inventory validator can inform the user that the product is not in stock.
3. NEVER hallucinate or map unrelated products.

Pronoun & Context Resolution:
- If user says "তার", "তাকে", "উনার", "ঐ কাস্টমার" -> map to context customer: ${sessionCtx?.lastCustomerName || 'null'}.
- If user says "আরও", "এটার", "ঐ মাল" -> map to context product: ${sessionCtx?.lastProductName || 'null'}.

Available Tools & Intents:
1. "multi_action": When user specifies multiple actions in one sentence! (e.g. "রহিমরে ২ কেজি চিনি বাকিতে দাও আর তার আগের বাকি থেইকা ৫০০ জমা নেও").
2. "stock_sale_or_due": Selling goods (cash or due/credit) with stock deduction.
3. "due_payment": Customer paying back due money (e.g. "রহিম ৫০০ টাকা জমা দিল", "করিমের বাকি শোধ ২০০ টাকা").
4. "due_reminder": Generating polite WhatsApp/SMS reminder for customer (e.g. "কালাম ভাইরে তাগাদা দাও", "রহিমের বাকির মেসেজ পাঠাও").
5. "purchase_order": Creating predictive reorder list for dealer (e.g. "ডিলারের জন্য অর্ডারের লিস্ট বানাও", "কী কী মাল শেষ হয়ে গেছে অর্ডার করব").
6. "proactive_briefing": Morning briefing or evening closing audit (e.g. "সকালের হিসাব বলো", "দিনের সমাপ্তি হিসাব", "ক্যাশ ড্রয়ার মেলাও").
7. "restock": Adding inventory / stock-in (e.g. "২০ কেজি চিনি মাল ঢুকলো").
8. "expense": Shop daily expense (e.g. "চা নাস্তা ৫০ টাকা খরচ").
9. "query": Balance, customer due, or product stock inquiry (e.g. "চিনির স্টক কত", "করিমের বাকি কত").
10. "business_query": Analytics ("today_profit", "market_due", "low_stock", "overdue_customers").
11. "promise_date": Setting payment due promise date (e.g. "রহিম আগামী শুক্রবার টাকা দিবে").

OUTPUT FORMAT: Respond with ONLY a valid JSON object:
{
  "intent": "multi_action" | "stock_sale_or_due" | "due_payment" | "due_reminder" | "purchase_order" | "proactive_briefing" | "restock" | "expense" | "query" | "business_query" | "promise_date" | "unknown",
  "customerId": "matched customer ID from list or null",
  "customerName": "extracted customer name or null",
  "isDue": boolean,
  "explicitTotalAmount": number or null,
  "queryType": "today_profit" | "market_due" | "low_stock" | "overdue_customers" | null,
  "briefingMode": "morning" | "evening" | null,
  "promiseDate": "YYYY-MM-DD or descriptive date string or null",
  "items": [
    {
      "productId": "matched product ID from list or null",
      "productName": "product name in Bangla",
      "quantity": number,
      "unit": "কেজি"|"গ্রাম"|"প্যাকেট"|"পাতা"|"পিস"|"টি"|"বস্তা"|"লিটার"|"হালি"|"ডজন"|"বক্স"|"জোড়া"|"ফুট"|"মিটার"|"গজ"|"প্লেট"|"কাপ"|"রিম"|"সেট",
      "unitPrice": number or null
    }
  ],
  "note": "brief summary in Bengali",
  "subActions": [
    {
      "intent": "stock_sale_or_due" | "due_payment",
      "customerName": "...",
      "explicitTotalAmount": 500,
      "isDue": true,
      "items": [...]
    }
  ]
}`;

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  for (const modelName of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: spokenText }] }],
          system_instruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            temperature: 0.1,
            response_mime_type: "application/json"
          }
        })
      });

      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) continue;

      const parsed = JSON.parse(rawJson);
      if (!parsed || parsed.intent === 'unknown') continue;

      // 🌟 MULTI-ACTION HANDLING (e.g. Sale + Due Payment in one command)
      if (parsed.intent === 'multi_action' && Array.isArray(parsed.subActions) && parsed.subActions.length > 1) {
        const executionResults: AgentExecutionResult[] = [];
        const executedSaleIds: string[] = [];
        let combinedSpeech = '';
        let combinedReply = `⚡ **একাধিক অ্যাকশন সম্পন্ন হয়েছে:**\n\n`;

        for (const sub of parsed.subActions) {
          if (sub.intent === 'stock_sale_or_due' && Array.isArray(sub.items) && sub.items.length > 0) {
            const custId = sub.customerId || (sub.customerName ? null : sessionCtx?.lastCustomerId);
            const custName = sub.customerName || (custId ? customers.find(c => c.id === custId)?.name : sessionCtx?.lastCustomerName);
            const res = executeStockSaleOrDue(db, tenantId, {
              customerId: custId,
              customerName: custName,
              isDue: sub.isDue !== false,
              items: sub.items,
              explicitTotalAmount: sub.explicitTotalAmount
            });
            executionResults.push(res);
            if (res.data?.actionId) executedSaleIds.push(res.data.actionId);
            combinedSpeech += res.speech + ' ';
            combinedReply += res.reply + '\n────────────────\n';
          } else if (sub.intent === 'due_payment') {
            const amount = Number(sub.explicitTotalAmount) || 0;
            const targetName = sub.customerName || sessionCtx?.lastCustomerName;
            if (amount > 0 && targetName) {
              const cust = db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND name LIKE ? LIMIT 1').get(tenantId, `%${targetName}%`) as any;
              if (cust) {
                const prevDue = Number(cust.total_due) || 0;
                const newDue = Math.max(0, prevDue - amount);
                db.prepare('UPDATE customers SET total_due = ? WHERE id = ?').run(newDue, cust.id);

                const paySaleId = 'pay-' + uuidv4().slice(0, 8);
                const payInvoiceNo = 'PAY-' + Date.now().toString().slice(-4);
                db.prepare(`
                  INSERT INTO sales (id, tenant_id, invoice_no, subtotal, discount, total_amount, paid_amount, due_amount, profit_amount, payment_method, customer_id, customer_name, note, cashier, created_at)
                  VALUES (?, ?, ?, ?, 0, ?, ?, 0, 0, 'due_payment', ?, ?, 'ভয়েস সহকারী দ্বারা বাকি আদায় জমা', 'হিসাব সহকারী', ?)
                `).run(paySaleId, tenantId, payInvoiceNo, amount, amount, amount, cust.id, cust.name, new Date().toISOString());

                executedSaleIds.push(paySaleId);
                combinedSpeech += `এবং ${cust.name}-এর আগের বাকি থেকে ৳${amount} টাকা নগদ জমা হয়েছে (অবশিষ্ট বকেয়া ৳${newDue} টাকা)। `;
                combinedReply += `💵 **বাকি আদায়:** ${cust.name}: **-৳${amount.toLocaleString('en-US')}** (অবশিষ্ট: **৳${newDue.toLocaleString('en-US')}**)\n`;
              }
            }
          }
        }

        if (executionResults.length > 0) {
          const actionId = 'act-multi-' + uuidv4().slice(0, 8);
          lastActionsByTenant.set(tenantId, {
            actionId,
            tenantId,
            timestamp: Date.now(),
            type: 'multi_action',
            amount: 0,
            saleIds: executedSaleIds,
            items: []
          });

          return {
            success: true,
            action: 'multi_action',
            speech: combinedSpeech.trim(),
            reply: combinedReply.trim(),
            navigateTo: '/khata',
            actionLink: { text: 'খাতায় দেখুন →', href: '/khata' },
            undoAvailable: true,
            actionId
          };
        }
      }

      // 🌟 DUE REMINDER (Autonomous Due Collector)
      if (parsed.intent === 'due_reminder') {
        const target = parsed.customerId || parsed.customerName || sessionCtx?.lastCustomerName || sessionCtx?.lastCustomerId;
        if (target) {
          return generateDueReminder(db, tenantId, target);
        }
      }

      // 🌟 SMART PURCHASE ORDER (Predictive Reordering)
      if (parsed.intent === 'purchase_order') {
        return generateSmartPurchaseOrder(db, tenantId);
      }

      // 🌟 PROACTIVE BRIEFING (Morning / Evening Advisor)
      if (parsed.intent === 'proactive_briefing') {
        const mode = parsed.briefingMode || 'auto';
        return generateProactiveBriefing(db, tenantId, mode, speakerRole);
      }

      // 1. Stock Sale / Due Sale
      if (parsed.intent === 'stock_sale_or_due' && Array.isArray(parsed.items) && parsed.items.length > 0) {
        const custId = parsed.customerId || (parsed.customerName ? null : sessionCtx?.lastCustomerId);
        const custName = parsed.customerName || (custId ? customers.find(c => c.id === custId)?.name : sessionCtx?.lastCustomerName);
        return executeStockSaleOrDue(db, tenantId, {
          customerId: custId,
          customerName: custName,
          isDue: parsed.isDue !== false,
          items: parsed.items,
          explicitTotalAmount: parsed.explicitTotalAmount,
          note: parsed.note
        });
      }

      // 2. Restock / Stock In
      if (parsed.intent === 'restock' && Array.isArray(parsed.items) && parsed.items.length > 0) {
        const firstItem = parsed.items[0];
        return executeStockRestock(db, tenantId, {
          productId: firstItem.productId,
          productName: firstItem.productName,
          quantity: firstItem.quantity,
          unit: firstItem.unit
        });
      }

      // 3. Business Analytics & Reporting Queries
      if (parsed.intent === 'business_query' && parsed.queryType) {
        return executeBusinessAnalyticsQuery(db, tenantId, parsed.queryType);
      }

      // 4. Due Payment (Cash In)
      if (parsed.intent === 'due_payment') {
        const amount = Number(parsed.explicitTotalAmount) || 0;
        if (amount > 0) {
          let cust: any = null;
          const targetId = parsed.customerId || sessionCtx?.lastCustomerId;
          if (targetId) {
            cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(targetId) as any;
          } else if (parsed.customerName) {
            cust = db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND name LIKE ? LIMIT 1').get(tenantId, `%${parsed.customerName}%`) as any;
          }
          if (cust) {
            const prevDue = Number(cust.total_due) || 0;
            const newDue = Math.max(0, prevDue - amount);
            db.prepare('UPDATE customers SET total_due = ? WHERE id = ?').run(newDue, cust.id);

            const saleId = 'pay-' + uuidv4().slice(0, 8);
            const invoiceNo = 'PAY-' + Date.now().toString().slice(-4);
            db.prepare(`
              INSERT INTO sales (id, tenant_id, invoice_no, subtotal, discount, total_amount, paid_amount, due_amount, profit_amount, payment_method, customer_id, customer_name, note, cashier, created_at)
              VALUES (?, ?, ?, ?, 0, ?, ?, 0, 0, 'due_payment', ?, ?, 'সহকারী দ্বারা বাকি আদায় জমা', 'হিসাব সহকারী', ?)
            `).run(saleId, tenantId, invoiceNo, amount, amount, amount, cust.id, cust.name, new Date().toISOString());

            const actionId = 'act-' + uuidv4().slice(0, 8);
            lastActionsByTenant.set(tenantId, {
              actionId,
              tenantId,
              timestamp: Date.now(),
              type: 'due_paid',
              customerId: cust.id,
              customerName: cust.name,
              previousDue: prevDue,
              newDue,
              saleId,
              amount,
              items: []
            });

            updateSessionContext(tenantId, { lastCustomerId: cust.id, lastCustomerName: cust.name });

            return {
              success: true,
              action: 'due_paid',
              actionId,
              undoAvailable: true,
              speech: `আলহামদুলিল্লাহ! ${cust.name} এর বাকি থেকে ৳${amount} টাকা জমা হয়েছে। অবশিষ্ট বকেয়া ৳${newDue} টাকা।`,
              reply: `✅ **বাকি আদায় জমা সম্পন্ন!**\n• কাস্টমার: **${cust.name}**\n• জমা: **৳${amount.toLocaleString('en-US')}**\n• অবশিষ্ট বকেয়া: **৳${newDue.toLocaleString('en-US')}**`,
              navigateTo: '/khata',
              actionLink: { text: 'খাতা দেখুন →', href: '/khata' },
              data: { actionId, customerName: cust.name, amount, previousDue: prevDue, remainingDue: newDue }
            };
          }
        }
      }

      // 5. Customer Promise Date Set
      if (parsed.intent === 'promise_date') {
        let cust: any = null;
        const targetId = parsed.customerId || sessionCtx?.lastCustomerId;
        if (targetId) {
          cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(targetId) as any;
        } else if (parsed.customerName) {
          cust = db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND name LIKE ? LIMIT 1').get(tenantId, `%${parsed.customerName}%`) as any;
        }
        if (cust) {
          const promiseStr = parsed.promiseDate || parsed.note || 'শীঘ্রই';
          db.prepare('UPDATE customers SET promise_date = ? WHERE id = ?').run(promiseStr, cust.id);
          updateSessionContext(tenantId, { lastCustomerId: cust.id, lastCustomerName: cust.name });
          return {
            success: true,
            action: 'promise_date_set',
            speech: `✓ ${cust.name} এর বাকি পরিশোধের তারিখ "${promiseStr}" নির্ধারণ করা হয়েছে।`,
            reply: `📅 **ওয়াদার তারিখ সংরক্ষিত!**\n• কাস্টমার: **${cust.name}**\n• পরিশোধের তারিখ: **${promiseStr}**\n• মোট বাকি: **৳${cust.total_due}**`,
            navigateTo: '/khata',
            actionLink: { text: 'খাতায় দেখুন →', href: '/khata' }
          };
        }
      }

      // 6. Shop Daily Expense
      if (parsed.intent === 'expense') {
        const amount = Number(parsed.explicitTotalAmount) || 0;
        const title = parsed.note || 'দোকান খরচ';
        if (amount > 0) {
          const expId = 'exp-' + uuidv4().slice(0, 8);
          db.prepare(`
            INSERT INTO expenses (id, tenant_id, title, amount, category, icon, created_at)
            VALUES (?, ?, ?, ?, ?, '💸', ?)
          `).run(expId, tenantId, title, amount, 'দৈনিক খরচ', new Date().toISOString());

          const actionId = 'act-' + uuidv4().slice(0, 8);
          lastActionsByTenant.set(tenantId, {
            actionId,
            tenantId,
            timestamp: Date.now(),
            type: 'expense',
            expenseId: expId,
            amount,
            items: []
          });

          return {
            success: true,
            action: 'expense_added',
            actionId,
            undoAvailable: true,
            speech: `✓ ৳${amount} টাকা (${title}) দোকান খরচ খাতায় লেখা হয়েছে।`,
            reply: `✅ **দোকান খরচ যুক্ত হয়েছে!**\n• বিবরণ: **${title}**\n• টাকার পরিমাণ: **৳${amount.toLocaleString('en-US')}**`,
            navigateTo: '/expenses',
            actionLink: { text: 'খরচ তালিকা দেখুন →', href: '/expenses' },
            data: { actionId, amount, title }
          };
        }
      }

      // 7. Live Stock or Customer Due Queries
      if (parsed.intent === 'query') {
        const queryItem = (parsed.items && parsed.items[0]) || null;
        const queryName = queryItem?.productName || parsed.note || spokenText;
        let matchedProd: any = null;
        if (queryItem?.productId) {
          matchedProd = db.prepare('SELECT * FROM products WHERE id = ?').get(queryItem.productId);
        }
        if (!matchedProd && queryName) {
          matchedProd = db.prepare('SELECT * FROM products WHERE tenant_id = ? AND (bangla_name LIKE ? OR name LIKE ?) LIMIT 1')
            .get(tenantId, `%${queryName}%`, `%${queryName}%`);
        }

        if (matchedProd) {
          const pStock = Number(matchedProd.stock) || 0;
          const pUnit = matchedProd.unit || 'টি';
          const pPrice = matchedProd.selling_price || 0;
          const pName = matchedProd.bangla_name || matchedProd.name;
          const isLow = pStock <= (matchedProd.low_stock_threshold || 5);
          updateSessionContext(tenantId, { lastProductId: matchedProd.id, lastProductName: pName });
          return {
            success: true,
            action: 'stock_query',
            speech: `${pName} এর বর্তমান স্টক ${pStock} ${pUnit}। বিক্রয়মূল্য ৳${pPrice} টাকা। ${isLow ? 'সতর্কতা: স্টক কমে গেছে!' : ''}`,
            reply: `📦 **মজুদ (Stock) রিপোর্ট:**\n• পণ্য: **${pName}**\n• বর্তমান স্টক: **${pStock} ${pUnit}** ${isLow ? '⚠️ *(কম স্টক)*' : '✅'}\n• খুচরা বিক্রয়মূল্য: **৳${pPrice}**\n• কেনা দর: **৳${matchedProd.purchase_price || 0}**`,
            navigateTo: '/stock',
            actionLink: { text: 'স্টক বিবরণ দেখুন →', href: `/stock?search=${encodeURIComponent(pName)}` },
            data: { product: matchedProd, stock: pStock }
          };
        }

        // Check customer due query
        if (parsed.customerId || parsed.customerName || sessionCtx?.lastCustomerId) {
          let cust: any = null;
          const targetCustId = parsed.customerId || sessionCtx?.lastCustomerId;
          if (targetCustId) {
            cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(targetCustId);
          } else if (parsed.customerName) {
            cust = db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND name LIKE ? LIMIT 1').get(tenantId, `%${parsed.customerName}%`);
          }
          if (cust) {
            const due = Number(cust.total_due) || 0;
            updateSessionContext(tenantId, { lastCustomerId: cust.id, lastCustomerName: cust.name });
            return {
              success: true,
              action: 'due_query',
              speech: `${cust.name} এর বর্তমান বকেয়া বাকি আছে ৳${due} টাকা। ${cust.promise_date ? `ওয়াদার তারিখ: ${cust.promise_date}।` : ''}`,
              reply: `👤 **বাকি খাতার তথ্য:**\n• কাস্টমার: **${cust.name}**\n• বর্তমান মোট বাকি: **৳${due.toLocaleString('en-US')}**\n• ফোন: ${cust.phone || 'দেওয়া নেই'}${cust.promise_date ? `\n• ওয়াদার তারিখ: **${cust.promise_date}**` : ''}`,
              navigateTo: '/khata',
              actionLink: { text: 'খাতায় দেখুন →', href: '/khata' },
              data: { customer: cust, due }
            };
          }
        }
      }
    } catch (modelErr) {
      console.warn(`[AI Agent] Model ${modelName} failed or timed out:`, modelErr);
    }
  }

  return null;
}
