import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 1. Subscription Plans Master Table
export const subscriptionPlans = sqliteTable('subscription_plans', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // 'basic', 'pro', 'enterprise'
  monthlyPrice: real('monthly_price').notNull(),
  yearlyPrice: real('yearly_price').notNull(),
  maxProducts: integer('max_products').notNull().default(100),
  maxBranches: integer('max_branches').notNull().default(1),
  maxDevices: integer('max_devices').notNull().default(1),
  features: text('features').notNull(), // JSON array of feature keys
  badge: text('badge'),
  createdAt: text('created_at').notNull()
});

// 2. Tenants (Business/Shop Master)
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  shopName: text('shop_name').notNull(),
  ownerName: text('owner_name').notNull(),
  phone: text('phone').notNull().unique(),
  bazaarLocation: text('bazaar_location').notNull(),
  industryCategoryId: text('industry_category_id').notNull(),
  planId: text('plan_id').notNull().default('pro'), // 'basic', 'pro', 'enterprise'
  pin: text('pin').notNull().default('1234'),
  status: text('status').notNull().default('active'), // 'active', 'suspended'
  monthlyFee: real('monthly_fee').notNull().default(149),
  startDate: text('start_date').notNull(),
  paidTill: text('paid_till').notNull(),
  smsBalance: integer('sms_balance').notNull().default(50),
  createdAt: text('created_at').notNull()
});

// 3. Staff Users (Role-Based Access Control)
export const staffUsers = sqliteTable('staff_users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  pin: text('pin').notNull(),
  role: text('role').notNull().default('salesman'), // 'owner', 'manager', 'cashier', 'salesman'
  permissions: text('permissions').notNull().default('[]'), // JSON array of permissions
  branchId: text('branch_id'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull()
});

// 4. Branches (Multi-Branch for Enterprise Plan)
export const branches = sqliteTable('branches', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  phone: text('phone'),
  managerName: text('manager_name'),
  isMainBranch: integer('is_main_branch', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull()
});

// 5. Promotional & Discount Coupons
export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type').notNull().default('percentage'), // 'percentage', 'fixed'
  discountValue: real('discount_value').notNull(),
  minOrderAmount: real('min_order_amount').default(0),
  maxUses: integer('max_uses').default(100),
  usedCount: integer('used_count').default(0),
  expiryDate: text('expiry_date'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull()
});

// 6. Categories
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  banglaName: text('bangla_name').notNull(),
  icon: text('icon').notNull().default('📦'),
  color: text('color').notNull().default('#4f46e5'),
  description: text('description'),
  fieldsSchema: text('fields_schema').notNull(),
  units: text('units').notNull(),
  createdAt: text('created_at').notNull()
});

// 7. Products
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  branchId: text('branch_id'),
  barcode: text('barcode').notNull(),
  name: text('name').notNull(),
  banglaName: text('bangla_name').notNull(),
  categoryId: text('category_id').notNull(),
  purchasePrice: real('purchase_price').notNull(),
  sellingPrice: real('selling_price').notNull(),
  stock: real('stock').notNull().default(0),
  unit: text('unit').notNull().default('পিস'),
  lowStockThreshold: real('low_stock_threshold').notNull().default(5),
  genericName: text('generic_name'),
  expiryDate: text('expiry_date'),
  brand: text('brand'),
  size: text('size'),
  color: text('color'),
  imei: text('imei'),
  icon: text('icon').default('📦'),
  createdAt: text('created_at').notNull()
});

// 8. Customers
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  totalDue: real('total_due').notNull().default(0),
  creditLimit: real('credit_limit').notNull().default(5000),
  avatar: text('avatar').default('👤'),
  createdAt: text('created_at').notNull()
});

// 9. Sales
export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  branchId: text('branch_id'),
  invoiceNo: text('invoice_no').notNull(),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').notNull().default(0),
  totalAmount: real('total_amount').notNull(),
  paidAmount: real('paid_amount').notNull(),
  dueAmount: real('due_amount').notNull().default(0),
  profitAmount: real('profit_amount').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  customerId: text('customer_id'),
  customerName: text('customer_name'),
  cashier: text('cashier').default('দোকান মালিক'),
  isOffline: integer('is_offline', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull()
});

// 10. Sale Items
export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  quantity: real('quantity').notNull(),
  purchasePrice: real('purchase_price').notNull(),
  sellingPrice: real('selling_price').notNull(),
  totalPrice: real('total_price').notNull(),
  profit: real('profit').notNull()
});

// 11. Expenses
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  branchId: text('branch_id'),
  title: text('title').notNull(),
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  icon: text('icon').default('💸'),
  createdAt: text('created_at').notNull()
});

// 12. Dealers / Suppliers
export const dealers = sqliteTable('dealers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  companyName: text('company_name').notNull(),
  representativeName: text('representative_name').notNull(),
  phone: text('phone').notNull(),
  payableDue: real('payable_due').notNull().default(0),
  orderDay: text('order_day'),
  deliveryDay: text('delivery_day'),
  createdAt: text('created_at').notNull()
});

// 13. Installments (কিস্তি খাতা)
export const installments = sqliteTable('installments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address'),
  guarantorName: text('guarantor_name'),
  guarantorPhone: text('guarantor_phone'),
  productName: text('product_name').notNull(),
  totalAmount: real('total_amount').notNull(),
  downPayment: real('down_payment').notNull(),
  remainingDue: real('remaining_due').notNull(),
  monthlyInstallment: real('monthly_installment').notNull(),
  totalMonths: integer('total_months').notNull(),
  paidMonths: integer('paid_months').default(0),
  startDate: text('start_date').notNull(),
  nextDueDate: text('next_due_date').notNull(),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  createdAt: text('created_at').notNull()
});

// 14. Subscription Transactions (Billing History)
export const subscriptionTransactions = sqliteTable('subscription_transactions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  planId: text('plan_id').notNull(),
  billingCycle: text('billing_cycle').notNull(), // 'monthly', 'yearly'
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'bkash', 'nagad', 'rocket', 'manual_admin'
  phoneNumber: text('phone_number'),
  trxId: text('trx_id'),
  couponCode: text('coupon_code'),
  discountAmount: real('discount_amount').default(0),
  status: text('status').notNull().default('completed'),
  createdAt: text('created_at').notNull()
});

// 15. Audit Logs
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id'),
  userName: text('user_name'),
  action: text('action').notNull(),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull()
});
