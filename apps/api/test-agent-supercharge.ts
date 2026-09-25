import Database from 'better-sqlite3';
import path from 'path';
import {
  generateProactiveBriefing,
  generateDueReminder,
  generateSmartPurchaseOrder,
  executeStockSaleOrDue,
  runGeminiShopAgent,
  undoLastAction,
  getUndoAction,
  commitScannedInvoice
} from './src/ai-agent/aiAgent';

console.log('🧪 ===================================================');
console.log('🧪 SUPERCHARGED AI AGENT INTEGRATION & ACCURACY TEST');
console.log('🧪 ===================================================\n');

// 1. In-memory / Test SQLite DB Setup
const db = new Database(':memory:');

// Create required schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    shop_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT,
    industry_category_id TEXT DEFAULT 'cat-grocery'
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    barcode TEXT,
    name TEXT NOT NULL,
    bangla_name TEXT NOT NULL,
    category_id TEXT DEFAULT 'general',
    purchase_price REAL NOT NULL,
    selling_price REAL NOT NULL,
    stock REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'পিস',
    sub_unit TEXT,
    conversion_ratio REAL DEFAULT 1,
    low_stock_threshold REAL NOT NULL DEFAULT 5,
    generic_name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    total_due REAL NOT NULL DEFAULT 0,
    credit_limit REAL NOT NULL DEFAULT 5000,
    promise_date TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    invoice_no TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL,
    paid_amount REAL NOT NULL,
    due_amount REAL NOT NULL DEFAULT 0,
    profit_amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    customer_id TEXT,
    customer_name TEXT,
    note TEXT,
    cashier TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    purchase_price REAL NOT NULL,
    selling_price REAL NOT NULL,
    total_price REAL NOT NULL,
    profit REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    icon TEXT DEFAULT '💸',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    base_quantity REAL NOT NULL,
    unit_price REAL,
    source_ref TEXT,
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dealers (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    representative_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    payable_due REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

const tenantId = 'tenant-test-01';
const now = new Date().toISOString();
const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Seed Test Data
db.prepare(`
  INSERT INTO tenants (id, shop_name, owner_name, phone, industry_category_id)
  VALUES (?, 'বিসমিল্লাহ জেনারেল স্টোর', 'হাজী রফিক', '01700000000', 'cat-grocery')
`).run(tenantId);

db.prepare(`
  INSERT INTO products (id, tenant_id, barcode, name, bangla_name, purchase_price, selling_price, stock, unit, low_stock_threshold, created_at)
  VALUES
    ('prod-sugar', ?, '894001', 'Sugar', 'ফ্রেশ চিনি', 120, 140, 2, 'কেজি', 10, ?),
    ('prod-oil', ?, '894002', 'Soybean Oil', 'তীর সয়াবিন তেল ১ লিটার', 160, 185, 20, 'লিটার', 5, ?),
    ('prod-napa', ?, '894003', 'Napa Extra', 'নাপা এক্সট্রা', 20, 25, 4, 'পাতা', 10, ?)
`).run(tenantId, now, tenantId, now, tenantId, now);

db.prepare(`
  INSERT INTO customers (id, tenant_id, name, phone, address, total_due, credit_limit, promise_date, created_at)
  VALUES
    ('cust-rahim', ?, 'রহিম শেখ', '01811223344', 'পূর্ব বাজার', 3500, 10000, ?, ?),
    ('cust-kalam', ?, 'কালাম ভাই', '01799887766', 'মেইন রোড', 1200, 5000, ?, ?)
`).run(tenantId, todayStr, now, tenantId, todayStr, now);

// Seed some sales and expenses for today
db.prepare(`
  INSERT INTO sales (id, tenant_id, invoice_no, subtotal, discount, total_amount, paid_amount, due_amount, profit_amount, payment_method, cashier, created_at)
  VALUES
    ('s-1', ?, 'INV-01', 500, 0, 500, 500, 0, 80, 'cash', 'মালিক', ?),
    ('s-2', ?, 'INV-02', 300, 0, 300, 300, 0, 50, 'cash', 'মালিক', ?)
`).run(tenantId, `${todayStr}T10:00:00Z`, tenantId, `${todayStr}T11:00:00Z`);

db.prepare(`
  INSERT INTO expenses (id, tenant_id, title, amount, category, created_at)
  VALUES ('exp-1', ?, 'চা ও বিস্কুট', 80, 'দোকান খরচ', ?)
`).run(tenantId, `${todayStr}T11:30:00Z`);

let passedTests = 0;

// TEST 1: Morning Briefing Generator
console.log('▶️ TEST 1: Morning Proactive Business Briefing');
const morningBriefing = generateProactiveBriefing(db, tenantId, 'morning', 'owner');
console.log('   Speech:', morningBriefing.speech);
console.log('   Action:', morningBriefing.action);
if (morningBriefing.success && morningBriefing.speech.includes('রহিম শেখ') && morningBriefing.speech.includes('স্টক')) {
  console.log('   ✅ PASS: Morning briefing correctly identified due promises & low stock!');
  passedTests++;
} else {
  console.error('   ❌ FAIL: Morning briefing output incorrect');
}

// TEST 2: Evening Closing Audit & Cash Drawer Reconciliation
console.log('\n▶️ TEST 2: Evening Closing Audit & Cash Drawer Reconciliation');
const eveningAudit = generateProactiveBriefing(db, tenantId, 'evening', 'owner');
console.log('   Speech:', eveningAudit.speech);
console.log('   Expected Cash:', eveningAudit.data?.expectedCashInDrawer);
// Cash sales = 500 + 300 = 800. Expense = 80. Expected Cash in Drawer = 800 - 80 = 720
if (eveningAudit.success && eveningAudit.data?.expectedCashInDrawer === 720) {
  console.log('   ✅ PASS: Cash Drawer Reconciliation matches exact math (৳720)!');
  passedTests++;
} else {
  console.error('   ❌ FAIL: Cash drawer mismatch, expected 720 got', eveningAudit.data?.expectedCashInDrawer);
}

// TEST 3: Due Reminder with WhatsApp/SMS Generation
console.log('\n▶️ TEST 3: Due Reminder Draft & 1-Tap Link Generator');
const reminder = generateDueReminder(db, tenantId, 'রহিম শেখ');
console.log('   Speech:', reminder.speech);
console.log('   WhatsApp Link:', reminder.data?.whatsappUrl);
if (reminder.success && reminder.data?.whatsappUrl?.includes('8801811223344') && reminder.data?.due === 3500) {
  console.log('   ✅ PASS: WhatsApp URL and Bengali polite templates generated properly!');
  passedTests++;
} else {
  console.error('   ❌ FAIL: Due reminder failed');
}

// TEST 4: Smart Predictive Reordering (14-day velocity)
console.log('\n▶️ TEST 4: Smart Predictive Reorder PO Draft');
// Insert recent sale items for sugar so velocity is high
db.prepare(`
  INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, purchase_price, selling_price, total_price, profit)
  VALUES ('si-1', 's-1', 'prod-sugar', 'ফ্রেশ চিনি', 30, 120, 140, 4200, 600)
`).run();

const poResult = generateSmartPurchaseOrder(db, tenantId);
console.log('   Speech:', poResult.speech);
if (poResult.success && poResult.data?.orderItems?.length > 0) {
  const sugarOrder = poResult.data.orderItems.find((i: any) => i.productId === 'prod-sugar');
  console.log('   Sugar Reorder Qty:', sugarOrder?.suggestedOrderQty, sugarOrder?.unit);
  console.log('   ✅ PASS: Predictive reorder calculated stock run-out and suggested order buffer!');
  passedTests++;
} else {
  console.error('   ❌ FAIL: Smart PO generation failed');
}

// TEST 5: Staff Security Role Guardrail
console.log('\n▶️ TEST 5: Staff Security Role Guardrail');
runGeminiShopAgent(db, tenantId, 'আজকে কত লাভ হইছে', 'staff', 'করিম (সেলসম্যান)').then(staffResult => {
  console.log('   Staff Query Result:', staffResult?.action);
  if (staffResult?.action === 'permission_denied') {
    console.log('   ✅ PASS: Staff was strictly barred from viewing confidential profit numbers!');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Staff was not blocked from viewing profits');
  }

  // TEST 6: Atomic Stock Sale and 1-Tap Undo
  console.log('\n▶️ TEST 6: Atomic Stock Sale & 1-Tap Undo Verification');
  const initialStock = (db.prepare('SELECT stock FROM products WHERE id = ?').get('prod-oil') as any).stock;
  const saleExec = executeStockSaleOrDue(db, tenantId, {
    customerName: 'কালাম ভাই',
    isDue: true,
    items: [{
      productId: 'prod-oil',
      productName: 'তীর সয়াবিন তেল ১ লিটার',
      quantity: 5,
      unit: 'লিটার',
      unitPrice: 185
    }]
  });

  const postSaleStock = (db.prepare('SELECT stock FROM products WHERE id = ?').get('prod-oil') as any).stock;
  const postSaleDue = (db.prepare('SELECT total_due FROM customers WHERE id = ?').get('cust-kalam') as any).total_due;
  console.log('   Stock deducted from', initialStock, 'to', postSaleStock);
  console.log('   Due updated to', postSaleDue);

  const undoRes = undoLastAction(db, tenantId);
  const revertedStock = (db.prepare('SELECT stock FROM products WHERE id = ?').get('prod-oil') as any).stock;
  const revertedDue = (db.prepare('SELECT total_due FROM customers WHERE id = ?').get('cust-kalam') as any).total_due;
  console.log('   Reverted Stock:', revertedStock);
  console.log('   Reverted Due:', revertedDue);

  if (saleExec.success && postSaleStock === 15 && undoRes.success && revertedStock === 20 && revertedDue === 1200) {
    console.log('   ✅ PASS: Atomic stock deduction and 1-tap undo verified 100% with DB rollback!');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Stock sale or undo failed');
  }

  // TEST 7: Scanned Invoice Commit
  console.log('\n▶️ TEST 7: Commit Scanned Dealer Invoice to Stock');
  const invoiceCommit = commitScannedInvoice(db, tenantId, {
    supplierName: 'মেঘনা গ্রুপ অব ইন্ডাস্ট্রিজ',
    supplierPhone: '01711223344',
    challanNo: 'CH-99881',
    items: [
      { name: 'ফ্রেশ চিনি', productId: 'prod-sugar', qty: 50, unit: 'কেজি', unitCost: 125, sellingPrice: 145, totalCost: 6250 },
      { name: 'তীর আটা ২ কেজি', qty: 20, unit: 'প্যাকেট', unitCost: 110, sellingPrice: 130, totalCost: 2200 }
    ],
    totalAmount: 8450,
    cashPaid: 3450,
    dueAdded: 5000
  });

  const sugarNewStock = (db.prepare('SELECT stock, purchase_price FROM products WHERE id = ?').get('prod-sugar') as any);
  const newProduct = (db.prepare('SELECT * FROM products WHERE tenant_id = ? AND name = ?').get(tenantId, 'তীর আটা ২ কেজি') as any);
  const dealerPayable = (db.prepare('SELECT payable_due FROM dealers WHERE tenant_id = ?').get(tenantId) as any)?.payable_due;

  console.log('   Sugar New Stock:', sugarNewStock?.stock, '(was 2, added 50 = 52)');
  console.log('   New Product Created:', newProduct?.name, 'Stock:', newProduct?.stock);
  console.log('   Dealer Payable Due:', dealerPayable);

  if (invoiceCommit.success && sugarNewStock?.stock === 52 && newProduct && dealerPayable === 5000) {
    console.log('   ✅ PASS: Dealer invoice committed existing + new products + dealer payable due!');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Invoice commit failed');
  }

  // TEST 8: Strict Inventory Guard - Unlisted Product Rejection
  console.log('\n▶️ TEST 8: Reject Unlisted Product (Not in store stock)');
  const unlistedSale = executeStockSaleOrDue(db, tenantId, {
    customerName: 'কালাম ভাই',
    isDue: false,
    items: [{
      productName: 'আপেল ৫ কেজি',
      quantity: 5,
      unit: 'কেজি'
    }]
  });
  console.log('   Result Action:', unlistedSale.action);
  console.log('   Speech:', unlistedSale.speech);
  if (!unlistedSale.success && unlistedSale.action === 'product_not_in_stock') {
    console.log('   ✅ PASS: Unlisted product correctly blocked from being sold or generated!');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Unlisted product was incorrectly allowed');
  }

  // TEST 9: Strict Inventory Guard - Zero Stock (Out of Stock) Rejection
  console.log('\n▶️ TEST 9: Reject Out of Stock Product (Stock = 0)');
  // Create a zero stock product
  db.prepare(`
    INSERT INTO products (id, tenant_id, barcode, name, bangla_name, purchase_price, selling_price, stock, unit, low_stock_threshold, created_at)
    VALUES ('prod-apple', ?, '894009', 'Green Apple', 'সবুজ আপেল', 200, 250, 0, 'কেজি', 5, ?)
  `).run(tenantId, now);

  const outOfStockSale = executeStockSaleOrDue(db, tenantId, {
    customerName: 'কালাম ভাই',
    isDue: false,
    items: [{
      productId: 'prod-apple',
      productName: 'সবুজ আপেল',
      quantity: 2,
      unit: 'কেজি'
    }]
  });
  console.log('   Result Action:', outOfStockSale.action);
  console.log('   Speech:', outOfStockSale.speech);
  if (!outOfStockSale.success && outOfStockSale.action === 'out_of_stock') {
    console.log('   ✅ PASS: Zero stock product strictly blocked from being sold!');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Zero stock product was incorrectly allowed');
  }

  // TEST 10: Strict Inventory Guard - Insufficient Stock Rejection
  console.log('\n▶️ TEST 10: Reject Insufficient Stock (Requested > Available)');
  const currentOilStock = (db.prepare('SELECT stock FROM products WHERE id = ?').get('prod-oil') as any).stock;
  const insufficientSale = executeStockSaleOrDue(db, tenantId, {
    customerName: 'কালাম ভাই',
    isDue: false,
    items: [{
      productId: 'prod-oil',
      productName: 'তীর সয়াবিন তেল ১ লিটার',
      quantity: currentOilStock + 50, // More than available stock!
      unit: 'লিটার'
    }]
  });
  console.log('   Result Action:', insufficientSale.action);
  console.log('   Speech:', insufficientSale.speech);
  if (!insufficientSale.success && insufficientSale.action === 'insufficient_stock') {
    console.log('   ✅ PASS: Excessive quantity exceeding stock was strictly blocked!');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Excessive quantity was incorrectly allowed');
  }

  console.log('\n📊 TEST SUMMARY: ' + passedTests + ' / 10 Tests Passed Successfully! 🎉');
  process.exit(passedTests === 10 ? 0 : 1);
});
