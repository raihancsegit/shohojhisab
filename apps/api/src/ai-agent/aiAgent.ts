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
  type: 'due_given' | 'due_paid' | 'sale' | 'expense';
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
const lastActionsByTenant = new Map<string, LastActionEntry>();

export function getUndoAction(tenantId: string): LastActionEntry | null {
  const entry = lastActionsByTenant.get(tenantId);
  if (!entry) return null;
  // 120 seconds expiry
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
          if (it.productId && it.stockDeduction > 0) {
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
      newStock
    });
  }

  const finalTotalAmount = Number(params.explicitTotalAmount) > 0 ? Number(params.explicitTotalAmount) : calculatedTotal;
  const previousDue = customer ? (Number(customer.total_due) || 0) : 0;
  const newDue = params.isDue && customer ? previousDue + finalTotalAmount : previousDue;

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
      'ভয়েস এআই এজেন্ট',
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

  const speech = params.isDue
    ? `✓ ${customer ? customer.name : 'কাস্টমার'} এর বাকি খাতায় ৳${finalTotalAmount} টাকা (${summaryList}) যোগ ও স্টক আপডেট হয়েছে।`
    : `✓ ক্যাশ বিক্রি ৳${finalTotalAmount} টাকা সম্পন্ন এবং ${summaryList} স্টক থেকে কমানো হয়েছে।`;

  const reply = `✅ **${params.isDue ? 'বাকি এন্ট্রি ও স্টক আপডেট সম্পন্ন!' : 'ক্যাশ বিক্রয় সম্পন্ন!'}**\n` +
    (customer ? `• কাস্টমার: **${customer.name}**\n` : '') +
    `• মোট টাকা: **৳${finalTotalAmount.toLocaleString('en-US')}**\n` +
    (params.isDue && customer ? `• বর্তমান মোট বকেয়া: **৳${newDue.toLocaleString('en-US')}**\n` : '') +
    `• মালপত্র: ${summaryList}`;

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
 * Intelligent Bengali LLM AI Agent using Google Gemini Flash via REST
 */
export async function runGeminiShopAgent(
  db: Database.Database,
  tenantId: string,
  spokenText: string
): Promise<AgentExecutionResult | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const tenant = db.prepare('SELECT id, shop_name, owner_name, industry_category_id FROM tenants WHERE id = ?').get(tenantId) as any;
  const products = db.prepare('SELECT id, bangla_name, name, stock, unit, sub_unit, selling_price, conversion_ratio FROM products WHERE tenant_id = ? LIMIT 60').all(tenantId) as any[];
  const customers = db.prepare('SELECT id, name, phone, total_due FROM customers WHERE tenant_id = ? LIMIT 50').all(tenantId) as any[];

  // Compact grounding prompt
  const productListStr = products.map(p => `${p.id}:${p.bangla_name || p.name}(৳${p.selling_price}/${p.unit || 'টি'},স্টক:${p.stock})`).join('; ');
  const customerListStr = customers.map(c => `${c.id}:${c.name}(বকেয়া:${c.total_due})`).join('; ');

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

  const systemInstruction = `You are the specialized AI Shopkeeper Assistant for "${tenant?.shop_name || 'দোকান'}" (${categoryName}) in Bangladesh.
Your task is to understand shopkeeper Bengali voice commands and extract structured JSON actions for retail transactions tailored to this shop category.

Grounding Inventory Data:
Products: ${productListStr || 'None'}
Customers: ${customerListStr || 'None'}

Category Nuances:
- If Pharmacy: Understand medicine strips (পাতা), bottles, tablets, boxes, and dosages.
- If Clothing/Shoes: Understand piece counts, sets, sizes, and pairs (জোড়া).
- If Hardware: Understand measurements (ফুট, মিটার, গজ, ইঞ্চি, রোল, কেজি, বস্তা).
- If Mobile/Electronics: Understand piece counts, accessories, and installments (কিস্তি).
- If Restaurant/Food: Understand servings (প্লেট, কাপ, গ্লাস, বাটি, পিস, সেট).
- If Grocery/Meat/Fish: Understand weights (কেজি, গ্রাম, পোয়া, ছটাক, লিটার, বস্তা, হালি, ডজন).

Actions you can return:
1. "stock_sale_or_due": For selling goods, credit/due, or cash sales (e.g. "রহিম ৫০ টাকা বাকি ২ কেজি চিনি", "২ পাতা নাপা বিক্রি ক্যাশে", "করিমরে ১ জোড়া জুতা বাকিতে দাও", "১০ ফুট পাইপ বিক্রি").
2. "due_payment": For customer paying back due money (e.g. "রহিম ২০০ টাকা জমা দিল", "করিমের বাকি শোধ ১০০ টাকা").
3. "expense": For shop daily expense (e.g. "চা নাস্তা ৫০ টাকা খরচ", "দোকান ভাড়া ৫০০০ টাকা").
4. "query": For balance or stock inquiry.

OUTPUT FORMAT: Respond with ONLY a valid JSON object:
{
  "intent": "stock_sale_or_due" | "due_payment" | "expense" | "query" | "unknown",
  "customerId": "matched customer ID from list or null",
  "customerName": "extracted customer name or null",
  "isDue": boolean,
  "explicitTotalAmount": number or null,
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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s max latency constraint

    // Support modern Gemini 2.0 Flash with automatic fallback to Gemini 1.5 Flash
    let response: any = null;
    const modelCandidates = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of modelCandidates) {
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: spokenText }] }
            ],
            system_instruction: {
              parts: [{ text: systemInstruction }]
            },
            generationConfig: {
              temperature: 0.1,
              response_mime_type: "application/json"
            }
          })
        });
        if (response.ok) break;
      } catch (e) {}
    }

    clearTimeout(timeout);

    if (!response || !response.ok) {
      console.warn('[AI Agent] Gemini API response not ok, status:', response?.status);
      return null;
    }

    const data = await response.json();
    const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return null;

    const parsed = JSON.parse(rawJson);
    if (!parsed || parsed.intent === 'unknown') return null;

    // 1. Stock Sale or Due
    if (parsed.intent === 'stock_sale_or_due' && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const isDue = parsed.isDue === true || (parsed.isDue !== false && Boolean(parsed.customerName || parsed.customerId));
      return executeStockSaleOrDue(db, tenantId, {
        customerId: parsed.customerId,
        customerName: parsed.customerName,
        isDue,
        items: parsed.items,
        explicitTotalAmount: parsed.explicitTotalAmount,
        note: parsed.note
      });
    }

    // 2. Query Intent (Sales today, customer due, stock status, profit)
    if (parsed.intent === 'query') {
      const todayDate = new Date().toISOString().slice(0, 10);
      const cleanQ = spokenText.toLowerCase();

      // Query: Today's sales or profit
      if (/বিক্রি|লাভ|হিসাব|ইনকাম|আজকের|ক্যাশ/.test(cleanQ)) {
        const salesRow = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(profit_amount), 0) as profit, COUNT(*) as count FROM sales WHERE tenant_id = ? AND date(created_at) = ?').get(tenantId, todayDate) as any;
        const total = Math.round(Number(salesRow?.total) || 0);
        const profit = Math.round(Number(salesRow?.profit) || 0);
        const count = Number(salesRow?.count) || 0;

        return {
          success: true,
          action: 'sales_inquiry',
          speech: `আজকে মোট ${count}টি অর্ডারে ৳${total.toLocaleString('en-US')} টাকা বিক্রি হয়েছে এবং লাভ হয়েছে ৳${profit.toLocaleString('en-US')} টাকা।`,
          reply: `📊 **আজকের লাইভ বিক্রয় রিপোর্ট:**\n• আজকের মোট বিক্রি: **৳${total.toLocaleString('en-US')}**\n• মোট লাভ: **৳${profit.toLocaleString('en-US')}**\n• মোট মেমো সংখ্যা: **${count}টি**`,
          navigateTo: '/reports',
          actionLink: { text: 'পূর্ণাঙ্গ রিপোর্ট দেখুন →', href: '/reports' }
        };
      }

      // Query: Specific customer due
      if (parsed.customerName || parsed.customerId) {
        let cust: any = null;
        if (parsed.customerId) {
          cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(parsed.customerId) as any;
        } else {
          cust = db.prepare('SELECT * FROM customers WHERE tenant_id = ? AND name LIKE ? LIMIT 1').get(tenantId, `%${parsed.customerName}%`) as any;
        }
        if (cust) {
          const due = Math.round(Number(cust.total_due) || 0);
          return {
            success: true,
            action: 'customer_due_inquiry',
            speech: `${cust.name} এর বাকি খাতায় বর্তমান বকেয়া ৳${due.toLocaleString('en-US')} টাকা।`,
            reply: `📖 **গ্রাহকের বাকি তথ্য:**\n• খরিদ্দার: **${cust.name}**\n• বর্তমান মোট বাকি: **৳${due.toLocaleString('en-US')}**\n• ফোন: ${cust.phone || 'দেওয়া নেই'}`,
            navigateTo: '/khata',
            actionLink: { text: `${cust.name} এর খতিয়ান দেখুন →`, href: `/khata` }
          };
        }
      }

      // Query: Stock of specific product
      if (Array.isArray(parsed.items) && parsed.items.length > 0 && parsed.items[0].productName) {
        const pName = parsed.items[0].productName;
        const prod = db.prepare('SELECT * FROM products WHERE tenant_id = ? AND (bangla_name LIKE ? OR name LIKE ?) LIMIT 1').get(tenantId, `%${pName}%`, `%${pName}%`) as any;
        if (prod) {
          const stock = Number(prod.stock) || 0;
          const unit = prod.unit || 'টি';
          const price = Number(prod.selling_price) || 0;
          return {
            success: true,
            action: 'product_stock_inquiry',
            speech: `${prod.bangla_name || prod.name} বর্তমানে ${stock} ${unit} স্টকে আছে। বিক্রয়মূল্য ৳${price} টাকা।`,
            reply: `📦 **পণ্য স্টক তথ্য:**\n• পণ্য: **${prod.bangla_name || prod.name}**\n• বর্তমান স্টক: **${stock} ${unit}**\n• বিক্রয়মূল্য: **৳${price}**`,
            navigateTo: '/stock',
            actionLink: { text: 'স্টক খাতা দেখুন →', href: '/stock' }
          };
        }
      }
    }

    if (parsed.intent === 'due_payment') {
      const amount = Number(parsed.explicitTotalAmount) || 0;
      if (amount > 0) {
        let cust: any = null;
        if (parsed.customerId) {
          cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(parsed.customerId) as any;
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
            VALUES (?, ?, ?, ?, 0, ?, ?, 0, 0, 'due_payment', ?, ?, 'এআই এজেন্ট বাকি আদায় জমা', 'ভয়েস এআই', ?)
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

    return null;
  } catch (err) {
    console.warn('[AI Agent] Gemini call failed or timed out, falling back to local engine:', err);
    return null;
  }
}
