/**
 * 🔒 Complete Offline Data Vault for ShohojHisab Mobile
 * Preloads realistic, production-ready Bengali shop data, products, customers, sales, and stock for all 8+ industries.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  icon: string;
  barcode?: string;
  minStockAlert?: number;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  address?: string;
  totalDue: number;
  lastPurchaseDate?: string;
}

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customerName?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: 'cash' | 'due' | 'bkash' | 'nagad';
  createdAt: string;
  performedBy?: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
}

export interface VaultState {
  tenantId: string;
  industryId: string;
  products: ProductItem[];
  customers: CustomerItem[];
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  updatedAt: string;
}

// 🛒 Comprehensive Default Product Catalog for All Shop Types
export const INDUSTRY_CATALOGS: Record<string, { products: ProductItem[]; subcategories: Array<{ id: string; label: string; icon: string }> }> = {
  'cat-grocery': {
    subcategories: [
      { id: 'all', label: 'সকল পণ্য', icon: '🏪' },
      { id: 'rice-dal', label: 'চাল ও ডাল', icon: '🍚' },
      { id: 'oil-ghee', label: 'তেল ও ঘি', icon: '🛢️' },
      { id: 'sugar-salt', label: 'চিনি ও মসলা', icon: '🧂' },
      { id: 'eggs-dairy', label: 'ডিম ও দুধ', icon: '🥚' },
      { id: 'snacks', label: 'স্ন্যাক্স ও বেকারি', icon: '🍜' },
      { id: 'toiletries', label: 'সাবান ও ক্লিন', icon: '🧼' }
    ],
    products: [
      { id: 'g-1', name: 'তীর পরিশোধিত সয়াবিন তেল ১ লিটার', category: 'cat-grocery', subCategory: 'oil-ghee', price: 185, costPrice: 168, stock: 45, unit: 'লিটার', icon: '🛢️', barcode: '89411001' },
      { id: 'g-2', name: 'রূপচাঁদা সয়াবিন তেল ৫ লিটার', category: 'cat-grocery', subCategory: 'oil-ghee', price: 910, costPrice: 840, stock: 18, unit: 'বোতল', icon: '🛢️', barcode: '89411002' },
      { id: 'g-3', name: 'মিনিকেট চাল প্রিমিয়াম ১ কেজি', category: 'cat-grocery', subCategory: 'rice-dal', price: 72, costPrice: 65, stock: 320, unit: 'কেজি', icon: '🍚', barcode: '89411003' },
      { id: 'g-4', name: 'নাজিরশাইল চাল ১ কেজি', category: 'cat-grocery', subCategory: 'rice-dal', price: 80, costPrice: 72, stock: 150, unit: 'কেজি', icon: '🍚', barcode: '89411004' },
      { id: 'g-5', name: 'দেশি মসুর ডাল ১ কেজি', category: 'cat-grocery', subCategory: 'rice-dal', price: 140, costPrice: 125, stock: 85, unit: 'কেজি', icon: '🥣', barcode: '89411005' },
      { id: 'g-6', name: 'সাদা চিনি ১ কেজি', category: 'cat-grocery', subCategory: 'sugar-salt', price: 140, costPrice: 132, stock: 120, unit: 'কেজি', icon: '🧂', barcode: '89411006' },
      { id: 'g-7', name: 'ফার্মের লাল ডিম ১ হালি', category: 'cat-grocery', subCategory: 'eggs-dairy', price: 48, costPrice: 42, stock: 60, unit: 'হালি', icon: '🥚', barcode: '89411007' },
      { id: 'g-8', name: 'তীর আটা ২ কেজি প্যাকেট', category: 'cat-grocery', subCategory: 'rice-dal', price: 110, costPrice: 98, stock: 40, unit: 'প্যাকেট', icon: '🌾', barcode: '89411008' },
      { id: 'g-9', name: 'রাধুনী গুড়া হলুদ ২০০ গ্রাম', category: 'cat-grocery', subCategory: 'sugar-salt', price: 85, costPrice: 75, stock: 35, unit: 'প্যাকেট', icon: '🌶️', barcode: '89411009' },
      { id: 'g-10', name: 'লাক্স সাবান ১০০ গ্রাম', category: 'cat-grocery', subCategory: 'toiletries', price: 65, costPrice: 58, stock: 55, unit: 'পিস', icon: '🧼', barcode: '89411010' },
      { id: 'g-11', name: 'ম্যাগি মসলা নুডুলস ৮ প্যাক', category: 'cat-grocery', subCategory: 'snacks', price: 180, costPrice: 162, stock: 25, unit: 'প্যাক', icon: '🍜', barcode: '89411011' },
      { id: 'g-12', name: 'ইস্পাহানি মির্জাপুর চা পাতা ৪০০ গ্রাম', category: 'cat-grocery', subCategory: 'snacks', price: 230, costPrice: 205, stock: 30, unit: 'প্যাকেট', icon: '☕', barcode: '89411012' }
    ]
  },
  'cat-pharmacy': {
    subcategories: [
      { id: 'all', label: 'সকল ঔষধ', icon: '🏥' },
      { id: 'tablet', label: 'ট্যাবলেট ও ক্যাপসুল', icon: '💊' },
      { id: 'syrup', label: 'সিরাপ ও ড্রপ', icon: '🧴' },
      { id: 'saline', label: 'স্যালাইন ও ব্যান্ডেজ', icon: '💧' },
      { id: 'ointment', label: 'মলম ও ক্রিম', icon: '🩹' }
    ],
    products: [
      { id: 'p-1', name: 'নাপা এক্সট্রা ৫০০+৬৫মিগ্রা', category: 'cat-pharmacy', subCategory: 'tablet', price: 30, costPrice: 24, stock: 120, unit: 'পাতা', icon: '💊', barcode: '89421001' },
      { id: 'p-2', name: 'এইস প্লাস ট্যাবলেট', category: 'cat-pharmacy', subCategory: 'tablet', price: 30, costPrice: 24, stock: 95, unit: 'পাতা', icon: '💊', barcode: '89421002' },
      { id: 'p-3', name: 'সেকলো ২০মিগ্রা ক্যাপসুল', category: 'cat-pharmacy', subCategory: 'tablet', price: 70, costPrice: 58, stock: 80, unit: 'পাতা', icon: '💊', barcode: '89421003' },
      { id: 'p-4', name: 'ম্যাক্সপ্রো ২০মিগ্রা ট্যাবলেট', category: 'cat-pharmacy', subCategory: 'tablet', price: 90, costPrice: 76, stock: 65, unit: 'পাতা', icon: '💊', barcode: '89421004' },
      { id: 'p-5', name: 'অ্যালাট্রোল ১০মিগ্রা', category: 'cat-pharmacy', subCategory: 'tablet', price: 40, costPrice: 32, stock: 70, unit: 'পাতা', icon: '💊', barcode: '89421005' },
      { id: 'p-6', name: 'তুসকা কফ সিরাপ ১০০ml', category: 'cat-pharmacy', subCategory: 'syrup', price: 95, costPrice: 80, stock: 40, unit: 'বোতল', icon: '🧴', barcode: '89421006' },
      { id: 'p-7', name: 'এসএমসি ওরস্যালাইন-এন', category: 'cat-pharmacy', subCategory: 'saline', price: 6, costPrice: 4.8, stock: 350, unit: 'প্যাকেট', icon: '💧', barcode: '89421007' },
      { id: 'p-8', name: 'স্যাভলন অ্যান্টিসেপটিক ব্যান্ডেজ', category: 'cat-pharmacy', subCategory: 'saline', price: 15, costPrice: 10, stock: 150, unit: 'পিস', icon: '🩹', barcode: '89421008' },
      { id: 'p-9', name: 'সিভিত ২৫০mg চিবানো ট্যাবলেট', category: 'cat-pharmacy', subCategory: 'tablet', price: 25, costPrice: 19, stock: 90, unit: 'পাতা', icon: '💊', barcode: '89421009' }
    ]
  },
  'cat-clothing': {
    subcategories: [
      { id: 'all', label: 'সকল পোশাক', icon: '🛍️' },
      { id: 'panjabi', label: 'পাঞ্জাবি ও পায়জামা', icon: '🥻' },
      { id: 'shirt', label: 'শার্ট ও প্যান্ট', icon: '👔' },
      { id: 'tshirt', label: 'টি-শার্ট ও গেঞ্জি', icon: '👕' },
      { id: 'ladies', label: 'শাড়ি ও থ্রি-পিস', icon: '👗' }
    ],
    products: [
      { id: 'c-1', name: 'সুতি এমব্রয়ডারি পাঞ্জাবি (L)', category: 'cat-clothing', subCategory: 'panjabi', price: 1250, costPrice: 850, stock: 25, unit: 'পিস', icon: '🥻', barcode: '89431001' },
      { id: 'c-2', name: 'ফরমাল কটন শার্ট (XL)', category: 'cat-clothing', subCategory: 'shirt', price: 850, costPrice: 580, stock: 30, unit: 'পিস', icon: '👔', barcode: '89431002' },
      { id: 'c-3', name: 'এক্সপোর্ট জিন্স প্যান্ট (32)', category: 'cat-clothing', subCategory: 'shirt', price: 1200, costPrice: 820, stock: 20, unit: 'পিস', icon: '👖', barcode: '89431003' },
      { id: 'c-4', name: 'গোলগলা কটন টি-শার্ট', category: 'cat-clothing', subCategory: 'tshirt', price: 380, costPrice: 220, stock: 50, unit: 'পিস', icon: '👕', barcode: '89431004' },
      { id: 'c-5', name: 'পাকুড়িয়া স্পেশাল সুতি লুঙ্গি', category: 'cat-clothing', subCategory: 'panjabi', price: 480, costPrice: 340, stock: 45, unit: 'পিস', icon: '🩳', barcode: '89431005' },
      { id: 'c-6', name: 'কটন বুটিক থ্রি-পিস', category: 'cat-clothing', subCategory: 'ladies', price: 1650, costPrice: 1150, stock: 15, unit: 'পিস', icon: '👗', barcode: '89431006' }
    ]
  },
  'cat-hardware': {
    subcategories: [
      { id: 'all', label: 'সকল মালপত্র', icon: '🏗️' },
      { id: 'pipe', label: 'পাইপ ও স্যানিটারি', icon: '🚰' },
      { id: 'electric', label: 'ইলেকট্রিক ও লাইট', icon: '💡' },
      { id: 'tools', label: 'টুলস ও যন্ত্রপাতি', icon: '🔧' }
    ],
    products: [
      { id: 'h-1', name: 'পিপিআর পাইপ ১ ইঞ্চি', category: 'cat-hardware', subCategory: 'pipe', price: 48, costPrice: 36, stock: 180, unit: 'ফুট', icon: '🔧', barcode: '89441001' },
      { id: 'h-2', name: 'পিতলের পানির কল ১/২ ইঞ্চি', category: 'cat-hardware', subCategory: 'pipe', price: 340, costPrice: 260, stock: 40, unit: 'পিস', icon: '🚰', barcode: '89441002' },
      { id: 'h-3', name: 'সুপারস্টার এলইডি বাল্ব ১২W', category: 'cat-hardware', subCategory: 'electric', price: 160, costPrice: 125, stock: 75, unit: 'পিস', icon: '💡', barcode: '89441003' },
      { id: 'h-4', name: 'মাল্টিপ্লাগ ৫ গজ ক্যাবল', category: 'cat-hardware', subCategory: 'electric', price: 290, costPrice: 210, stock: 35, unit: 'পিস', icon: '🔌', barcode: '89441004' },
      { id: 'h-5', name: 'কালো কসটেপ বড় রোল', category: 'cat-hardware', subCategory: 'electric', price: 30, costPrice: 20, stock: 120, unit: 'রোল', icon: '🧰', barcode: '89441005' }
    ]
  },
  'cat-restaurant': {
    subcategories: [
      { id: 'all', label: 'সকল মেন্যু', icon: '🍽️' },
      { id: 'biryani', label: 'বিরিয়ানি ও রাইস', icon: '🍗' },
      { id: 'breads', label: 'নান ও গ্রিল', icon: '🫓' },
      { id: 'drinks', label: 'পানীয় ও ডেজার্ট', icon: '🥤' }
    ],
    products: [
      { id: 'r-1', name: 'চিকেন দম বিরিয়ানি', category: 'cat-restaurant', subCategory: 'biryani', price: 190, costPrice: 120, stock: 80, unit: 'প্লেট', icon: '🍗', barcode: '89451001' },
      { id: 'r-2', name: 'বিফ ভুনা খিচুড়ি স্পেশাল', category: 'cat-restaurant', subCategory: 'biryani', price: 240, costPrice: 155, stock: 50, unit: 'প্লেট', icon: '🍛', barcode: '89451002' },
      { id: 'r-3', name: 'চিকেন গ্রিল কোয়ার্টার ও নান', category: 'cat-restaurant', subCategory: 'breads', price: 150, costPrice: 95, stock: 60, unit: 'সেট', icon: '🍢', barcode: '89451003' },
      { id: 'r-4', name: 'স্পেশাল বোরহানি ৫০০ml', category: 'cat-restaurant', subCategory: 'drinks', price: 85, costPrice: 50, stock: 45, unit: 'বোতল', icon: '🥛', barcode: '89451004' }
    ]
  }
};

// 👥 Default Customer Khata Records
export const DEFAULT_CUSTOMERS: CustomerItem[] = [
  { id: 'c-1', name: 'রফিক সাহেব', phone: '01712345678', address: 'মেইন রোড, ঢাকা', totalDue: 1450, lastPurchaseDate: '২০২৬-০৯-১৬' },
  { id: 'c-2', name: 'করিম চাচা', phone: '01812345678', address: 'বাজার পাড়া', totalDue: 820, lastPurchaseDate: '২০২৬-০৯-১৫' },
  { id: 'c-3', name: 'সোহেল ভাই (মেস)', phone: '01912345678', address: 'কলেজ রোড', totalDue: 3200, lastPurchaseDate: '২০২৬-০৯-১৪' },
  { id: 'c-4', name: 'জামান স্যার', phone: '01612345678', address: 'স্কুল রোড', totalDue: 0, lastPurchaseDate: '২০২৬-০৯-১৬' }
];

// 🏬 Default Demo Shops
export const DEMO_SHOPS = [
  { id: 'tenant-1', shopName: 'বিসমিল্লাহ স্টোর', ownerName: 'রফিকুল ইসলাম', phone: '01986233234', industryId: 'cat-grocery', industryName: 'মুদি ও জেনারেল স্টোর', icon: '🛒' },
  { id: 'tenant-2', shopName: 'জনসেবা ফার্মেসি', ownerName: 'ডাঃ মোজাম্মেল হক', phone: '01711223344', industryId: 'cat-pharmacy', industryName: 'ফার্মেসি ও ঔষধালয়', icon: '💊' },
  { id: 'tenant-3', shopName: 'রয়েল ফ্যাশন', ownerName: 'তানভীর আহমেদ', phone: '01722334455', industryId: 'cat-clothing', industryName: 'ফ্যাশন ও গার্মেন্টস', icon: '👗' },
  { id: 'tenant-4', shopName: 'প্রাইম হার্ডওয়্যার', ownerName: 'জসিম উদ্দিন', phone: '01733445566', industryId: 'cat-hardware', industryName: 'হার্ডওয়্যার ও স্যানিটারি', icon: '🔧' },
  { id: 'tenant-5', shopName: 'হালকা খানা রেস্তোরাঁ', ownerName: 'শহীদুল ইসলাম', phone: '01744556677', industryId: 'cat-restaurant', industryName: 'রেস্তোরাঁ ও ফুড কোর্ট', icon: '🍗' }
];

let memoryVault: Record<string, VaultState> = {};
const STORAGE_KEY_PREFIX = 'shohoj_mobile_vault_';

export function getLocalVaultData(tenantId: string, industryId = 'cat-grocery'): VaultState {
  const tid = tenantId || 'tenant-1';
  if (!memoryVault[tid]) {
    const catalog = INDUSTRY_CATALOGS[industryId] || INDUSTRY_CATALOGS['cat-grocery'];
    memoryVault[tid] = {
      tenantId: tid,
      industryId,
      products: [...catalog.products],
      customers: [...DEFAULT_CUSTOMERS],
      sales: [
        {
          id: 's-101',
          invoiceNo: '#INV-1001',
          customerId: 'c-1',
          customerName: 'রফিক সাহেব',
          items: [{ id: 'g-1', name: 'তীর পরিশোধিত সয়াবিন তেল ১ লিটার', quantity: 2, price: 185, unit: 'লিটার', total: 370 }],
          subtotal: 370,
          discount: 0,
          total: 370,
          paidAmount: 370,
          dueAmount: 0,
          paymentMethod: 'cash',
          createdAt: new Date().toISOString()
        }
      ],
      expenses: [
        { id: 'e-1', title: 'দোকান বিদ্যুৎ বিল', category: 'ইউটিলিটি', amount: 850, date: new Date().toISOString().slice(0, 10) }
      ],
      updatedAt: new Date().toISOString()
    };
  }
  return memoryVault[tid];
}

export function saveLocalVaultSnapshot(tenantId: string, partialData: Partial<VaultState>) {
  const tid = tenantId || 'tenant-1';
  const current = getLocalVaultData(tid, partialData.industryId);
  const updated: VaultState = {
    ...current,
    ...partialData,
    updatedAt: new Date().toISOString()
  };
  memoryVault[tid] = updated;

  AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${tid}`, JSON.stringify(updated)).catch(() => {});
}

export async function hydrateLocalVault(tenantId: string, industryId = 'cat-grocery'): Promise<VaultState> {
  const tid = tenantId || 'tenant-1';
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${tid}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.products && parsed.products.length > 0) {
        memoryVault[tid] = { ...parsed, tenantId: tid };
        return memoryVault[tid];
      }
    }
  } catch (e) {}

  // Pre-seed default industry products
  const initial = getLocalVaultData(tid, industryId);
  await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${tid}`, JSON.stringify(initial)).catch(() => {});
  return initial;
}

// 🛒 POS Fast Order Execution
export function executePOSSale(tenantId: string, saleData: Omit<SaleRecord, 'id' | 'createdAt'>): SaleRecord {
  const vault = getLocalVaultData(tenantId);
  const newSale: SaleRecord = {
    ...saleData,
    id: 'sale-' + Date.now(),
    createdAt: new Date().toISOString()
  };

  // 1. Deduct Stock
  const updatedProducts = vault.products.map(p => {
    const soldItem = saleData.items.find(i => i.id === p.id || i.name === p.name);
    if (soldItem) {
      return { ...p, stock: Math.max(0, p.stock - soldItem.quantity) };
    }
    return p;
  });

  // 2. Adjust Customer Due if any
  let updatedCustomers = [...vault.customers];
  if (saleData.dueAmount > 0 && saleData.customerId) {
    updatedCustomers = updatedCustomers.map(c => {
      if (c.id === saleData.customerId) {
        return { ...c, totalDue: c.totalDue + saleData.dueAmount, lastPurchaseDate: new Date().toISOString().slice(0, 10) };
      }
      return c;
    });
  }

  const updatedSales = [newSale, ...vault.sales];

  saveLocalVaultSnapshot(tenantId, {
    products: updatedProducts,
    customers: updatedCustomers,
    sales: updatedSales
  });

  return newSale;
}

// 💵 Customer Due Collection
export function recordCustomerPayment(tenantId: string, customerId: string, amount: number, note = ''): CustomerItem | null {
  const vault = getLocalVaultData(tenantId);
  let updatedCustomer: CustomerItem | null = null;

  const updatedCustomers = vault.customers.map(c => {
    if (c.id === customerId) {
      const newDue = Math.max(0, c.totalDue - amount);
      updatedCustomer = { ...c, totalDue: newDue, lastPurchaseDate: new Date().toISOString().slice(0, 10) };
      return updatedCustomer;
    }
    return c;
  });

  if (updatedCustomer) {
    saveLocalVaultSnapshot(tenantId, { customers: updatedCustomers });
  }

  return updatedCustomer;
}
