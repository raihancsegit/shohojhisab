export interface Product {
  id: string;
  barcode: string;
  name: string;
  banglaName: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  genericName?: string;
  expiryDate?: string;
  size?: string;
  color?: string;
  imageEmoji: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalDue: number;
  creditLimit: number;
}

export interface SaleOrder {
  id: string;
  invoiceNo: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    totalPrice: number;
    profit: number;
  }>;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  profitAmount: number;
  paymentMethod: string;
  customerId?: string;
  customerName?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}

// Initial Pre-seeded Products (50+ Real Bangladeshi Products)
export const initialProducts: Product[] = [
  // Grocery Products
  { id: 'g-1', barcode: '894110012301', name: 'Teer Soybean Oil 1L', banglaName: 'তীর সয়াবিন তেল ১ লিটার', category: 'grocery', purchasePrice: 165, sellingPrice: 180, stock: 45, unit: 'লিটার', lowStockThreshold: 10, imageEmoji: '🛢️' },
  { id: 'g-2', barcode: '894110012302', name: 'Rupchanda Soybean Oil 2L', banglaName: 'রূপচাঁদা সয়াবিন তেল ২ লিটার', category: 'grocery', purchasePrice: 330, sellingPrice: 360, stock: 24, unit: 'লিটার', lowStockThreshold: 5, imageEmoji: '🛢️' },
  { id: 'g-3', barcode: '894110012303', name: 'Miniket Rice 50kg', banglaName: 'মিনিকেট চাল ৫০ কেজি বস্তা', category: 'grocery', purchasePrice: 3250, sellingPrice: 3500, stock: 15, unit: 'বস্তা', lowStockThreshold: 3, imageEmoji: '🍚' },
  { id: 'g-4', barcode: '894110012304', name: 'Nazirshail Rice 25kg', banglaName: 'নাজিরশাইল চাল ২৫ কেজি', category: 'grocery', purchasePrice: 1800, sellingPrice: 1950, stock: 20, unit: 'বস্তা', lowStockThreshold: 4, imageEmoji: '🍚' },
  { id: 'g-5', barcode: '894110012305', name: 'Fresh White Sugar 1kg', banglaName: 'ফ্রেশ চিনি ১ কেজি', category: 'grocery', purchasePrice: 130, sellingPrice: 140, stock: 80, unit: 'কেজি', lowStockThreshold: 15, imageEmoji: '🧂' },
  { id: 'g-6', barcode: '894110012306', name: 'Farm Egg (Hali)', banglaName: 'ফার্মের লাল ডিম ১ হালি', category: 'grocery', purchasePrice: 42, sellingPrice: 48, stock: 120, unit: 'হালি', lowStockThreshold: 20, imageEmoji: '🥚' },
  { id: 'g-7', barcode: '894110012307', name: 'Lux Soft Rose Soap 100g', banglaName: 'লাক্স সাবান ১০০ গ্রাম', category: 'grocery', purchasePrice: 50, sellingPrice: 60, stock: 65, unit: 'পিস', lowStockThreshold: 12, imageEmoji: '🧼' },
  { id: 'g-8', barcode: '894110012308', name: 'Dettol Soap 75g', banglaName: 'ডেটোল সাবান ৭৫ গ্রাম', category: 'grocery', purchasePrice: 48, sellingPrice: 55, stock: 40, unit: 'পিস', lowStockThreshold: 10, imageEmoji: '🧼' },
  { id: 'g-9', barcode: '894110012309', name: 'Maggi 2-Minute Noodles 4-Pack', banglaName: 'ম্যাগি নুডুলস ৪ প্যাক', category: 'grocery', purchasePrice: 75, sellingPrice: 90, stock: 50, unit: 'প্যাক', lowStockThreshold: 10, imageEmoji: '🍜' },
  { id: 'g-10', barcode: '894110012310', name: 'Radhuni Turmeric Powder 200g', banglaName: 'রাঁধুনী হলুদ গুঁড়া ২০০ গ্রাম', category: 'grocery', purchasePrice: 85, sellingPrice: 100, stock: 35, unit: 'প্যাক', lowStockThreshold: 8, imageEmoji: '🌶️' },
  { id: 'g-11', barcode: '894110012311', name: 'Red Lentil (Mosur Dal) 1kg', banglaName: 'দেশি মসুর ডাল ১ কেজি', category: 'grocery', purchasePrice: 125, sellingPrice: 140, stock: 60, unit: 'কেজি', lowStockThreshold: 15, imageEmoji: '🥣' },
  { id: 'g-12', barcode: '894110012312', name: 'Potato (Deshi) 1kg', banglaName: 'দেশি নতুন আলু ১ কেজি', category: 'grocery', purchasePrice: 38, sellingPrice: 50, stock: 200, unit: 'কেজি', lowStockThreshold: 30, imageEmoji: '🥔' },
  { id: 'g-13', barcode: '894110012313', name: 'Onion (Deshi) 1kg', banglaName: 'দেশি পেঁয়াজ ১ কেজি', category: 'grocery', purchasePrice: 75, sellingPrice: 90, stock: 150, unit: 'কেজি', lowStockThreshold: 25, imageEmoji: '🧅' },

  // Pharmacy Products
  { id: 'p-1', barcode: '894220012401', name: 'Napa Extra Tablet', banglaName: 'নাপা এক্সট্রা ট্যাবলেট (পাতা)', category: 'pharmacy', purchasePrice: 24, sellingPrice: 30, stock: 180, unit: 'পাতা', lowStockThreshold: 30, genericName: 'Paracetamol + Caffeine', expiryDate: '2027-06-30', imageEmoji: '💊' },
  { id: 'p-2', barcode: '894220012402', name: 'Ace Plus Tablet', banglaName: 'এইস প্লাস ট্যাবলেট (পাতা)', category: 'pharmacy', purchasePrice: 25, sellingPrice: 30, stock: 140, unit: 'পাতা', lowStockThreshold: 25, genericName: 'Paracetamol + Caffeine', expiryDate: '2027-04-15', imageEmoji: '💊' },
  { id: 'p-3', barcode: '894220012403', name: 'Seclo 20mg Capsule', banglaName: 'সেকলো ২০ মি.গ্রা. ক্যাপসুল', category: 'pharmacy', purchasePrice: 56, sellingPrice: 70, stock: 95, unit: 'পাতা', lowStockThreshold: 20, genericName: 'Omeprazole', expiryDate: '2026-11-20', imageEmoji: '💊' },
  { id: 'p-4', barcode: '894220012404', name: 'Maxpro 20mg Tablet', banglaName: 'ম্যাক্সপ্রো ২০ মি.গ্রা.', category: 'pharmacy', purchasePrice: 64, sellingPrice: 80, stock: 110, unit: 'পাতা', lowStockThreshold: 20, genericName: 'Esomeprazole', expiryDate: '2026-12-10', imageEmoji: '💊' },
  { id: 'p-5', barcode: '894220012405', name: 'Alatrol 10mg Tablet', banglaName: 'এলাট্রল ১০ মি.গ্রা.', category: 'pharmacy', purchasePrice: 32, sellingPrice: 40, stock: 75, unit: 'পাতা', lowStockThreshold: 15, genericName: 'Cetirizine', expiryDate: '2026-09-30', imageEmoji: '💊' },
  { id: 'p-6', barcode: '894220012406', name: 'Fexo 120mg Tablet', banglaName: 'ফেক্সো ১২০ মি.গ্রা.', category: 'pharmacy', purchasePrice: 80, sellingPrice: 100, stock: 60, unit: 'পাতা', lowStockThreshold: 10, genericName: 'Fexofenadine', expiryDate: '2027-08-15', imageEmoji: '💊' },
  { id: 'p-7', barcode: '894220012407', name: 'Monas 10mg Tablet', banglaName: 'মোনাস ১০ মি.গ্রা.', category: 'pharmacy', purchasePrice: 208, sellingPrice: 260, stock: 45, unit: 'পাতা', lowStockThreshold: 8, genericName: 'Montelukast', expiryDate: '2027-03-01', imageEmoji: '💊' },
  { id: 'p-8', barcode: '894220012408', name: 'SMC ORSaline-N', banglaName: 'এসএমসি ওআরস্যালাইন-এন', category: 'pharmacy', purchasePrice: 5.5, sellingPrice: 7, stock: 350, unit: 'প্যাকেট', lowStockThreshold: 50, genericName: 'Oral Rehydration Salt', expiryDate: '2028-01-01', imageEmoji: '🧪' },
  { id: 'p-9', barcode: '894220012409', name: 'Savlon Antiseptic Liquid 100ml', banglaName: 'স্যাভলন লিকুইড ১০০ মি.লি.', category: 'pharmacy', purchasePrice: 72, sellingPrice: 85, stock: 30, unit: 'বোতল', lowStockThreshold: 6, genericName: 'Chlorhexidine + Cetrimide', expiryDate: '2027-10-01', imageEmoji: '🧴' },

  // Clothing Products
  { id: 'c-1', barcode: '894330012501', name: 'Mens Premium Cotton Panjabi (L)', banglaName: 'কটন পাঞ্জাবি (সাইজ L)', category: 'clothing', purchasePrice: 650, sellingPrice: 950, stock: 18, unit: 'পিস', lowStockThreshold: 4, size: 'L', color: 'White', imageEmoji: '🥻' },
  { id: 'c-2', barcode: '894330012502', name: 'Mens Casual Polo Shirt (XL)', banglaName: 'ক্যাজুয়াল পোলো শার্ট (XL)', category: 'clothing', purchasePrice: 320, sellingPrice: 550, stock: 25, unit: 'পিস', lowStockThreshold: 5, size: 'XL', color: 'Navy Blue', imageEmoji: '👕' },
  { id: 'c-3', barcode: '894330012503', name: 'Cotton Lungi Deshi Check', banglaName: 'দেশি সুতি লুঙ্গি', category: 'clothing', purchasePrice: 280, sellingPrice: 380, stock: 40, unit: 'পিস', lowStockThreshold: 8, size: 'Free', color: 'Multi', imageEmoji: '🧣' }
];

export const initialCustomers: Customer[] = [
  { id: 'cust-1', name: 'কালাম ভাই (মুদি)', phone: '01711223344', address: 'পূর্ব পাড়া, বাজার রোড', totalDue: 1450, creditLimit: 5000 },
  { id: 'cust-2', name: 'রফিক সাহেব (মাস্টার)', phone: '01822334455', address: 'স্কুল রোড, ধামরাই', totalDue: 820, creditLimit: 3000 },
  { id: 'cust-3', name: 'সুলতান মেম্বার', phone: '01933445566', address: 'উত্তর ইউনিয়ন পরিষদ', totalDue: 3500, creditLimit: 10000 },
  { id: 'cust-4', name: 'জসিম ড্রাইভার', phone: '01644556677', address: 'বাস স্ট্যান্ড কলোনি', totalDue: 450, creditLimit: 2000 },
  { id: 'cust-5', name: 'মোস্তফা কন্ট্রাক্টর', phone: '01555667788', address: 'থানা মোড়', totalDue: 2100, creditLimit: 8000 }
];

export const initialExpenses: Expense[] = [
  { id: 'exp-1', title: 'দোকান ভাড়া (দৈনিক অংশ)', amount: 200, category: 'rent', date: '2026-09-01' },
  { id: 'exp-2', title: 'বিদ্যুৎ বিল (দৈনিক অংশ)', amount: 150, category: 'electricity', date: '2026-09-01' },
  { id: 'exp-3', title: 'চা-নাস্তা ও আপ্যায়ন', amount: 80, category: 'entertainment', date: '2026-09-01' },
  { id: 'exp-4', title: 'স্টাফ লাঞ্চ খরচ', amount: 120, category: 'staff', date: '2026-09-01' }
];

export const initialOrders: SaleOrder[] = [];
