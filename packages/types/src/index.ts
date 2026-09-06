export type BusinessCategory =
  | 'grocery'
  | 'pharmacy'
  | 'clothing'
  | 'hardware'
  | 'restaurant'
  | 'mobile'
  | 'bakery'
  | 'meat_fish'
  | 'stationery';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  banglaName: string;
  category: BusinessCategory;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  image?: string;
  genericName?: string; // For Pharmacy
  expiryDate?: string;  // For Pharmacy
  size?: string;        // For Clothing
  color?: string;       // For Clothing
  imei?: string;        // For Electronics
}

export interface CartItem {
  product: Product;
  quantity: number;
  totalPrice: number;
  profit: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalDue: number;
  creditLimit: number;
  lastTransactionAt?: string;
}

export interface SaleOrder {
  id: string;
  invoiceNo: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  profitAmount: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'due' | 'split';
  customerId?: string;
  customerName?: string;
  createdAt: string;
  isSynced: boolean;
}

export interface DayEndSummary {
  date: string;
  totalSales: number;
  cashSales: number;
  digitalSales: number;
  dueSales: number;
  costOfGoods: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  cashInHand: number;
  totalDueCollected: number;
  totalNewDueGiven: number;
  totalMarketDue: number;
}
