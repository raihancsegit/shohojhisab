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
  type: 'due_given' | 'due_paid' | 'sale' | 'expense' | 'restock';
  customerId?: string;
  customerName?: string;
  previousDue?: number;
  newDue?: number;
  saleId?: string;
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
    customer = db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND (name LIKE ? OR ? LIKE "%" || name || "%") LIMIT 1')
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
  const processedItems: Array<{
    productId?: string;
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
      productId: matchedProd?.id,
      productName: matchedProd?.bangla_name || matchedProd?.name || rawItem.productName,
      quantity: qty,
      unit,
      unitPrice: Math.round(unitPrice),
      lineTotal,
      stockDeduction,
      currentStock,
      newStock
    });
  }

  // STRICT STOCK & INVENTORY VALIDATION
  for (const item of processedItems) {
    if (!item.productId) {
      return {
        success: false,
        action: 'product_not_found',
        speech: `⚠️ দুঃখিত, দোকানে "${item.productName}" নামের কোনো পণ্য তালিকায় খুঁজে পাওয়া যায়নি। সঠিক নাম বলুন বা পণ্য তালিকায় যুক্ত করুন।`,
        reply: `⚠️ **পণ্য পাওয়া যায়নি:**\n• নাম: **${item.productName}**\nদোকানের পণ্য তালিকায় এই পণ্যটি নেই। অনুগ্রহ করে পণ্যটি তালিকায় যুক্ত করুন বা সঠিক নামে ডাকুন।`,
        actionLink: { text: 'পণ্য তালিকা দেখুন →', href: '/products' }
      };
    }

    if (item.currentStock <= 0) {
      return {
        success: false,
        action: 'out_of_stock',
        speech: `⚠️ সতর্কবার্তা: "${item.productName}" বর্তমানে দোকানে স্টকে নেই (স্টক ০)! বিক্রি করতে হলে আগে নতুন মাল স্টক ইন করুন।`,
        reply: `❌ **স্টক শেষ (Out of Stock)!**\n• পণ্য: **${item.productName}**\n• বর্তমান মজুদ: **০ ${item.unit}**\nঅনুগ্রহ করে বিক্রি করার পূর্বে মালটি স্টকে যোগ (Stock In) করুন।`,
        actionLink: { text: 'স্টক ইন করুন →', href: `/stock?search=${encodeURIComponent(item.productName)}` }
      };
    }

    if (item.stockDeduction > item.currentStock) {
      return {
        success: false,
        action: 'insufficient_stock',
        speech: `⚠️ স্টকে পর্যাপ্ত মাল নেই! "${item.productName}" স্টকে মাত্র ${item.currentStock} ${item.unit} আছে, কিন্তু আপনি ${item.quantity} ${item.unit} চেয়েছেন।`,
        reply: `⚠️ **পর্যাপ্ত স্টক নেই!**\n• পণ্য: **${item.productName}**\n• স্টকে আছে: **${item.currentStock} ${item.unit}**\n• চাওয়া হয়েছে: **${item.quantity} ${item.unit}**\nঅনুগ্রহ করে সঠিক পরিমাণ বলুন।`,
        actionLink: { text: 'স্টক খাতা দেখুন →', href: `/stock?search=${encodeURIComponent(item.productName)}` }
      };
    }
  }

  const finalTotalAmount = Number(params.explicitTotalAmount) > 0 ? Number(params.explicitTotalAmount) : calculatedTotal;

  // MANDATORY ITEM/REASON REQUIREMENT:
  if (params.isDue && processedItems.length === 0 && (!params.note || params.note === 'পণ্য সামগ্রী' || params.note.length < 2)) {
    return {
      success: false,
      action: 'due_items_required',
      speech: `${customer ? customer.name : 'কাস্টমার'}-এর ৳${finalTotalAmount} টাকা বাকি লেখার জন্য পণ্যের বিবরণ বা নাম প্রয়োজন। কিসের জন্য বাকি তা মুখে বলুন (যেমন: ২ কেজি চাল বাবদ ৳${finalTotalAmount})।`,
      reply: `⚠️ **পণ্যের নাম বা বিবরণ প্রয়োজন (বাধ্যতামূলক):**\n${customer ? customer.name : 'কাস্টমার'}-এর ৳${finalTotalAmount.toLocaleString('en-US')} টাকা বাকি লেখার জন্য কিসের জন্য এই বাকি তা উল্লেখ করা বাধ্যতামূলক।\n\n*উদাহরণ:* *"${customer ? customer.name : 'কাস্টমার'} ২ কেজি চিনি ${finalTotalAmount} টাকা বাকি"*`
    };
  }

  const previousDue = customer ? (Number(customer.total_due) || 0) : 0;
  const newDue = params.isDue && customer ? previousDue + finalTotalAmount : previousDue;
  const creditLimit = customer ? (Number(customer.credit_limit) || 5000) : 5000;
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
      INSERT INTO sales (id, tenant_id, invoice_no, subtotal, discount, total_amount, paid_amount, due_amount, profit_amount, payment_method, customer_id, customer_name, note, cashier, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      summaryList,
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
        it.productId || 'prod-custom-' + uuidv4().slice(0, 6),
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
      VALUES (?, ?, ?, ?, 'in', ?, ?, ?, ?, 'ভয়েস স্টক ইন', 'ভয়েস সহকারী দ্বারা নতুন মাল যোগ', ?)
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
 * Intelligent Bengali LLM AI Agent with Multi-Turn Memory & Fast Fallbacks
 */
export async function runGeminiShopAgent(
  db: Database.Database,
  tenantId: string,
  spokenText: string
): Promise<AgentExecutionResult | null> {
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

  const systemInstruction = `You are the Super-Intelligent AI Shop Assistant & Business Manager for "${tenant?.shop_name || 'আমাদের দোকান'}" (${categoryName}) in Bangladesh.
Your task is to understand shopkeeper Bengali voice commands and extract structured JSON actions.

Grounding Inventory Data:
Products: ${productListStr || 'None'}
Customers: ${customerListStr || 'None'}
Context: ${contextStr}

Pronoun Resolution:
- If user says "তার", "তাকে", "উনার", "ঐ কাস্টমার" -> map to context customer: ${sessionCtx?.lastCustomerName || 'null'}.
- If user says "আরও", "এটার", "ঐ মাল" -> map to context product: ${sessionCtx?.lastProductName || 'null'}.

Actions you can return:
1. "stock_sale_or_due": Selling goods, credit/due, or cash sales (e.g. "রহিম ৫০ টাকা বাকি ২ কেজি চিনি", "২ পাতা নাপা বিক্রি ক্যাশে", "করিমরে ১ জোড়া জুতা বাকিতে দাও", "১০ ফুট পাইপ বিক্রি").
2. "due_payment": Customer paying back due money (e.g. "রহিম ২০০ টাকা জমা দিল", "করিমের বাকি শোধ ১০০ টাকা", "তার থেকে ৫০০ জমা নাও").
3. "restock": Adding inventory / stock-in (e.g. "২০ কেজি চিনি মাল ঢুকলো", "৫০ পাতা নাপা স্টকে যোগ করো", "১০ জোড়া জুতা স্টক ইন").
4. "expense": Shop daily expense (e.g. "চা নাস্তা ৫০ টাকা খরচ", "দোকান ভাড়া ৫০০০ টাকা").
5. "query": Balance, customer due, or product stock inquiry (e.g. "চিনির স্টক কত", "নাপা আছে কিনা", "করিমের বাকি কত").
6. "business_query": Overall shop reporting & analytics (e.g. "আজকে কত লাভ হইছে", "আজকের বিক্রি কত", "বাজারে মোট বাকি কত", "কোন কোন মাল শেষ হয়ে গেছে", "কার কার বাকির ডেট পার হয়েছে").
7. "promise_date": Setting payment due promise date (e.g. "রহিম আগামী শুক্রবার টাকা দিবে", "করিম ১০ তারিখ বাকি দেবে").

OUTPUT FORMAT: Respond with ONLY a valid JSON object:
{
  "intent": "stock_sale_or_due" | "due_payment" | "restock" | "expense" | "query" | "business_query" | "promise_date" | "unknown",
  "customerId": "matched customer ID from list or null",
  "customerName": "extracted customer name or null",
  "isDue": boolean,
  "explicitTotalAmount": number or null,
  "queryType": "today_profit" | "market_due" | "low_stock" | "overdue_customers" | null,
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
  "note": "brief summary in Bengali"
}`;

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest'
  ];

  for (const modelName of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

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

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) continue;

      const parsed = JSON.parse(rawJson);
      if (!parsed || parsed.intent === 'unknown') continue;

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
