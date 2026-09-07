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

export const COMMON_UNITS = [
  { value: 'পিস', label: 'পিস (Pcs)' },
  { value: 'প্যাকেট', label: 'প্যাকেট (Packet)' },
  { value: 'বক্স', label: 'বক্স (Box)' },
  { value: 'কার্টন', label: 'কার্টন (Carton)' },
  { value: 'ডজন', label: 'ডজন (Dozen)' },
  { value: 'কেজি', label: 'কেজি (Kg)' },
  { value: 'গ্রাম', label: 'গ্রাম (Gram)' },
  { value: 'লিটার', label: 'লিটার (Liter)' },
  { value: 'সেট', label: 'সেট (Set)' },
];

export function getIndustryUnits(industryId?: string): {
  primaryUnits: Array<{ value: string; label: string }>;
  categories: Array<{ id: string; name: string; icon: string; units: Array<{ value: string; label: string }> }>;
} {
  const currentKey = industryId || 'cat-grocery';
  const primaryUnits = INDUSTRY_UNITS[currentKey] || INDUSTRY_UNITS['cat-grocery'] || [];

  const categories: Array<{ id: string; name: string; icon: string; units: Array<{ value: string; label: string }> }> = [];

  // 1. Add current industry units as primary group
  const currentTheme = INDUSTRY_THEMES[currentKey] || { name: 'আপনার ব্যবসা', icon: '⭐' };
  categories.push({
    id: currentKey,
    name: `${currentTheme.icon} ${currentTheme.name} (প্রস্তাবিত একক)`,
    icon: currentTheme.icon,
    units: primaryUnits
  });

  // 2. Add common/general units (excluding any already present in primaryUnits)
  const existingValues = new Set(primaryUnits.map(u => u.value));
  const generalUnits = COMMON_UNITS.filter(u => !existingValues.has(u.value));

  if (generalUnits.length > 0) {
    categories.push({
      id: 'common-units',
      name: '📦 সাধারণ / সার্বজনীন একক',
      icon: '📦',
      units: generalUnits
    });
  }

  return { primaryUnits, categories };
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
  const key = industryId || 'cat-grocery';
  return INDUSTRY_VOICE_CONFIGS[key] || INDUSTRY_VOICE_CONFIGS['cat-grocery'];
}



