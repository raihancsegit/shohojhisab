export interface IndustryTheme {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  icon: string;
  unit: string;
  receiptSubtitle: string;
  terms: string;
}

export const INDUSTRY_CATEGORIES: Record<string, IndustryTheme> = {
  'cat-grocery': {
    id: 'cat-grocery',
    name: 'মুদি ও ডিপার্টমেন্টাল',
    primaryColor: '#059669',
    accentColor: '#10b981',
    icon: '🛒',
    unit: 'কেজি',
    receiptSubtitle: 'ফ্রেশ মুদি ও নিত্যপ্রয়োজনীয় পণ্যের দোকান',
    terms: 'বিক্রিত মাল ফেরত নেওয়া হয় না।'
  },
  'cat-pharmacy': {
    id: 'cat-pharmacy',
    name: 'ফার্মেসি ও ঔষধ',
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
    icon: '💊',
    unit: 'পাতা',
    receiptSubtitle: 'সকল প্রকার দেশি ও বিদেশি ঔষধের নির্ভরযোগ্য প্রতিষ্ঠান',
    terms: 'কাটা পাতা বা ফ্রিজের ইনজেকশন ফেরত নেওয়া হয় না।'
  },
  'cat-clothing': {
    id: 'cat-clothing',
    name: 'কাপড় ও ফ্যাশন',
    primaryColor: '#7c3aed',
    accentColor: '#a78bfa',
    icon: '👗',
    unit: 'পিস',
    receiptSubtitle: 'লেটেস্ট ডিজাইন ও আরামদায়ক পোশাকের সম্ভার',
    terms: 'ক্যাশ মেমো ছাড়া পণ্য পরিবর্তন করা যাবে না।'
  },
  'cat-electronics': {
    id: 'cat-electronics',
    name: 'ইলেকট্রনিক্স ও গ্যাজেট',
    primaryColor: '#ea580c',
    accentColor: '#fb923c',
    icon: '📱',
    unit: 'পিস',
    receiptSubtitle: 'জেনুইন গ্যাজেট ও ইলেকট্রনিক্স এক্সেসরিজ',
    terms: 'ওয়ারেন্টি সার্ভিসের জন্য মেমো প্রদর্শন আবশ্যক।'
  },
  'cat-hardware': {
    id: 'cat-hardware',
    name: 'হার্ডওয়্যার ও স্যানিটারি',
    primaryColor: '#d97706',
    accentColor: '#fbbf24',
    icon: '🔨',
    unit: 'ফুট',
    receiptSubtitle: 'নির্মাণ ও হার্ডওয়্যার সামগ্রী',
    terms: 'অর্ডারকৃত মালামাল যাচাই করে বুঝে নিন।'
  },
  'cat-restaurant': {
    id: 'cat-restaurant',
    name: 'রেস্তোরাঁ ও ক্যাফে',
    primaryColor: '#e11d48',
    accentColor: '#fb7185',
    icon: '🍽️',
    unit: 'প্লেট',
    receiptSubtitle: 'সুস্বাদু ও স্বাস্থ্যসম্মত খাবার',
    terms: 'খাবার প্রস্তুতের পর পরিবর্তন সম্ভব নয়।'
  }
};

export const INDUSTRY_THEMES = INDUSTRY_CATEGORIES;

export function getIndustryTheme(id?: string): IndustryTheme {
  return INDUSTRY_CATEGORIES[id || 'cat-grocery'] || INDUSTRY_CATEGORIES['cat-grocery'];
}
