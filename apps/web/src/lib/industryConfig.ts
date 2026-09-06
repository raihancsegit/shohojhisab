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
    posLabel: 'আরএক্স ও ঔষধ সেলস',
    posIcon: '💊',
    posDesc: 'প্রেসক্রিপশন ও ওটিসি ড্রাগ মেমো',
    khataLabel: 'রোগী ও কাস্টমার বাকি',
    stockLabel: 'ঔষধ ও ইনভেন্টরি',
    stockIcon: '🧪',
    dealerLabel: 'কোম্পানি ও ডিপো খাতা',
    reportsLabel: 'ফার্মেসি লাভ-ক্ষতি',
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
    posLabel: 'ফ্যাশন সেলস কাউন্টার',
    posIcon: '👗',
    posDesc: 'সাইজ ও কালারসহ মেমো',
    khataLabel: 'কাস্টমার খাতা',
    stockLabel: 'পোশাক ও কালেকশন',
    stockIcon: '🏷️',
    dealerLabel: 'পাইকারি মহাজন খাতা',
    reportsLabel: 'ফ্যাশন সেলস রিপোর্ট',
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
    posLabel: 'জুতা সেলস ও মেমো',
    posIcon: '👞',
    posDesc: 'সাইজ ও জোড়া হিসাব',
    khataLabel: 'কাস্টমার খাতা',
    stockLabel: 'জুতা ও স্যান্ডেল স্টক',
    stockIcon: '👞',
    dealerLabel: 'ডিলার ও কারখানা খাতা',
    reportsLabel: 'জুতা বিক্রয় রিপোর্ট',
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
    posLabel: 'হার্ডওয়্যার মেমো কাউন্টার',
    posIcon: '🔧',
    posDesc: 'ইঞ্চি, ফুট ও কেজি মেমো',
    khataLabel: 'কন্ট্রাক্টর ও মিস্ত্রি বাকি',
    stockLabel: 'হার্ডওয়্যার মালামাল স্টক',
    stockIcon: '🔩',
    dealerLabel: 'কোম্পানি মহাজন খাতা',
    reportsLabel: 'হার্ডওয়্যার লাভ-ক্ষতি',
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
    posLabel: 'মোবাইল ও এক্সেসরিজ মেমো',
    posIcon: '📱',
    posDesc: 'IMEI ও ওয়ারেন্টি রসিদ',
    khataLabel: 'কাস্টমার খাতা',
    stockLabel: 'ডিভাইস ও গ্যাজেট স্টক',
    stockIcon: '🔋',
    dealerLabel: 'ব্র্যান্ড সাপ্লায়ার খাতা',
    reportsLabel: 'মোবাইল লাভ-ক্ষতি',
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
    posLabel: 'ক্যাফে ক্যাশ কাউন্টার',
    posIcon: '🍳',
    posDesc: 'টেবিল ও কিচেন টোকেন বিল',
    khataLabel: 'নিয়মিত গ্রাহক খাতা',
    stockLabel: 'কিচেন কাঁচামাল স্টক',
    stockIcon: '🥩',
    dealerLabel: 'বাজার সাপ্লায়ার খাতা',
    reportsLabel: 'দৈনিক ফুড সেলস রিপোর্ট',
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
    posLabel: 'ওজন ও ফ্রেশ মিট বিল',
    posIcon: '⚖️',
    posDesc: 'ওজন ও ড্রেসিং মেমো',
    khataLabel: 'হোটেল ও নিয়মিত বাকি',
    stockLabel: 'লাইভ ও ফ্রোজেন স্টক',
    stockIcon: '🐟',
    dealerLabel: 'খামারি ও পাইকার খাতা',
    reportsLabel: 'দৈনিক বিক্রয় রিপোর্ট',
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
    posLabel: 'কেক ও সুইটস বিলিং',
    posIcon: '🍰',
    posDesc: 'কেক পাউন্ড ও মিষ্টি মেমো',
    khataLabel: 'কর্পোরেট বাকি খাতা',
    stockLabel: 'বেকারি প্রডাক্ট স্টক',
    stockIcon: '🍞',
    dealerLabel: 'ফ্যাক্টরি খাতা',
    reportsLabel: 'সুইটস সেলস রিপোর্ট',
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
    posLabel: 'ফার্নিচার অর্ডার ও মেমো',
    posIcon: '🛋️',
    posDesc: 'অ্যাডভান্স ও ডেলিভারি চালান',
    khataLabel: 'গ্রাহক কিস্তি ও বাকি খাতা',
    stockLabel: 'শো-রুম ও গুদাম স্টক',
    stockIcon: '🪵',
    dealerLabel: 'কাঠ ও ফিনিশিং মহাজন',
    reportsLabel: 'ফার্নিচার সেলস রিপোর্ট',
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
    posLabel: 'বই ও খাতা সেলস কাউন্টার',
    posIcon: '📖',
    posDesc: 'বই ও অফিস সাপ্লাই মেমো',
    khataLabel: 'স্কুল ও অফিস বাকি খাতা',
    stockLabel: 'বই ও স্টেশনারি স্টক',
    stockIcon: '✏️',
    dealerLabel: 'প্রকাশনী ও প্রেস মহাজন',
    reportsLabel: 'স্টেশনারি লাভ-ক্ষতি',
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
    posLabel: 'বিউটি ও কসমেটিকস বিল',
    posIcon: '💅',
    posDesc: 'শেড ও স্কিনকেয়ার মেমো',
    khataLabel: 'রেগুলার কাস্টমার খাতা',
    stockLabel: 'স্কিনকেয়ার ও মেকআপ স্টক',
    stockIcon: '🧴',
    dealerLabel: 'আমদানিকারক ও ডিপো খাতা',
    reportsLabel: 'কসমেটিকস সেলস রিপোর্ট',
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
    posLabel: 'মুদি ক্যাশ কাউন্টার',
    posIcon: '⚡',
    posDesc: 'বারকোড ও ওজন মেমো',
    khataLabel: 'ডিজিটাল বাকি খাতা',
    stockLabel: 'মালের স্টক ও বস্তা',
    stockIcon: '📦',
    dealerLabel: 'মহাজন খাতা',
    reportsLabel: 'লাভ-ক্ষতি রিপোর্ট',
    receiptSubtitle: 'নিত্যপ্রয়োজনীয় পণ্যের খুচরা ও পাইকারি দোকান',
    terms: [
      '১. বিক্রিত পণ্য অক্ষত অবস্থায় ৭ দিনের মধ্যে মেমোসহ পরিবর্তনযোগ্য।',
      '২. কোনো প্রকার কাটা-ছেঁড়া চালান গ্রহণযোগ্য নয়।'
    ]
  }
};

export function getIndustryTheme(industryId?: string): IndustryTheme {
  const key = industryId || 'cat-grocery';
  return INDUSTRY_THEMES[key] || INDUSTRY_THEMES['cat-grocery'];
}

export const INDUSTRY_UNITS: Record<string, Array<{ value: string; label: string }>> = {
  'cat-pharmacy': [
    { value: 'পাতা', label: 'পাতা (Strip - ট্যাবলেট/ক্যাপসুল)' },
    { value: 'ট্যাবলেট', label: 'ট্যাবলেট / পিস (খুচরা ট্যাবলেট)' },
    { value: 'বোতল', label: 'বোতল (সিরাপ/ড্রপ/সাসপেনশন)' },
    { value: 'মলম', label: 'মলম / অয়েন্টমেন্ট' },
    { value: 'টিউব', label: 'টিউব (মলম/জেল/ক্রিম)' },
    { value: 'ড্রপ', label: 'ড্রপ (আই/ইয়ার ড্রপ)' },
    { value: 'ভায়াল', label: 'ভায়াল / অ্যাম্পুল (ইনজেকশন)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (স্যালাইন/ব্যান্ডেজ)' },
    { value: 'বক্স', label: 'বক্স / কার্টন' },
    { value: 'পিস', label: 'পিস (মেডিকেল ডিভাইস/থার্মোমিটার)' },
  ],
  'cat-grocery': [
    { value: 'কেজি', label: 'কেজি (Kilogram)' },
    { value: 'গ্রাম', label: 'গ্রাম (Gram)' },
    { value: 'লিটার', label: 'লিটার (Liter - তেল/দুধ)' },
    { value: 'মিলি', label: 'মিলি (Milliliter)' },
    { value: 'পিস', label: 'পিস (Pieces)' },
    { value: 'হালি', label: 'হালি (ডিম - ৪ পিস)' },
    { value: 'ডজন', label: 'ডজন (১২ পিস)' },
    { value: 'প্যাকেট', label: 'প্যাকেট / প্যাক' },
    { value: 'বস্তা', label: 'বস্তা (চাল/ডাল/চিনি)' },
    { value: 'কার্টন', label: 'কার্টন / পেটি' },
    { value: 'টিন', label: 'টিন / ড্রাম' },
    { value: 'বোতল', label: 'বোতল' },
  ],
  'cat-clothing': [
    { value: 'পিস', label: 'পিস (শার্ট/প্যান্ট/টি-শার্ট/শাড়ি)' },
    { value: 'সেট', label: 'সেট (থ্রি-পিস/স্যুট/পাঞ্জাবি সেট)' },
    { value: 'গজ', label: 'গজ (থান কাপড়)' },
    { value: 'মিটার', label: 'মিটার (কাপড়)' },
    { value: 'জোড়া', label: 'জোড়া (মোজা/গ্লাভস)' },
    { value: 'বক্স', label: 'বক্স / প্যাকেট' },
  ],
  'cat-shoes': [
    { value: 'জোড়া', label: 'জোড়া (জুতা/স্যান্ডেল/মোজা)' },
    { value: 'পিস', label: 'পিস (ইনসোল/ফিতা)' },
    { value: 'বক্স', label: 'বক্স (জুতার বক্স)' },
    { value: 'সেট', label: 'সেট (পলিশ ও ব্রাশ সেট)' },
  ],
  'cat-hardware': [
    { value: 'পিস', label: 'পিস (যন্ত্রপাতি/ফিটিংস/লক)' },
    { value: 'ফুট', label: 'ফুট (পাইপ/তার/কাঠ)' },
    { value: 'ইঞ্চি', label: 'ইঞ্চি (নাট-বোল্ট/পাইপ)' },
    { value: 'মিটার', label: 'মিটার (তার/ক্যাবল)' },
    { value: 'গজ', label: 'গজ (তার/পাইপ)' },
    { value: 'কেজি', label: 'কেজি (রড/তার/পেরেক)' },
    { value: 'রোল', label: 'রোল (কসটেপ/তার)' },
    { value: 'ব্যাগ', label: 'ব্যাগ / বস্তা (সিমেন্ট)' },
    { value: 'বক্স', label: 'বক্স / কার্টন' },
    { value: 'সেট', label: 'সেট (টুলকিট/ড্রিল বিট)' },
    { value: 'ড্রাম', label: 'ড্রাম / বালতি (রং/আঠা)' },
  ],
  'cat-mobile': [
    { value: 'পিস', label: 'পিস (মোবাইল/চার্জার/ক্যাবল/কভার)' },
    { value: 'সেট', label: 'সেট (কম্বো ডিভাইস)' },
    { value: 'বক্স', label: 'বক্স / প্যাকেট' },
    { value: 'জোড়া', label: 'জোড়া (ইয়ারবাডস)' },
  ],
  'cat-restaurant': [
    { value: 'প্লেট', label: 'প্লেট (বিরিয়ানি/ভাত/খিচুড়ি)' },
    { value: 'হাফ প্লেট', label: 'হাফ প্লেট' },
    { value: 'পিস', label: 'পিস (গ্রিল/কাবাব/পরোটা/বার্গার)' },
    { value: 'সেট', label: 'সেট (কম্বো মিল)' },
    { value: 'বাটি', label: 'বাটি / স্যুপ / সালাদ' },
    { value: 'গ্লাস', label: 'গ্লাস (জুস/লাচ্ছি/ফালুদা)' },
    { value: 'কাপ', label: 'কাপ (চা/কফি)' },
    { value: 'পাউন্ড', label: 'পাউন্ড (কেক)' },
    { value: 'কেজি', label: 'কেজি' },
    { value: 'লিটার', label: 'লিটার' },
    { value: 'বোতল', label: 'বোতল (ড্রিঙ্কস/পানি)' },
    { value: 'পার্সেল', label: 'পার্সেল / বক্স' },
  ],
  'cat-tea': [
    { value: 'কাপ', label: 'কাপ (দুধ চা/রং চা/কফি)' },
    { value: 'পিস', label: 'পিস (সিঙ্গাড়া/সমুচা/বিস্কুট/কলা)' },
    { value: 'শলা', label: 'শলা / স্টিক (সিগারেট)' },
    { value: 'প্যাকেট', label: 'প্যাকেট' },
    { value: 'খিলি', label: 'খিলি (পান)' },
    { value: 'বোতল', label: 'বোতল (ড্রিঙ্কস/পানি)' },
  ],
  'cat-meat-fish': [
    { value: 'কেজি', label: 'কেজি (মাংস/মাছ)' },
    { value: 'গ্রাম', label: 'গ্রাম' },
    { value: 'পিস', label: 'পিস (আস্ত মাছ/মুরগি)' },
    { value: 'হালি', label: 'হালি' },
    { value: 'পাল্লা', label: 'পাল্লা (৫ কেজি)' },
    { value: 'কেস', label: 'কেস / ঝুড়ি' },
  ],
  'cat-bakery': [
    { value: 'পাউন্ড', label: 'পাউন্ড (কেক)' },
    { value: 'কেজি', label: 'কেজি (মিষ্টি/বিস্কুট)' },
    { value: 'গ্রাম', label: 'গ্রাম' },
    { value: 'পিস', label: 'পিস (পেস্ট্রি/প্যাটিস/বনরুটি)' },
    { value: 'বক্স', label: 'বক্স (মিষ্টির প্যাকেট)' },
    { value: 'প্যাকেট', label: 'প্যাকেট' },
  ],
  'cat-furniture': [
    { value: 'পিস', label: 'পিস (চেয়ার/টেবিল/খাট/আলমিরা)' },
    { value: 'সেট', label: 'সেট (সোফা সেট/ডাইনিং সেট)' },
    { value: 'জোড়া', label: 'জোড়া' },
    { value: 'সিএফটি', label: 'সিএফটি / ঘনফুট (কাঠ)' },
    { value: 'বক্স', label: 'বক্স' },
  ],
  'cat-stationery': [
    { value: 'পিস', label: 'পিস (বই/কলম/খাতা/ফাইল)' },
    { value: 'ডজন', label: 'ডজন (১২ পিস কলম)' },
    { value: 'রিম', label: 'রিম (কাগজ ৫০০ পাতা)' },
    { value: 'দিস্তা', label: 'দিস্তা (কাগজ ২৪ পাতা)' },
    { value: 'প্যাকেট', label: 'প্যাকেট' },
    { value: 'বক্স', label: 'বক্স' },
    { value: 'সেট', label: 'সেট (কালার বক্স/জ্যামিতি বক্স)' },
  ],
  'cat-cosmetics': [
    { value: 'পিস', label: 'পিস (লিপস্টিক/সাবান/নেইলপলিশ)' },
    { value: 'বোতল', label: 'বোতল (লোশন/শ্যাম্পু/পারফিউম)' },
    { value: 'টিউব', label: 'টিউব (ফেসওয়াশ/ক্রিম)' },
    { value: 'জার', label: 'জার (হেয়ার জেল/নাইট ক্রিম)' },
    { value: 'প্যাকেট', label: 'প্যাকেট / কিট' },
    { value: 'সেট', label: 'সেট (মেকআপ সেট)' },
    { value: 'বক্স', label: 'বক্স' },
  ]
};

export function getIndustryUnits(industryId?: string): {
  primaryUnits: Array<{ value: string; label: string }>;
  categories: Array<{ id: string; name: string; icon: string; units: Array<{ value: string; label: string }> }>;
} {
  const currentKey = industryId || 'cat-grocery';
  const primaryUnits = INDUSTRY_UNITS[currentKey] || INDUSTRY_UNITS['cat-grocery'];

  const categories: Array<{ id: string; name: string; icon: string; units: Array<{ value: string; label: string }> }> = [];

  // Add all categories, putting current category at top
  const currentTheme = INDUSTRY_THEMES[currentKey] || { name: 'আপনার ব্যবসা', icon: '⭐' };
  categories.push({
    id: currentKey,
    name: `⭐ ${currentTheme.name} (প্রস্তাবিত একক)`,
    icon: currentTheme.icon,
    units: primaryUnits
  });

  Object.entries(INDUSTRY_UNITS).forEach(([catKey, units]) => {
    if (catKey !== currentKey && INDUSTRY_THEMES[catKey]) {
      categories.push({
        id: catKey,
        name: `${INDUSTRY_THEMES[catKey].icon} ${INDUSTRY_THEMES[catKey].name}`,
        icon: INDUSTRY_THEMES[catKey].icon,
        units
      });
    }
  });

  return { primaryUnits, categories };
}

