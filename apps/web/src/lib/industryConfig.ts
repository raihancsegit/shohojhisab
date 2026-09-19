export interface IndustryTheme {
  id: string;
  name: string;
  icon: string;
  primaryColor: string;
  primaryGradient: string;
  accentBg: string;
  accentBorder: string;
  textPrimary: string;
  headerBadgeBg: string;
  headerBadgeText: string;
  posLabel: string;
  posIcon: string;
  posDesc: string;
  khataLabel: string;
  stockLabel: string;
  stockIcon: string;
  dealerLabel: string;
  reportsLabel: string;
  receiptSubtitle: string;
  terms: string[];
}

// Unified, cohesive, professional Royal Indigo palette across the ENTIRE system
const UNIFIED_PALETTE = {
  primaryColor: '#4f46e5',
  primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
  accentBg: '#eef2ff',
  accentBorder: '#c7d2fe',
  textPrimary: '#3730a3',
  headerBadgeBg: '#e0e7ff',
  headerBadgeText: '#4338ca',
};

export const INDUSTRY_THEMES: Record<string, IndustryTheme> = {
  'cat-pharmacy': {
    id: 'cat-pharmacy',
    name: 'ফার্মেসি ও ড্রাগ স্টোর',
    icon: '💊',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '💊',
    posDesc: 'প্রেসক্রিপশন ও ওটিসি ড্রাগ মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🧪',
    dealerLabel: 'ডিপো খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'রেজিস্টার্ড ফার্মেসি ও মেডিসিন ডিসপেনসারি',
    terms: [
      '১. ডাক্তারের পরামর্শ ব্যতীত এন্টিবায়োটিক ঔষধ সেবন করবেন না।',
      '২. ফ্রিজের ড্রাগ বা ইনসুলিন বিক্রির পর ফেরত নেওয়া হয় না।'
    ]
  },
  'cat-clothing': {
    id: 'cat-clothing',
    name: 'পোশাক ও ফ্যাশন শপ',
    icon: '👗',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '👗',
    posDesc: 'সাইজ ও কালারসহ মেমো',
    khataLabel: 'কাস্টমার খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🏷️',
    dealerLabel: 'মহাজন খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'লেডিস, জেন্টস ও কিডস এক্সক্লুসিভ ফ্যাশন',
    terms: [
      '১. বিক্রিত পণ্য অক্ষত অবস্থায় ট্যাগসহ ৩ দিনের মধ্যে পরিবর্তনযোগ্য।',
      '২. ট্রায়াল দেওয়া পোশাক ধোয়া বা ব্যবহারের পর পরিবর্তনযোগ্য নয়।'
    ]
  },
  'cat-shoes': {
    id: 'cat-shoes',
    name: 'জুতা ও ফুটওয়্যার',
    icon: '👞',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '👞',
    posDesc: 'সাইজ ও জোড়া হিসাব',
    khataLabel: 'কাস্টমার খাতা',
    stockLabel: 'স্টক',
    stockIcon: '👞',
    dealerLabel: 'কারখানা খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'লেদার ও ক্যাজুয়াল ফুটওয়্যার স্টোর',
    terms: [
      '১. জুতা অক্ষত অবস্থায় মেমোসহ পরিবর্তন করা যাবে।',
      '২. বাইরে পরা জুতো পরিবর্তন বা ফেরত নেওয়া হয় না।'
    ]
  },
  'cat-hardware': {
    id: 'cat-hardware',
    name: 'হার্ডওয়্যার ও স্যানিটারি',
    icon: '🔧',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '🔧',
    posDesc: 'ইঞ্চি, ফুট ও কেজি মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🔩',
    dealerLabel: 'মহাজন খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'স্যানিটারি, পাইপ ও ইলেকট্রিক সামগ্রী',
    terms: [
      '১. কাটা পাইপ বা খোলা তার ফেরত নেওয়া হয় না।',
      '২. চালানের তারিখ হতে ৭ দিনের মধ্যে হিসাব চুড়ান্ত করুন।'
    ]
  },
  'cat-mobile': {
    id: 'cat-mobile',
    name: 'মোবাইল ও গ্যাজেট শপ',
    icon: '📱',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '📱',
    posDesc: 'IMEI ও ওয়ারেন্টি রসিদ',
    khataLabel: 'কাস্টমার খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🔋',
    dealerLabel: 'সাপ্লায়ার খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'স্মার্টফোন, গ্যাজেট ও সার্ভিসিং সেন্টার',
    terms: [
      '১. অফিসিয়াল ওয়ারেন্টির জন্য মেমো এবং বক্স সংরক্ষণ করুন।',
      '২. ডিসপ্লে এবং পানিতে পড়া ডিভাইসে কোনো ওয়ারেন্টি নেই।'
    ]
  },
  'cat-restaurant': {
    id: 'cat-restaurant',
    name: 'রেস্টুরেন্ট ও ক্যাফে',
    icon: '🍔',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '🍳',
    posDesc: 'টেবিল ও কিচেন টোকেন বিল',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🥩',
    dealerLabel: 'সাপ্লায়ার খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'সুস্বাদু ও স্বাস্থ্যসম্মত খাবারের ঠিকানা',
    terms: [
      '১. পার্সেল খাবার নেয়ার পূর্বে চেক করে নিন।',
      '২. অগ্রিম বুকিং ছাড়া বিশেষ আইটেম তৈরি সম্ভব নয়।'
    ]
  },
  'cat-meat-fish': {
    id: 'cat-meat-fish',
    name: 'মাংস ও মাছের আড়ত',
    icon: '🥩',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '⚖️',
    posDesc: 'ওজন ও ড্রেসিং মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🐟',
    dealerLabel: 'পাইকার খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: '১০০% হালাল ও টাটকা সরবরাহ',
    terms: [
      '১. ওজন ও পরিমাপ কাটার পূর্বে যাচাই করে নিন।',
      '২. প্যাকেট খোলার পর কোনো অভিযোগ গ্রহণযোগ্য নয়।'
    ]
  },
  'cat-bakery': {
    id: 'cat-bakery',
    name: 'বেকারি ও সুইটস',
    icon: '🎂',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '🍰',
    posDesc: 'কেক পাউন্ড ও মিষ্টি মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🍞',
    dealerLabel: 'ফ্যাক্টরি খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'তাজা মিষ্টি, বেকারি ও জন্মদিনের কেক',
    terms: [
      '১. কাস্টমাইজড কেক ডেলিভারির ৩ ঘণ্টা পূর্বে রেডি হয়।',
      '২. ক্রিম কেক ফ্রিজে ২-৪ ডিগ্রি তাপমাত্রায় সংরক্ষণ করুন।'
    ]
  },
  'cat-furniture': {
    id: 'cat-furniture',
    name: 'ফার্নিচার ও কাঠ শোরুম',
    icon: '🛋️',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '🛋️',
    posDesc: 'অ্যাডভান্স ও ডেলিভারি চালান',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🪵',
    dealerLabel: 'মহাজন খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'আধুনিক ডিজাইন ও টিক কাঠের আসবাবপত্র',
    terms: [
      '১. ডেলিভারির সময় পণ্য স্বচক্ষে যাচাই করে নিন।',
      '২. কাঠ ও রঙের ওয়ারেন্টি মেমোর সাথে সংরক্ষিত।'
    ]
  },
  'cat-stationery': {
    id: 'cat-stationery',
    name: 'বই ও স্টেশনারি',
    icon: '📚',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '📖',
    posDesc: 'বই ও অফিস সাপ্লাই মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '✏️',
    dealerLabel: 'প্রেস মহাজন',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'শিক্ষা উপকরণ ও বুক কর্ণার',
    terms: [
      '১. বইয়ের ভেতরের পাতা কেনার সময় দেখে নিন।',
      '২. সিল বা নাম লেখা বই পরিবর্তনযোগ্য নয়।'
    ]
  },
  'cat-cosmetics': {
    id: 'cat-cosmetics',
    name: 'কসমেটিকস ও বিউটি',
    icon: '💄',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '💅',
    posDesc: 'শেড ও স্কিনকেয়ার মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🧴',
    dealerLabel: 'ডিপো খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: '১০০% অরিজিনাল স্কিনকেয়ার ও কসমেটিকস',
    terms: [
      '১. সিলযুক্ত প্রডাক্ট খোলার পর ফেরত নেওয়া হয় না।',
      '২. স্কিন এলার্জি টেস্ট করে পণ্য ব্যবহার করুন।'
    ]
  },
  'cat-grocery': {
    id: 'cat-grocery',
    name: 'মুদি ও সুপার শপ',
    icon: '🛒',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '⚡',
    posDesc: 'বারকোড ও ওজন মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '📦',
    dealerLabel: 'মহাজন খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'নিত্যপ্রয়োজনীয় পণ্যের খুচরা ও পাইকারি দোকান',
    terms: [
      '১. বিক্রিত পণ্য অক্ষত অবস্থায় ৭ দিনের মধ্যে মেমোসহ পরিবর্তনযোগ্য।',
      '২. কোনো প্রকার কাটা-ছেঁড়া চালান গ্রহণযোগ্য নয়।'
    ]
  },
  'cat-tea': {
    id: 'cat-tea',
    name: 'চা স্টল ও স্ন্যাক্স বার',
    icon: '☕',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '☕',
    posDesc: 'চা, সিঙ্গাড়া ও সিগারেট মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🫖',
    dealerLabel: 'ডিলার খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'টাটকা চা, স্ন্যাক্স ও রিফ্রেশমেন্ট',
    terms: [
      '১. বকেয়া হিসাব প্রতি সপ্তাহে পরিশোধযোগ্য।',
      '২. পার্সেল চা ও স্ন্যাক্স গরম থাকা অবস্থায় চেক করুন।'
    ]
  },
  'cat-sweet': {
    id: 'cat-sweet',
    name: 'মিষ্টি ও মিষ্টান্ন ভাণ্ডার',
    icon: '🧁',
    ...UNIFIED_PALETTE,
    posLabel: 'কাউন্টার',
    posIcon: '🧁',
    posDesc: 'মিষ্টি কেজি ও পিস মেমো',
    khataLabel: 'বাকি খাতা',
    stockLabel: 'স্টক',
    stockIcon: '🍬',
    dealerLabel: 'সাপ্লায়ার খাতা',
    reportsLabel: 'রিপোর্ট',
    receiptSubtitle: 'খাঁটি ছানা ও গাওয়া ঘিয়ে তৈরি ঐতিহ্যবাহী মিষ্টি',
    terms: [
      '১. ফ্রিজের মিষ্টি ক্রয়ের পর দ্রুত সংরক্ষণ করুন।',
      '২. বিশেষ অনুষ্ঠানের অর্ডার ২৪ ঘণ্টা পূর্বে নিশ্চিত করুন।'
    ]
  }
};

export function normalizeIndustryId(industryId?: string, fallbackShopName?: string): string {
  const clean = String(industryId || '').toLowerCase().trim();
  const shopClean = String(fallbackShopName || '').toLowerCase().trim();

  // 1. Direct match on industryId
  if (clean.includes('pharma') || clean.includes('drug') || clean.includes('ফার্মেসি') || clean.includes('ঔষধ') || clean.includes('ওষুধ')) return 'cat-pharmacy';
  if (clean.includes('cloth') || clean.includes('fashion') || clean.includes('পোশাক') || clean.includes('কাপড়') || clean.includes('গার্মেন্টস')) return 'cat-clothing';
  if (clean.includes('hardware') || clean.includes('sanitary') || clean.includes('হার্ডওয়্যার') || clean.includes('স্যানিটারি')) return 'cat-hardware';
  if (clean.includes('mobile') || clean.includes('electronic') || clean.includes('মোবাইল') || clean.includes('ইলেকট্রনিক্স')) return 'cat-mobile';
  if (clean.includes('restaurant') || clean.includes('cafe') || clean.includes('খাবার') || clean.includes('রেস্তোরাঁ') || clean.includes('রেস্টুরেন্ট')) return 'cat-restaurant';
  if (clean.includes('bakery') || clean.includes('sweet') || clean.includes('মিষ্টি') || clean.includes('বেকারি')) return 'cat-bakery';
  if (clean.includes('cosmetic') || clean.includes('beauty') || clean.includes('কসমেটিক')) return 'cat-cosmetics';
  if (clean.includes('shoe') || clean.includes('footwear') || clean.includes('জুতা') || clean.includes('জুতো')) return 'cat-shoes';
  if (clean.includes('meat') || clean.includes('fish') || clean.includes('মাংস') || clean.includes('মাছ')) return 'cat-meat-fish';
  if (clean.includes('station') || clean.includes('book') || clean.includes('বই') || clean.includes('স্টেশনারি') || clean.includes('লাইব্রেরি')) return 'cat-stationery';
  if (clean.includes('tea') || clean.includes('চা')) return 'cat-tea';
  if (clean.includes('furniture') || clean.includes('ফার্নিচার') || clean.includes('আসবাবপত্র')) return 'cat-furniture';
  if (clean.startsWith('cat-') && INDUSTRY_THEMES[clean] && clean !== 'cat-grocery') return clean;

  // 2. Intelligent inference from shopName if industryId is missing or default
  if (shopClean) {
    if (shopClean.includes('pharma') || shopClean.includes('drug') || shopClean.includes('ফার্মেসি') || shopClean.includes('ঔষধ') || shopClean.includes('মেডিসিন') || shopClean.includes('medicine')) return 'cat-pharmacy';
    if (shopClean.includes('cloth') || shopClean.includes('fashion') || shopClean.includes('পোশাক') || shopClean.includes('টেইলার') || shopClean.includes('বস্ত্র')) return 'cat-clothing';
    if (shopClean.includes('hardware') || shopClean.includes('হার্ডওয়্যার') || shopClean.includes('স্যানিটারি')) return 'cat-hardware';
    if (shopClean.includes('mobile') || shopClean.includes('ইলেকট্রনিক্স') || shopClean.includes('টেলিকম')) return 'cat-mobile';
    if (shopClean.includes('restaurant') || shopClean.includes('ক্যাফে') || shopClean.includes('রেস্তোরাঁ') || shopClean.includes('হোটেল')) return 'cat-restaurant';
    if (shopClean.includes('bakery') || shopClean.includes('মিষ্টি') || shopClean.includes('বেকারি') || shopClean.includes('কনফেকশনারি')) return 'cat-bakery';
    if (shopClean.includes('cosmetic') || shopClean.includes('কসমেটিক') || shopClean.includes('বিউটি')) return 'cat-cosmetics';
    if (shopClean.includes('shoe') || shopClean.includes('জুতা') || shopClean.includes('ফুটওয়্যার')) return 'cat-shoes';
    if (shopClean.includes('meat') || shopClean.includes('গোশত') || shopClean.includes('মাংস') || shopClean.includes('মাছ')) return 'cat-meat-fish';
    if (shopClean.includes('furniture') || shopClean.includes('ফার্নিচার') || shopClean.includes('আসবাবপত্র')) return 'cat-furniture';
  }

  if (clean.includes('grocery') || clean.includes('মুদি') || clean.includes('জেনারেল')) return 'cat-grocery';
  if (clean.startsWith('cat-') && INDUSTRY_THEMES[clean]) return clean;
  if (INDUSTRY_THEMES[`cat-${clean}`]) return `cat-${clean}`;
  return 'cat-grocery';
}

export function getIndustryTheme(industryId?: string, fallbackShopName?: string): IndustryTheme {
  const key = normalizeIndustryId(industryId, fallbackShopName);
  return INDUSTRY_THEMES[key] || INDUSTRY_THEMES['cat-grocery'];
}

export const INDUSTRY_UNITS: Record<string, Array<{ value: string; label: string }>> = {
  'cat-pharmacy': [
    { value: 'পাতা', label: 'পাতা (Strip)' },
    { value: 'ট্যাবলেট', label: 'ট্যাবলেট (Tab)' },
    { value: 'ক্যাপসুল', label: 'ক্যাপসুল (Cap)' },
    { value: 'বোতল', label: 'বোতল (Bottle)' },
    { value: 'মলম', label: 'মলম / ক্রিম' },
    { value: 'ড্রপ', label: 'ড্রপ (Drop)' },
    { value: 'ভায়াল', label: 'ইনজেকশন (Vial)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (Pack)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
    { value: 'পিস', label: 'পিস (Pcs)' },
  ],
  'cat-grocery': [
    { value: 'কেজি', label: 'কেজি (Kg)' },
    { value: 'গ্রাম', label: 'গ্রাম (gm)' },
    { value: 'লিটার', label: 'লিটার (Ltr)' },
    { value: 'মিলি', label: 'মিলি (ml)' },
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'হালি', label: 'হালি (৪ পিস)' },
    { value: 'ডজন', label: 'ডজন (১২ পিস)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (Pack)' },
    { value: 'বস্তা', label: 'বস্তা (Bag)' },
    { value: 'কার্টন', label: 'কার্টন (Carton)' },
    { value: 'টিন', label: 'টিন / ড্রাম' },
    { value: 'বোতল', label: 'বোতল (Bottle)' },
  ],
  'cat-clothing': [
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'সেট', label: 'সেট (Set)' },
    { value: 'গজ', label: 'গজ (Yard)' },
    { value: 'মিটার', label: 'মিটার (Meter)' },
    { value: 'জোড়া', label: 'জোড়া (Pair)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
  ],
  'cat-shoes': [
    { value: 'জোড়া', label: 'জোড়া (Pair)' },
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
    { value: 'সেট', label: 'সেট (Set)' },
  ],
  'cat-hardware': [
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'ফুট', label: 'ফুট (Feet)' },
    { value: 'ইঞ্চি', label: 'ইঞ্চি (Inch)' },
    { value: 'মিটার', label: 'মিটার (Meter)' },
    { value: 'গজ', label: 'গজ (Yard)' },
    { value: 'কেজি', label: 'কেজি (Kg)' },
    { value: 'রোল', label: 'রোল (Roll)' },
    { value: 'ব্যাগ', label: 'ব্যাগ / বস্তা' },
    { value: 'বক্স', label: 'বক্স (Box)' },
    { value: 'সেট', label: 'সেট (Set)' },
    { value: 'ড্রাম', label: 'ড্রাম / বালতি' },
  ],
  'cat-mobile': [
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'সেট', label: 'সেট (Set)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
    { value: 'জোড়া', label: 'জোড়া (Pair)' },
  ],
  'cat-restaurant': [
    { value: 'প্লেট', label: 'প্লেট (Plate)' },
    { value: 'হাফ প্লেট', label: 'হাফ প্লেট (Half)' },
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'সেট', label: 'সেট (Set)' },
    { value: 'বাটি', label: 'বাটি (Bowl)' },
    { value: 'গ্লাস', label: 'গ্লাস (Glass)' },
    { value: 'কাপ', label: 'কাপ (Cup)' },
    { value: 'পাউন্ড', label: 'পাউন্ড (Pound)' },
    { value: 'কেজি', label: 'কেজি (Kg)' },
    { value: 'লিটার', label: 'লিটার (Ltr)' },
    { value: 'বোতল', label: 'বোতল (Bottle)' },
    { value: 'পার্সেল', label: 'পার্সেল (Box)' },
  ],
  'cat-tea': [
    { value: 'কাপ', label: 'কাপ (Cup)' },
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'শলা', label: 'শলা (Stick)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (Pack)' },
    { value: 'খিলি', label: 'খিলি (Paan)' },
    { value: 'বোতল', label: 'বোতল (Bottle)' },
  ],
  'cat-meat-fish': [
    { value: 'কেজি', label: 'কেজি (Kg)' },
    { value: 'গ্রাম', label: 'গ্রাম (gm)' },
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'হালি', label: 'হালি (৪ পিস)' },
    { value: 'পাল্লা', label: 'পাল্লা (৫ কেজি)' },
    { value: 'কেস', label: 'কেস / ঝুড়ি' },
  ],
  'cat-sweet': [
    { value: 'কেজি', label: 'কেজি (Kg)' },
    { value: 'গ্রাম', label: 'গ্রাম (gm)' },
    { value: 'পাউন্ড', label: 'পাউন্ড (Pound)' },
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (Pack)' },
  ],
  'cat-bakery': [
    { value: 'পাউন্ড', label: 'পাউন্ড (Pound)' },
    { value: 'কেজি', label: 'কেজি (Kg)' },
    { value: 'গ্রাম', label: 'গ্রাম (gm)' },
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (Pack)' },
  ],
  'cat-furniture': [
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'সেট', label: 'সেট (Set)' },
    { value: 'জোড়া', label: 'জোড়া (Pair)' },
    { value: 'সিএফটি', label: 'সিএফটি (cft)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
  ],
  'cat-stationery': [
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'ডজন', label: 'ডজন (Dozen)' },
    { value: 'রিম', label: 'রিম (Rim)' },
    { value: 'দিস্তা', label: 'দিস্তা (Dista)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (Pack)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
    { value: 'সেট', label: 'সেট (Set)' },
  ],
  'cat-cosmetics': [
    { value: 'পিস', label: 'পিস (Pcs)' },
    { value: 'বোতল', label: 'বোতল (Bottle)' },
    { value: 'টিউব', label: 'টিউব (Tube)' },
    { value: 'জার', label: 'জার (Jar)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (Pack)' },
    { value: 'সেট', label: 'সেট (Set)' },
    { value: 'বক্স', label: 'বক্স (Box)' },
  ]
};

export function getIndustryUnits(industryId?: string): {
  primaryUnits: Array<{ value: string; label: string }>;
} {
  const currentKey = normalizeIndustryId(industryId);
  const primaryUnits = INDUSTRY_UNITS[currentKey] || INDUSTRY_UNITS['cat-grocery'] || [];
  return { primaryUnits };
}

export interface IndustryVoiceConfig {
  quickSaleBannerHint: string;
  quickSaleSuggestions: string[];
  stockInHint: string;
  stockInSuggestions: string[];
  productEntryHint: string;
  assistantSuggestions: string[];
  dueVoiceExample?: string;
}

export const INDUSTRY_VOICE_CONFIGS: Record<string, IndustryVoiceConfig> = {
  'cat-pharmacy': {
    quickSaleBannerHint: 'নাপা এক্সট্রা ২ পাতা ৬০, তুসকা সিরাপ ১ বোতল ৯৫',
    quickSaleSuggestions: [
      'নাপা এক্সট্রা ২ পাতা ৬০ টাকা',
      'সেকলো ২০ মিগ্রা ১ পাতা ৭০ টাকা',
      'তুসকা কফ সিরাপ ১ বোতল ৯৫ টাকা',
      '১ প্যাকেট ওরস্যালাইন ৬ টাকা',
      '২ পিস স্যাভলন ব্যান্ডেজ ৩০ টাকা',
      'অ্যালাট্রোল ১০ মিগ্রা ১ পাতা ৪০ টাকা',
      'সিভিত ২৫০mg ১ পাতা ২৫ টাকা',
      'ফ্ল্যাজিল ৪০০ মিগ্রা ১ পাতা ৩৫ টাকা'
    ],
    stockInHint: 'নাপা এক্সট্রা ৫০ পাতা স্টক যোগ করো কেনা ২২',
    stockInSuggestions: [
      'নাপা এক্সট্রা ৫০ পাতা কেনা ২২',
      'সেকলো ২০ মিগ্রা ৩০ পাতা কেনা ৬০',
      'তুসকা সিরাপ ২০ বোতল কেনা ৮০',
      'ওরস্যালাইন ১০০ প্যাকেট কেনা ৫'
    ],
    productEntryHint: 'প্যারাসিটামল ৫০ পাতা কেনা ২০ বিক্রয় ৩০',
    assistantSuggestions: [
      'কালাম ভাই ৫০০ টাকা বাকি নিল',
      'রহিম ভাই ২০০ টাকা বাকি দিল',
      'নাপা এক্সট্রার স্টক কত আছে?',
      'আজকে কত ঔষধ বিক্রি হলো?',
      'আজকে কত লাভ হলো?',
      'সেকলোতে আরও ৫০ পাতা স্টক যোগ করো'
    ]
  },
  'cat-clothing': {
    quickSaleBannerHint: 'সুতি পাঞ্জাবি ১টা ৯৫০, ফরমাল শার্ট ১টা ৭৫০',
    quickSaleSuggestions: [
      'সুতি পাঞ্জাবি ১টা ৯৫০ টাকা',
      'ফরমাল শার্ট ১টা ৭৫০ টাকা',
      'জিন্স প্যান্ট ১টা ১১০০ টাকা',
      'গোলগলা টি-শার্ট ২টা ৭০০ টাকা',
      'সুতি লুঙ্গি ১টা ৪৫০ টাকা',
      'কটন থ্রি-পিস ১টা ১৪৫০ টাকা'
    ],
    stockInHint: 'সুতি পাঞ্জাবি ২০টা স্টক যোগ করো কেনা ৭০০',
    stockInSuggestions: [
      'সুতি পাঞ্জাবি ২০টা কেনা ৭০০',
      'জিন্স প্যান্ট ৩০টা কেনা ৮৫০',
      'টি-শার্ট ৫০টা কেনা ২৫০'
    ],
    productEntryHint: 'সুতি পাঞ্জাবি ২০ পিস কেনা ৭০০ বিক্রয় ৯৫০',
    assistantSuggestions: [
      'কালাম ভাই ১০০০ টাকা বাকি নিল',
      'রহিম ভাই ৫০০ টাকা বাকি দিল',
      'পাঞ্জাবির স্টক কত আছে?',
      'আজকে কত পোশাক বিক্রি হলো?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-shoes': {
    quickSaleBannerHint: 'লেদার সু ১ জোড়া ১২৫০, বাটা স্যান্ডেল ১ জোড়া ২৫০',
    quickSaleSuggestions: [
      'জেন্টস লেদার সু ১ জোড়া ১২৫০ টাকা',
      'ক্যাজুয়াল স্নিকার্স ১ জোড়া ৯৫০ টাকা',
      'লেডিস হিল স্যান্ডেল ১ জোড়া ৭৫০ টাকা',
      'বাটার স্পঞ্জের স্যান্ডেল ১ জোড়া ২৫০ টাকা',
      'সুতি মোজা ২ জোড়া ১২০ টাকা',
      'জুতার পোলিশ ১ সেট ৯০ টাকা'
    ],
    stockInHint: 'লেদার সু ১০ জোড়া স্টক যোগ করো কেনা ৯০০',
    stockInSuggestions: [
      'লেদার সু ১০ জোড়া কেনা ৯০০',
      'স্নিকার্স ১৫ জোড়া কেনা ৭০০',
      'স্যান্ডেল ২০ জোড়া কেনা ১৮০'
    ],
    productEntryHint: 'জেন্টস লেদার সু ১০ জোড়া কেনা ৯০০ বিক্রয় ১২৫০',
    assistantSuggestions: [
      'কালাম ভাই ৫০০ টাকা বাকি নিল',
      'আজকে কত জোড়া জুতা বিক্রি হলো?',
      'লেদার সুর স্টক কত আছে?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-hardware': {
    quickSaleBannerHint: 'পাইপ ২০ ফুট ৯০০, পানির কল ১টা ৩২০, এলইডি বাল্ব ১টা ১৫০',
    quickSaleSuggestions: [
      'পিপিআর পাইপ ২০ ফুট ৯০০ টাকা',
      'পিতলের পানির কল ১টা ৩২০ টাকা',
      'এলইডি বাল্ব ১২W ২টা ৩০০ টাকা',
      'মাল্টিপ্লাগ ১টা ২৮০ টাকা',
      'কালো কসটেপ ২ রোল ৫০ টাকা',
      'সিমেন্ট ১ ব্যাগ ৫২০ টাকা'
    ],
    stockInHint: 'এলইডি বাল্ব ৫০টা স্টক যোগ করো কেনা ১১০',
    stockInSuggestions: [
      'এলইডি বাল্ব ৫০ পিস কেনা ১১০',
      'পিপিআর পাইপ ১০০ ফুট কেনা ৩৫',
      'পানির কল ২০ পিস কেনা ২৪০'
    ],
    productEntryHint: 'এলইডি বাল্ব ৫০ পিস কেনা ১১০ বিক্রয় ১৫০',
    assistantSuggestions: [
      'মিস্ত্রি রহিম ভাই ২০০০ টাকা বাকি নিল',
      'আজকে কত মালামাল বিক্রি হলো?',
      'বাল্বের স্টক কত আছে?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-mobile': {
    quickSaleBannerHint: 'ফাস্ট চার্জার ১টা ৫৫০, টাইপ-সি ক্যাবল ১টা ১৫০',
    quickSaleSuggestions: [
      'স্ক্রিন গ্লাস ১টা ১০০ টাকা',
      'টাইপ-সি ক্যাবল ১টা ১৫০ টাকা',
      '২০W ফাস্ট চার্জার ১টা ৫৫০ টাকা',
      'বেসাস হেডফোন ১টা ২২০ টাকা',
      'ব্যাক কভার ১টা ১২০ টাকা',
      'মেমোরি কার্ড ৩২GB ১টা ৪২০ টাকা'
    ],
    stockInHint: 'টাইপ-সি ক্যাবল ৩০টা স্টক যোগ করো কেনা ৯০',
    stockInSuggestions: [
      'টাইপ-সি ক্যাবল ৩০ পিস কেনা ৯০',
      'চার্জার ২০ পিস কেনা ৩৫০',
      'গ্লাস ৫০ পিস কেনা ৪০'
    ],
    productEntryHint: 'ফাস্ট চার্জার ২০ পিস কেনা ৩৫০ বিক্রয় ৫৫০',
    assistantSuggestions: [
      'কালাম ভাই ৫০০ টাকা বাকি নিল',
      'চার্জারের স্টক কত আছে?',
      'আজকে কত গ্যাজেট বিক্রি হলো?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-restaurant': {
    quickSaleBannerHint: 'চিকেন বিরিয়ানি ২ প্লেট ৩৬০, বোরহানি ২ বোতল ১৬০',
    quickSaleSuggestions: [
      'চিকেন দম বিরিয়ানি ২ প্লেট ৩৬০ টাকা',
      'বিফ ভুনা খিচুড়ি ১ প্লেট ২২০ টাকা',
      'মোগলাই পরোটা ২টা ১২০ টাকা',
      'চিকেন গ্রিল ও নান ১ সেট ১৪০ টাকা',
      'স্পেশাল ফালুদা ১ গ্লাস ১১০ টাকা',
      'বোরহানি ৫০০ml ১ বোতল ৮০ টাকা'
    ],
    stockInHint: 'চাল ৫০ কেজি স্টক যোগ করো কেনা ৬৫',
    stockInSuggestions: [
      'পোলাও চাল ৫০ কেজি কেনা ১০০',
      'মুরগি ২০ কেজি কেনা ১৯০'
    ],
    productEntryHint: 'চিকেন বিরিয়ানি ২০ প্লেট কেনা ১২০ বিক্রয় ১৮০',
    assistantSuggestions: [
      'আজকে মোট কত বিক্রি হলো?',
      'আজকে কত লাভ হলো?',
      'বিরিয়ানি কত প্লেট বিক্রি হলো?'
    ]
  },
  'cat-tea': {
    quickSaleBannerHint: 'দুধ চা ৪ কাপ ৬০, সিঙ্গাড়া ৪টা ৪০, বেনসন ২ শলা ৩০',
    quickSaleSuggestions: [
      'স্পেশাল দুধ চা ৪ কাপ ৬০ টাকা',
      'লেবু রং চা ২ কাপ ২০ টাকা',
      'গরম সিঙ্গাড়া ৪টা ৪০ টাকা',
      'বেনসন সিগারেট ২ শলা ৩০ টাকা',
      'মিষ্টি পান ২ খিলি ২০ টাকা',
      'টোস্ট বিস্কুট ৪টা ৪০ টাকা'
    ],
    stockInHint: 'বেনসন ১ প্যাকেট স্টক যোগ করো কেনা ২৭০',
    stockInSuggestions: [
      'বেনসন ৫ প্যাকেট কেনা ২৭০',
      'চা পাতা ২ কেজি কেনা ৪৫০',
      'চিনি ৫ কেজি কেনা ১৩০'
    ],
    productEntryHint: 'দুধ চা ৫০ কাপ কেনা ৮ বিক্রয় ১৫',
    assistantSuggestions: [
      'আজকে মোট কত চা বিক্রি হলো?',
      'আজকে কত বিক্রি হলো?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-meat-fish': {
    quickSaleBannerHint: 'গরুর মাংস ১ কেজি ৭৫০, ব্রয়লার মুরগি ২ কেজি ৪০০',
    quickSaleSuggestions: [
      'গরুর মাংস ১ কেজি ৭৫০ টাকা',
      'খাসির মাংস ১ কেজি ১১০০ টাকা',
      'ব্রয়লার মুরগি ২ কেজি ৪০০ টাকা',
      'দেশি মুরগি ১টা ৪৫০ টাকা',
      'রুই মাছ ২ কেজি ৬০০ টাকা',
      'চিংড়ি মাছ ৫০০ গ্রাম ৪৫০ টাকা'
    ],
    stockInHint: 'গরুর মাংস ৫০ কেজি স্টক যোগ করো কেনা ৬৫০',
    stockInSuggestions: [
      'গরুর মাংস ৫০ কেজি কেনা ৬৫০',
      'মুরগি ৪০ কেজি কেনা ১৭০',
      'রুই মাছ ৩০ কেজি কেনা ২২০'
    ],
    productEntryHint: 'গরুর মাংস ৫০ কেজি কেনা ৬৫০ বিক্রয় ৭৫০',
    assistantSuggestions: [
      'আজকে কত কেজি মাংস বিক্রি হলো?',
      'আজকে কত বিক্রি হলো?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-bakery': {
    quickSaleBannerHint: 'ভ্যানিলা কেক ১ পাউন্ড ৪৫০, রসগোল্লা ১ কেজি ৩২০',
    quickSaleSuggestions: [
      'ভ্যানিলা কেক ১ পাউন্ড ৪৫০ টাকা',
      'স্পেশাল রসগোল্লা ১ কেজি ৩২০ টাকা',
      'চকলেট পেস্ট্রি ২টা ১৬০ টাকা',
      'স্পেশাল পাউরুটি ১টা ৬০ টাকা',
      'বাটার বনরুটি ৪টা ৮০ টাকা',
      'ঘিয়ে ভাজা নিমকি ৫০০ গ্রাম ১৫০ টাকা'
    ],
    stockInHint: 'পাউরুটি ৩০টা স্টক যোগ করো কেনা ৪৫',
    stockInSuggestions: [
      'পাউরুটি ৩০ পিস কেনা ৪৫',
      'কেক ১০ পাউন্ড কেনা ৩০০'
    ],
    productEntryHint: 'ভ্যানিলা কেক ১০ পাউন্ড কেনা ৩০০ বিক্রয় ৪৫০',
    assistantSuggestions: [
      'আজকে কত টাকার মিষ্টি বিক্রি হলো?',
      'আজকে কত বিক্রি হলো?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-furniture': {
    quickSaleBannerHint: 'সেগুন কাঠের খাট ১টা ৩৫০০০, ডাইনিং টেবিল ১টা ২২০০০',
    quickSaleSuggestions: [
      'সেগুন কাঠের খাট ১টা ৩৫০০০ টাকা',
      'ডাইনিং টেবিল সেট ১টা ২২০০০ টাকা',
      '৪ পাল্লার আলমিরা ১টা ২৮০০০ টাকা',
      'সোফা সেট ১টা ৪৫০০০ টাকা',
      'অফিস রিভলভিং চেয়ার ১টা ৪৫০০ টাকা'
    ],
    stockInHint: 'অফিস চেয়ার ৫টা স্টক যোগ করো কেনা ৩২০০',
    stockInSuggestions: [
      'অফিস চেয়ার ৫ পিস কেনা ৩২০০',
      'ডাইনিং সেট ২টা কেনা ১৫০০০'
    ],
    productEntryHint: 'অফিস চেয়ার ৫ পিস কেনা ৩২০০ বিক্রয় ৪৫০০',
    assistantSuggestions: [
      'কালাম ভাই ১০০০০ টাকা বাকি দিল',
      'আজকে কত ফার্নিচার বিক্রি হলো?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-stationery': {
    quickSaleBannerHint: 'কাগজ ১ রিম ৪০০, জেল পেন ১ ডজন ১২০',
    quickSaleSuggestions: [
      'এ-ফোর সাইজ কাগজ ১ রিম ৪০০ টাকা',
      'ম্যাটাদোর জেল পেন ১ ডজন ১২০ টাকা',
      'ক্লাস নোটবুক খাতা ৩টা ১৮০ টাকা',
      'জ্যামিতি বক্স ১টা ১৪০ টাকা',
      'কালার পেন্সিল সেট ১টা ১২০ টাকা'
    ],
    stockInHint: 'কাগজ ১০ রিম স্টক যোগ করো কেনা ৩২০',
    stockInSuggestions: [
      'কাগজ ১০ রিম কেনা ৩২০',
      'কলম ২০ ডজন কেনা ৮০'
    ],
    productEntryHint: 'এ-ফোর কাগজ ১০ রিম কেনা ৩২০ বিক্রয় ৪০০',
    assistantSuggestions: [
      'আজকে কত বই-খাতা বিক্রি হলো?',
      'কাগজের স্টক কত আছে?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-cosmetics': {
    quickSaleBannerHint: 'নিভিয়া বডি লোশন ১ বোতল ৩৫০, ফেসওয়াশ ১ টিউব ১৯০',
    quickSaleSuggestions: [
      'নিভিয়া বডি লোশন ১ বোতল ৩৫০ টাকা',
      'হিমালয়া নিম ফেসওয়াশ ১ টিউব ১৯০ টাকা',
      'ম্যাট লিপস্টিক ১টা ২৬০ টাকা',
      'সানসিল্ক শ্যাম্পু ১ বোতল ২২০ টাকা',
      'নেইলপলিশ ২টা ১৬০ টাকা',
      'পারফিউম ১ বোতল ৫৫০ টাকা'
    ],
    stockInHint: 'বডি লোশন ২০ বোতল স্টক যোগ করো কেনা ২৭০',
    stockInSuggestions: [
      'বডি লোশন ২০ বোতল কেনা ২৭০',
      'ফেসওয়াশ ৩০ টিউব কেনা ১৪০'
    ],
    productEntryHint: 'বডি লোশন ২০ বোতল কেনা ২৭০ বিক্রয় ৩৫০',
    assistantSuggestions: [
      'আজকে কত কসমেটিকস বিক্রি হলো?',
      'লোশনের স্টক কত আছে?',
      'আজকে কত লাভ হলো?'
    ]
  },
  'cat-grocery': {
    quickSaleBannerHint: 'চাল ২ কেজি ৬০, ডাল ১ কেজি ১৪০, তেল ১৮০',
    quickSaleSuggestions: [
      'চাল ২ কেজি ৬০ টাকা',
      'ডাল ১ কেজি ১৪০ টাকা',
      'সয়াবিন তেল ১ লিটার ১৮০ টাকা',
      'চিনি ১ কেজি ১৪০ টাকা',
      '১ হালি ডিম ৪৮ টাকা',
      '২টা লাক্স সাবান ১২০ টাকা'
    ],
    stockInHint: 'চিনিতে ৫০ কেজি স্টক যোগ করো কেনা ১২০',
    stockInSuggestions: [
      'চিনি ৫০ কেজি কেনা ১২০',
      'সয়াবিন তেল ৩০ লিটার কেনা ১৫৫',
      'মিনিকেট চাল ১০০ কেজি কেনা ৫৮'
    ],
    productEntryHint: 'মিনিকেট চাল ৫০ কেজি কেনা ৫৮ বিক্রয় ৭০',
    assistantSuggestions: [
      'কালাম ভাই ৫০০ টাকা বাকি নিল',
      'রহিম ভাই ২০০ টাকা বাকি দিল',
      'চিনি ২ কেজি, ডাল ১ কেজি',
      'আজকে কত বিক্রি হলো?',
      'আজকে কত লাভ হলো?',
      'তীর তেলের স্টক কত আছে?'
    ]
  }
};

export function getIndustryVoiceConfig(industryId?: string): IndustryVoiceConfig {
  const key = normalizeIndustryId(industryId);
  return INDUSTRY_VOICE_CONFIGS[key] || INDUSTRY_VOICE_CONFIGS['cat-grocery'];
}

export interface IndustryProductSuggestion {
  name: string;
  unit: string;
  price: number;
  costPrice?: number;
  icon: string;
  generic?: string;
  size?: string;
  brand?: string;
}

export const INDUSTRY_PRODUCT_SUGGESTIONS: Record<string, IndustryProductSuggestion[]> = {
  'cat-pharmacy': [
    { name: 'নাপা এক্সট্রা ৫০০ মি.গ্রা.', unit: 'পাতা', price: 30, costPrice: 22, icon: '💊', generic: 'Paracetamol 500mg + Caffeine 65mg', brand: 'Beximco' },
    { name: 'সেকলো ২০ মি.গ্রা.', unit: 'পাতা', price: 70, costPrice: 58, icon: '🧪', generic: 'Omeprazole 20mg', brand: 'Square' },
    { name: 'তুসকা কফ সিরাপ ১০০ml', unit: 'বোতল', price: 95, costPrice: 78, icon: '🧴', generic: 'Dextromethorphan + Guaiphenesin', brand: 'Square' },
    { name: 'এসএমসি ওরস্যালাইন-এন', unit: 'প্যাকেট', price: 6, costPrice: 4.8, icon: '💧', generic: 'Oral Rehydration Salts', brand: 'SMC' },
    { name: 'অ্যালাট্রোল ১০ মি.গ্রা.', unit: 'পাতা', price: 40, costPrice: 32, icon: '💊', generic: 'Cetirizine Dihydrochloride', brand: 'Square' },
    { name: 'ফ্ল্যাজিল ৪০০ মি.গ্রা.', unit: 'পাতা', price: 35, costPrice: 28, icon: '💊', generic: 'Metronidazole 400mg', brand: 'Sanofi' },
    { name: 'স্যাভলন এন্টিসেপটিক লিকুইড', unit: 'বোতল', price: 120, costPrice: 98, icon: '🧴', generic: 'Chlorhexidine + Cetrimide', brand: 'ACI' },
    { name: 'হিস্টাসিন ৪ মি.গ্রা.', unit: 'পাতা', price: 10, costPrice: 7, icon: '💊', generic: 'Chlorpheniramine Maleate', brand: 'Beximco' }
  ],
  'cat-grocery': [
    { name: 'মিনিকেট চাল ৫০ কেজি বস্তা', unit: 'বস্তা', price: 3500, costPrice: 3200, icon: '🍚', brand: 'রশিদ অটো রাইস' },
    { name: 'তীর পরিশোধিত সয়াবিন তেল ১ লিটার', unit: 'লিটার', price: 185, costPrice: 168, icon: '🫒', brand: 'তীর / City Group' },
    { name: 'ফ্রেশ পরিশোধিত চিনি ১ কেজি', unit: 'কেজি', price: 135, costPrice: 122, icon: '🧂', brand: 'ফ্রেশ / Meghna' },
    { name: 'মসুর ডাল প্রিমিয়াম ১ কেজি', unit: 'কেজি', price: 140, costPrice: 125, icon: '🥣', brand: 'দেশি' },
    { name: 'ফার্মের লাল ডিম ১ হালি', unit: 'হালি', price: 48, costPrice: 40, icon: '🥚', brand: 'লোকাল পোল্ট্রি' },
    { name: 'লাক্স বিউটি সাবান ১০০ গ্রাম', unit: 'পিস', price: 60, costPrice: 50, icon: '🧼', brand: 'ইউনিলিভার' },
    { name: 'তীর আটা ২ কেজি প্যাকেট', unit: 'প্যাকেট', price: 110, costPrice: 95, icon: '🌾', brand: 'তীর' },
    { name: 'আইওডিনযুক্ত লবণ ১ কেজি', unit: 'কেজি', price: 40, costPrice: 32, icon: '🧂', brand: 'এসিআই' }
  ],
  'cat-clothing': [
    { name: 'প্রিমিয়াম সুতি পাঞ্জাবি', unit: 'পিস', price: 950, costPrice: 680, icon: '👕', brand: 'হ্যান্ডলুম কটন', size: '40, 42, 44' },
    { name: 'স্লিম ফিট ডেনিম জিন্স প্যান্ট', unit: 'পিস', price: 1200, costPrice: 850, icon: '👖', brand: 'ডেনিম ওয়ার্ল্ড', size: '30, 32, 34' },
    { name: 'ঢাকাই জামদানি শাড়ি', unit: 'পিস', price: 2800, costPrice: 2100, icon: '👗', brand: 'রূপগঞ্জ তাঁতি' },
    { name: '১০০% কটন গোলগলা টি-শার্ট', unit: 'পিস', price: 350, costPrice: 220, icon: '👕', brand: 'এক্সপোর্ট কোয়ালিটি', size: 'M, L, XL' },
    { name: 'আরামদায়ক সুতি প্রিন্ট লুঙ্গি', unit: 'পিস', price: 450, costPrice: 340, icon: '🧣', brand: 'আমানত শাহ্' },
    { name: 'কটন থ্রি-পিস আনস্টিচড', unit: 'সেট', price: 1450, costPrice: 1050, icon: '👗', brand: 'জয়পুরি কটন' }
  ],
  'cat-shoes': [
    { name: 'জেন্টস লেদার ফরমাল সু', unit: 'জোড়া', price: 1350, costPrice: 980, icon: '👞', brand: 'এপেক্স স্টাইল', size: '40, 41, 42' },
    { name: 'ক্যাজুয়াল স্পোর্টস স্নিকার্স', unit: 'জোড়া', price: 980, costPrice: 700, icon: '👟', brand: 'লোটো স্টাইল', size: '39, 40, 41' },
    { name: 'লেডিস ফ্যাশন হিল স্যান্ডেল', unit: 'জোড়া', price: 750, costPrice: 520, icon: '👡', brand: 'বাটা কালেকশন' },
    { name: 'বাটার ওয়াটারপ্রুফ স্পঞ্জ স্যান্ডেল', unit: 'জোড়া', price: 250, costPrice: 180, icon: '🩴', brand: 'বাটা' },
    { name: 'সুতি মোজা প্রিমিয়াম কম্বো', unit: 'জোড়া', price: 120, costPrice: 75, icon: '🧦', brand: 'ইমপোর্ট' }
  ],
  'cat-hardware': [
    { name: 'সুপার স্টার এলইডি বাল্ব ২০W', unit: 'পিস', price: 180, costPrice: 135, icon: '💡', brand: 'Super Star' },
    { name: 'আরএফএল পিপিআর পাইপ ১ ইঞ্চি ২০ ফুট', unit: 'ফুট', price: 45, costPrice: 32, icon: '🔩', brand: 'RFL Pipes' },
    { name: 'পিতলের হেভি পানির ট্যাপ কল', unit: 'পিস', price: 320, costPrice: 240, icon: '🚰', brand: 'National Brass' },
    { name: 'বিআরবি কপার তার ১.৫ আরএম', unit: 'মিটার', price: 65, costPrice: 52, icon: '🔌', brand: 'BRB Cable' },
    { name: 'প্রিমিয়ার পোর্টল্যান্ড সিমেন্ট ৫০ কেজি', unit: 'ব্যাগ', price: 520, costPrice: 475, icon: '🧱', brand: 'Premier Cement' },
    { name: 'হেভি পিভিসি ইলেকট্রিক টেপ', unit: 'রোল', price: 25, costPrice: 16, icon: '⬛', brand: 'Wonder Tape' }
  ],
  'cat-mobile': [
    { name: '২০W পিডি টাইপ-সি ফাস্ট চার্জার', unit: 'পিস', price: 550, costPrice: 380, icon: '🔌', brand: 'Baseus' },
    { name: 'ব্রেইডেড ফাস্ট চার্জিং ক্যাবল ১.২মি.', unit: 'পিস', price: 160, costPrice: 95, icon: '⚡', brand: 'Joyroom' },
    { name: '৯ডি কার্ভড টেম্পারড গ্লাস', unit: 'পিস', price: 120, costPrice: 45, icon: '📱', brand: 'Universal' },
    { name: 'ব্লুটুথ ওয়্যারলেস নেকব্যান্ড হেডফোন', unit: 'পিস', price: 650, costPrice: 460, icon: '🎧', brand: 'UiiSii' },
    { name: 'সিলিকন শকপ্রুফ ব্যাক কভার', unit: 'পিস', price: 150, costPrice: 65, icon: '🛡️', brand: 'Generic' }
  ],
  'cat-restaurant': [
    { name: 'স্পেশাল চিকেন দম বিরিয়ানি', unit: 'প্লেট', price: 180, costPrice: 120, icon: '🍗' },
    { name: 'বিফ ভুনা খিচুড়ি স্পেশাল', unit: 'প্লেট', price: 220, costPrice: 150, icon: '🍛' },
    { name: 'চিকেন গ্রিল ফুল ও ৪টি নান', unit: 'সেট', price: 450, costPrice: 310, icon: '🍗' },
    { name: 'মোগলাই পরোটা উইথ স্পেশাল সালাদ', unit: 'পিস', price: 70, costPrice: 42, icon: '🫓' },
    { name: 'স্পেশাল কাঁচা মরিচ বোরহানি ৫০০ml', unit: 'বোতল', price: 80, costPrice: 48, icon: '🥛' }
  ],
  'cat-tea': [
    { name: 'স্পেশাল মালাই দুধ চা', unit: 'কাপ', price: 15, costPrice: 8, icon: '☕' },
    { name: 'লেমন জিঞ্জার রং চা', unit: 'কাপ', price: 10, costPrice: 4, icon: '🍵' },
    { name: 'মুচমুচে গরম সিঙ্গাড়া', unit: 'পিস', price: 10, costPrice: 5.5, icon: '🥟' },
    { name: 'বেনসন অ্যান্ড হেজেস সিগারেট', unit: 'শলা', price: 15, costPrice: 13.5, icon: '🚬', brand: 'BAT' },
    { name: 'স্পেশাল মিষ্টি পান', unit: 'খিলি', price: 12, costPrice: 6, icon: '🍃' }
  ],
  'cat-meat-fish': [
    { name: 'দেশি টাটকা গরুর মাংস ১ কেজি', unit: 'কেজি', price: 750, costPrice: 660, icon: '🥩' },
    { name: 'ফার্মের ব্রয়লার মুরগি লাইভ', unit: 'কেজি', price: 195, costPrice: 165, icon: '🐔' },
    { name: 'নদীর তাজা রুই মাছ ২ কেজি সাইজ', unit: 'কেজি', price: 340, costPrice: 280, icon: '🐟' },
    { name: 'খাসির মাংস ফ্রেশ ১ কেজি', unit: 'কেজি', price: 1100, costPrice: 960, icon: '🍖' },
    { name: 'গলদা চিংড়ি গ্রেড-এ ৫০০ গ্রাম', unit: 'কেজি', price: 850, costPrice: 720, icon: '🦐' }
  ],
  'cat-sweet': [
    { name: 'খাঁটি ছানার স্পেশাল রসগোল্লা', unit: 'কেজি', price: 340, costPrice: 240, icon: '⚪' },
    { name: 'ভ্যানিলা বাটার কেক ১ পাউন্ড', unit: 'পাউন্ড', price: 450, costPrice: 290, icon: '🎂' },
    { name: 'ঘিয়ে ভাজা স্পেশাল চমচম', unit: 'কেজি', price: 380, costPrice: 260, icon: '🍬' },
    { name: 'স্পেশাল দুধ ছানার সন্দেশ', unit: 'কেজি', price: 550, costPrice: 390, icon: '🥮' },
    { name: 'খাস্তা নিমকি ৫০০ গ্রাম প্যাকেট', unit: 'প্যাকেট', price: 120, costPrice: 75, icon: '🥨' }
  ],
  'cat-furniture': [
    { name: 'চিটাগাং সেগুন কাঠের খাট (৬×৭ ফিট)', unit: 'পিস', price: 35000, costPrice: 27000, icon: '🛏️' },
    { name: '৬ চেয়ারের ডাইনিং টেবিল সেট', unit: 'সেট', price: 24000, costPrice: 18500, icon: '🪑' },
    { name: '৪ পাল্লার আধুনিক উডেন আলমিরা', unit: 'পিস', price: 28000, costPrice: 21000, icon: '🚪' },
    { name: 'এক্সিকিউটিভ অফিস রিভলভিং চেয়ার', unit: 'পিস', price: 4800, costPrice: 3400, icon: '💺' }
  ],
  'cat-stationery': [
    { name: 'এ-ফোর ৮০ জিএসএম পেপার ১ রিম', unit: 'রিম', price: 420, costPrice: 345, icon: '📄', brand: 'Double A' },
    { name: 'ম্যাটাডোর হাই-স্কুল বলপেন ১ ডজন', unit: 'ডজন', price: 60, costPrice: 44, icon: '🖊️', brand: 'Matador' },
    { name: 'হার্ডকভার প্রিমিয়াম খাতা ২০০ পৃষ্ঠা', unit: 'পিস', price: 85, costPrice: 58, icon: '📓', brand: 'Good Luck' },
    { name: 'স্টুডেন্ট জ্যামিতি বক্স ফুল সেট', unit: 'পিস', price: 140, costPrice: 95, icon: '📐', brand: 'Camlin' }
  ],
  'cat-cosmetics': [
    { name: 'নিভিয়া সফট লাইট ময়েশ্চারাইজার', unit: 'বোতল', price: 360, costPrice: 275, icon: '🧴', brand: 'Nivea' },
    { name: 'হিমালয়া পিউরিফাইং নিম ফেসওয়াশ', unit: 'টিউব', price: 195, costPrice: 148, icon: '🧼', brand: 'Himalaya' },
    { name: 'ম্যাট ভেলভেট লং-লাস্টিং লিপস্টিক', unit: 'পিস', price: 280, costPrice: 185, icon: '💄', brand: 'Maybelline' },
    { name: 'সানসিল্ক ব্ল্যাক শাইন শ্যাম্পু ৩৫০ml', unit: 'বোতল', price: 320, costPrice: 255, icon: '🧴', brand: 'Sunsilk' }
  ]
};

export function getIndustryProductSuggestions(industryId?: string): IndustryProductSuggestion[] {
  const key = normalizeIndustryId(industryId);
  return INDUSTRY_PRODUCT_SUGGESTIONS[key] || INDUSTRY_PRODUCT_SUGGESTIONS['cat-grocery'];
}

export function getIndustryProductPlaceholder(industryId?: string): string {
  switch (normalizeIndustryId(industryId)) {
    case 'cat-pharmacy':
      return 'যেমন: নাপা এক্সট্রা ৫০০ মি.গ্রা., সেক্লো ২০ মি.গ্রা., হিস্টাসিন';
    case 'cat-clothing':
      return 'যেমন: সুতি পাঞ্জাবি, স্লিম ফিট জিন্স প্যান্ট, জামদানি শাড়ি';
    case 'cat-shoes':
      return 'যেমন: জেন্টস লেদার ফরমাল সু, ক্যাজুয়াল স্নিকার্স, স্পঞ্জ স্যান্ডেল';
    case 'cat-hardware':
      return 'যেমন: সুপার স্টার এলইডি বাল্ব ২০W, আরএফএল পিপিআর পাইপ ১ ইঞ্চি';
    case 'cat-mobile':
      return 'যেমন: ২০W টাইপ-সি ফাস্ট চার্জার, ৯ডি গ্লাস, ব্লুটুথ হেডফোন';
    case 'cat-restaurant':
      return 'যেমন: চিকেন দম বিরিয়ানি, বিফ ভুনা খিচুড়ি, মোগলাই পরোটা';
    case 'cat-tea':
      return 'যেমন: স্পেশাল মালাই দুধ চা, গরম সিঙ্গাড়া, বেনসন সিগারেট';
    case 'cat-meat-fish':
      return 'যেমন: দেশি গরুর মাংস ১ কেজি, ব্রয়লার মুরগি, রুই মাছ';
    case 'cat-sweet':
      return 'যেমন: স্পেশাল রসগোল্লা ১ কেজি, ভ্যানিলা কেক ১ পাউন্ড, চমচম';
    case 'cat-furniture':
      return 'যেমন: সেগুন কাঠের খাট, ডাইনিং টেবিল সেট, রিভলভিং চেয়ার';
    case 'cat-stationery':
      return 'যেমন: এ-ফোর ফটোকপি কাগজ ১ রিম, ম্যাটাডোর জেল পেন ১ ডজন';
    case 'cat-cosmetics':
      return 'যেমন: নিভিয়া বডি লোশন, নিম ফেসওয়াশ, ম্যাট লিপস্টিক';
    case 'cat-grocery':
    default:
      return 'যেমন: মিনিকেট চাল ৫০ কেজি বস্তা, তীর সয়াবিন তেল, চিনি';
  }
}

export function getIndustryBrandPlaceholder(industryId?: string): string {
  switch (normalizeIndustryId(industryId)) {
    case 'cat-pharmacy':
      return 'যেমন: Square / Beximco / Incepta / Renata';
    case 'cat-clothing':
      return 'যেমন: আড়ং / রিচম্যান / জারা / লোকাল তাঁত';
    case 'cat-shoes':
      return 'যেমন: বাটা / এপেক্স / লোটো / পেগাসাস';
    case 'cat-hardware':
      return 'যেমন: সুপার স্টার / আরএফএল / গাজী / বিআরবি';
    case 'cat-mobile':
      return 'যেমন: স্যামসাং / শাওমি / বেসাস / অ্যানকার';
    case 'cat-stationery':
      return 'যেমন: ম্যাটাডোর / ডাবল-এ / বাশার / অলিম্পিক';
    case 'cat-cosmetics':
      return 'যেমন: নিভিয়া / হিমালয়া / লাক্স / মেবিলিন';
    case 'cat-grocery':
    default:
      return 'যেমন: তীর / রূপচাঁদা / ফ্রেশ / এসিআই / প্রাণ';
  }
}

export function getIndustrySearchPlaceholder(industryId?: string): string {
  switch (normalizeIndustryId(industryId)) {
    case 'cat-pharmacy':
      return 'ঔষধের নাম, জেনেরিক বা বারকোড খুঁজুন...';
    case 'cat-clothing':
      return 'পোশাকের নাম, সাইজ বা বারকোড খুঁজুন...';
    case 'cat-shoes':
      return 'জুতো, স্যান্ডেল বা সাইজ খুঁজুন...';
    case 'cat-hardware':
      return 'হার্ডওয়্যার মালামাল বা কোড খুঁজুন...';
    case 'cat-mobile':
      return 'মোবাইল এক্সেসরিজ বা মডেল খুঁজুন...';
    case 'cat-restaurant':
      return 'মেনু আইটেম বা খাবার খুঁজুন...';
    case 'cat-tea':
      return 'চা বা স্ন্যাক্স আইটেম খুঁজুন...';
    case 'cat-meat-fish':
      return 'মাংস বা মাছের নাম খুঁজুন...';
    case 'cat-sweet':
      return 'মিষ্টি বা বেকারি আইটেম খুঁজুন...';
    case 'cat-stationery':
      return 'বই-খাতা বা স্টেশনারি খুঁজুন...';
    case 'cat-cosmetics':
      return 'কসমেটিকস পণ্যের নাম খুঁজুন...';
    case 'cat-grocery':
    default:
      return 'মুদি পণ্যের নাম বা বারকোড খুঁজুন...';
  }
}

export function getDefaultIndustryUnit(industryId?: string): string {
  const currentKey = normalizeIndustryId(industryId);
  const units = INDUSTRY_UNITS[currentKey];
  if (units && units.length > 0) {
    return units[0].value;
  }
  return 'পিস';
}

export function getIndustryDealerPlaceholder(industryId?: string): string {
  switch (normalizeIndustryId(industryId)) {
    case 'cat-pharmacy':
      return 'যেমন: স্কয়ার ফার্মা / বেক্সিমকো ডিপো / ইনসেপ্টা';
    case 'cat-clothing':
      return 'যেমন: ইসলামপুর পাইকার / আড়ং ডিলার / তাঁত পল্লী';
    case 'cat-shoes':
      return 'যেমন: বাটা সেন্ট্রাল ডিপো / এপেক্স ডিস্ট্রিবিউটর';
    case 'cat-hardware':
      return 'যেমন: ন্যাশনাল হার্ডওয়্যার / আরএফএল পাইকারি';
    case 'cat-mobile':
      return 'যেমন: স্টারটেক / গ্যাজেট প্লাস ইমপোর্টার / স্মার্ট টেক';
    case 'cat-restaurant':
      return 'যেমন: কাওরানবাজার সবজি সাপ্লায়ার / ফ্রেশ মিট সাপ্লাই';
    case 'cat-tea':
      return 'যেমন: সুরমা চা বাগান এজেন্সি / আবুল অ্যান্ড ব্রাদার্স';
    case 'cat-meat-fish':
      return 'যেমন: খামারি বাবলু মিয়া / চাঁদপুর মাছের আড়ত';
    case 'cat-sweet':
    case 'cat-bakery':
      return 'যেমন: ঘোষ ডেইরি ফার্ম / মিল্ক ভিটা ডিস্ট্রিবিউটর';
    case 'cat-furniture':
      return 'যেমন: সেগুন কাঠ মিল / চিটাগাং টিম্বার মার্চেন্ট';
    case 'cat-stationery':
      return 'যেমন: বাংলাবাজার পাইকারি প্রেস / ডাবল-এ পেপার এজেন্সি';
    case 'cat-cosmetics':
      return 'যেমন: চকবাজার কসমেটিকস ইমপোর্টার / নিভিয়া ডিস্ট্রিবিউটর';
    case 'cat-grocery':
    default:
      return 'যেমন: হাজী ট্রেডার্স / মেসার্স কালাম ব্রাদার্স / মৌলভীবাজার';
  }
}

export function getIndustryLotPlaceholder(industryId?: string): string {
  switch (normalizeIndustryId(industryId)) {
    case 'cat-pharmacy':
      return 'যেমন: ব্যাচ নং B-2026, চালান নং ১০১';
    case 'cat-clothing':
      return 'যেমন: সামার কালেকশন লট ৩, চালান নং ৪৫';
    case 'cat-shoes':
      return 'যেমন: ঈদ কালেকশন লট নং ১২';
    case 'cat-hardware':
      return 'যেমন: চালান নং ৫৪, মেমো ৪২০';
    case 'cat-mobile':
      return 'যেমন: ব্যাচ নং M-88, ইনভয়েস ৭২';
    case 'cat-restaurant':
      return 'যেমন: সকালের ফ্রেশ বাজার চালান';
    case 'cat-tea':
      return 'যেমন: বাগান চালান লট ০৫';
    case 'cat-meat-fish':
      return 'যেমন: সকালের আড়ত চালান নং ০৩';
    case 'cat-sweet':
    case 'cat-bakery':
      return 'যেমন: আজকের মর্নিং বেকিং ব্যাচ';
    case 'cat-furniture':
      return 'যেমন: চিটাগাং কাঠ লট নং ৯';
    case 'cat-stationery':
      return 'যেমন: পেপার রিম কার্টন লট ২০';
    case 'cat-cosmetics':
      return 'যেমন: ইমপোর্ট ব্যাচ নং CS-44';
    case 'cat-grocery':
    default:
      return 'যেমন: নতুন মিনিকেট বস্তা লট নং ১২';
  }
}

export interface IndustryFieldConfig {
  showGenericName: boolean;
  genericNameLabel: string;
  genericNamePlaceholder: string;
  
  showSize: boolean;
  sizeLabel: string;
  sizePlaceholder: string;
  
  showColor: boolean;
  colorLabel: string;
  colorPlaceholder: string;
  
  showBrand: boolean;
  brandLabel: string;
  brandPlaceholder: string;
  
  showWarranty: boolean;
  warrantyLabel: string;
  warrantyPlaceholder: string;
  
  showExpiryDate: boolean;
  expiryDateLabel: string;

  showBatchNumber: boolean;
  batchNumberLabel: string;
  batchNumberPlaceholder: string;

  subUnitExampleText: string;
  subUnitPlaceholder: string;
  defaultRatio: string;
  ratioPrompt: (unit: string, subUnit: string) => string;
}

export function getIndustryFieldVisibility(industryId?: string): IndustryFieldConfig {
  switch (normalizeIndustryId(industryId)) {
    case 'cat-pharmacy':
      return {
        showGenericName: true,
        genericNameLabel: 'জেনেরিক নাম / ফর্মুলা:',
        genericNamePlaceholder: 'যেমন: Paracetamol 500mg + Caffeine 65mg',
        showSize: false,
        sizeLabel: '',
        sizePlaceholder: '',
        showColor: false,
        colorLabel: '',
        colorPlaceholder: '',
        showBrand: true,
        brandLabel: 'ফার্মা কোম্পানি:',
        brandPlaceholder: 'যেমন: Square / Beximco / Incepta',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: true,
        expiryDateLabel: 'মেয়াদোত্তীর্ণের তারিখ:',
        showBatchNumber: true,
        batchNumberLabel: 'ব্যাচ নং:',
        batchNumberPlaceholder: 'যেমন: B-2026',
        subUnitExampleText: 'যেমন: পাতা বনাম ট্যাবলেট',
        subUnitPlaceholder: 'যেমন: ট্যাবলেট, ক্যাপসুল',
        defaultRatio: '10',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'পাতায়'} কত ${subUnit || 'ট্যাবলেট'}?`
      };

    case 'cat-clothing':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'পোশাকের সাইজ:',
        sizePlaceholder: 'যেমন: M, L, XL, 32, 34, 36',
        showColor: true,
        colorLabel: 'রং / কালার:',
        colorPlaceholder: 'যেমন: কালো, সাদা, নেভি ব্লু, লাল',
        showBrand: true,
        brandLabel: 'ব্র্যান্ড / ফেব্রিক:',
        brandPlaceholder: 'যেমন: আড়ং / রিচম্যান / জারা / সুতি তাঁত',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: সেট বা থান বনাম পিস/গজ',
        subUnitPlaceholder: 'যেমন: পিস, গজ',
        defaultRatio: '3',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'সেটে'} কত ${subUnit || 'পিস'}?`
      };

    case 'cat-shoes':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'জুতার সাইজ:',
        sizePlaceholder: 'যেমন: 39, 40, 41, 42, 43, 44',
        showColor: true,
        colorLabel: 'রং / কালার:',
        colorPlaceholder: 'যেমন: কালো, ব্রাউন, খয়েরি',
        showBrand: true,
        brandLabel: 'জুতার ব্র্যান্ড:',
        brandPlaceholder: 'যেমন: বাটা / এপেক্স / লোটো / পেগাসাস',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: কার্টন বনাম জোড়া',
        subUnitPlaceholder: 'যেমন: জোড়া, পিস',
        defaultRatio: '12',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'কার্টনে'} কত ${subUnit || 'জোড়া'}?`
      };

    case 'cat-hardware':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'মাপ / স্পেসিফিকেশন:',
        sizePlaceholder: 'যেমন: ১ ইঞ্চি, ২০W, ২.৫ আরএম, ৩/৪"',
        showColor: false,
        colorLabel: '',
        colorPlaceholder: '',
        showBrand: true,
        brandLabel: 'ব্র্যান্ড / কোম্পানি:',
        brandPlaceholder: 'যেমন: সুপার স্টার / আরএফএল / গাজী / বিআরবি',
        showWarranty: true,
        warrantyLabel: 'ওয়ারেন্টি / গ্যারান্টি:',
        warrantyPlaceholder: 'যেমন: ২ বছর রিপ্লেসমেন্ট',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: বান্ডিল বনাম ফুট / ব্যাগ বনাম কেজি',
        subUnitPlaceholder: 'যেমন: ফুট, মিটার, কেজি',
        defaultRatio: '100',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'বান্ডিলে'} কত ${subUnit || 'ফুট'}?`
      };

    case 'cat-mobile':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'মডেল / র‍্যাম-রম / স্পেক:',
        sizePlaceholder: 'যেমন: 4/64GB, 20W PD, Type-C',
        showColor: true,
        colorLabel: 'কালার:',
        colorPlaceholder: 'যেমন: মিডনাইট ব্ল্যাক, ডিপ পার্পল, সিলভার',
        showBrand: true,
        brandLabel: 'ব্র্যান্ড:',
        brandPlaceholder: 'যেমন: Samsung / Xiaomi / Baseus / Anker',
        showWarranty: true,
        warrantyLabel: 'ওয়ারেন্টি মেয়াদ:',
        warrantyPlaceholder: 'যেমন: ১ বছর অফিসিয়াল ওয়ারেন্টি',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: বক্স বা কার্টন বনাম পিস',
        subUnitPlaceholder: 'যেমন: পিস',
        defaultRatio: '10',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'বক্সে'} কত ${subUnit || 'পিস'}?`
      };

    case 'cat-restaurant':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'সার্ভিং পোর্শন / সাইজ:',
        sizePlaceholder: 'যেমন: ১ জন, ফুল প্লেট, হাফ প্লেট, ১:৩ কম্বো',
        showColor: false,
        colorLabel: '',
        colorPlaceholder: '',
        showBrand: false,
        brandLabel: '',
        brandPlaceholder: '',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: বাটি বা সেট বনাম পিস',
        subUnitPlaceholder: 'যেমন: পিস, প্লেট',
        defaultRatio: '4',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'সেটে'} কত ${subUnit || 'পিস'}?`
      };

    case 'cat-tea':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: false,
        sizeLabel: '',
        sizePlaceholder: '',
        showColor: false,
        colorLabel: '',
        colorPlaceholder: '',
        showBrand: true,
        brandLabel: 'ব্র্যান্ড (সিগারেট/বিস্কুট):',
        brandPlaceholder: 'যেমন: বেনসন, ডার্বি, অলিম্পিক, নেসক্যাফে',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: প্যাকেট বনাম শলা / কাপ',
        subUnitPlaceholder: 'যেমন: শলা, কাপ',
        defaultRatio: '20',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'প্যাকেটে'} কত ${subUnit || 'শলা'}?`
      };

    case 'cat-meat-fish':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'মাছ/মাংস সাইজ ও গ্রেড:',
        sizePlaceholder: 'যেমন: ২-৩ কেজি সাইজ, বড় গলদা, ছোট সাইজ',
        showColor: false,
        colorLabel: '',
        colorPlaceholder: '',
        showBrand: false,
        brandLabel: '',
        brandPlaceholder: '',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: পাল্লা বনাম কেজি',
        subUnitPlaceholder: 'যেমন: কেজি, গ্রাম',
        defaultRatio: '5',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'পাল্লায়'} কত ${subUnit || 'কেজি'}?`
      };

    case 'cat-sweet':
    case 'cat-bakery':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'পাউন্ড / ওজন সাইজ:',
        sizePlaceholder: 'যেমন: ১ পাউন্ড, ২ পাউন্ড, ৫০০ গ্রাম',
        showColor: false,
        colorLabel: '',
        colorPlaceholder: '',
        showBrand: true,
        brandLabel: 'ফ্লেভার / প্রকার:',
        brandPlaceholder: 'যেমন: ভ্যানিলা, চকলেট, খাঁটি ছানা, গাওয়া ঘি',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: true,
        expiryDateLabel: 'খাওয়ার শেষ তারিখ / এক্সপায়ারি:',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: বক্স বনাম পিস বা প্যাকেট',
        subUnitPlaceholder: 'যেমন: পিস, প্যাকেট',
        defaultRatio: '12',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'বক্সে'} কত ${subUnit || 'পিস'}?`
      };

    case 'cat-furniture':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'মাপ / ডাইমেনশন:',
        sizePlaceholder: 'যেমন: ৬×৭ ফিট, ৫×৭ ফিট, ৪ পাল্লা',
        showColor: true,
        colorLabel: 'কালার / পলিশ:',
        colorPlaceholder: 'যেমন: স্পেশাল বার্নিশ, অ্যান্টিক পলিশ, মেহগনি পলিশ',
        showBrand: true,
        brandLabel: 'কাঠ / উপাদান:',
        brandPlaceholder: 'যেমন: চিটাগাং সেগুন, মেহগনি, প্রসেসড উড',
        showWarranty: true,
        warrantyLabel: 'ওয়ারেন্টি / গ্যারান্টি:',
        warrantyPlaceholder: 'যেমন: ১০ বছরের ঘুণে না ধরার গ্যারান্টি',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: সেট বনাম পিস',
        subUnitPlaceholder: 'যেমন: পিস',
        defaultRatio: '4',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'সেটে'} কত ${subUnit || 'পিস'}?`
      };

    case 'cat-stationery':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'সাইজ / পৃষ্ঠা সংখ্যা:',
        sizePlaceholder: 'যেমন: A4 সাইজ, ২০০ পৃষ্ঠা, ১২০ পেজ',
        showColor: true,
        colorLabel: 'কালি / কালার:',
        colorPlaceholder: 'যেমন: কালো, নীল, লাল, সবুজ',
        showBrand: true,
        brandLabel: 'ব্র্যান্ড / প্রকাশনী:',
        brandPlaceholder: 'যেমন: ম্যাটাডোর / ডাবল-এ / বাশার / অলিম্পিক',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: false,
        expiryDateLabel: '',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: রিম বনাম দিস্তা বা ডজন বনাম পিস',
        subUnitPlaceholder: 'যেমন: দিস্তা, পিস',
        defaultRatio: '12',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'ডজনে'} কত ${subUnit || 'পিস'}?`
      };

    case 'cat-cosmetics':
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: true,
        sizeLabel: 'সাইজ / ভলিউম:',
        sizePlaceholder: 'যেমন: ১০০ml, ৫০ গ্রাম, মিনি প্যাক',
        showColor: true,
        colorLabel: 'শেড / কালার:',
        colorPlaceholder: 'যেমন: শেড-০২, রুবি রেড, পিঙ্ক',
        showBrand: true,
        brandLabel: 'কসমেটিকস ব্র্যান্ড:',
        brandPlaceholder: 'যেমন: নিভিয়া / হিমালয়া / লাক্স / মেবিলিন',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: true,
        expiryDateLabel: 'মেয়াদোত্তীর্ণের তারিখ:',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: কার্টন বা বক্স বনাম পিস',
        subUnitPlaceholder: 'যেমন: পিস',
        defaultRatio: '12',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'বক্সে'} কত ${subUnit || 'পিস'}?`
      };

    case 'cat-grocery':
    default:
      return {
        showGenericName: false,
        genericNameLabel: '',
        genericNamePlaceholder: '',
        showSize: false,
        sizeLabel: '',
        sizePlaceholder: '',
        showColor: false,
        colorLabel: '',
        colorPlaceholder: '',
        showBrand: true,
        brandLabel: 'ব্র্যান্ড / কোম্পানি:',
        brandPlaceholder: 'যেমন: তীর / রূপচাঁদা / ফ্রেশ / এসিআই / প্রাণ',
        showWarranty: false,
        warrantyLabel: '',
        warrantyPlaceholder: '',
        showExpiryDate: true,
        expiryDateLabel: 'মেয়াদোত্তীর্ণ তারিখ (প্যাকেটজাত পণ্যে):',
        showBatchNumber: false,
        batchNumberLabel: '',
        batchNumberPlaceholder: '',
        subUnitExampleText: 'যেমন: বস্তা বনাম কেজি',
        subUnitPlaceholder: 'যেমন: কেজি, গ্রাম',
        defaultRatio: '50',
        ratioPrompt: (unit, subUnit) => `১ ${unit || 'বস্তায়'} কত ${subUnit || 'কেজি'}?`
      };
  }
}




