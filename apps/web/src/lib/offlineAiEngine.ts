'use client';

import { getVaultData, saveVaultSnapshot } from './dataVault';
import { queueOfflineAction } from './offlineDataLayer';
import { cleanSpokenBengali } from './banglaSpeechUtils';
import { parseVoicePOSCommand } from './voicePOSParser';

export interface OfflineAiResult {
  success: boolean;
  reply: string;
  speech: string;
  action?: string;
  actionLink?: { text: string; href: string } | null;
  navigateTo?: string;
  data?: any;
  isOffline: boolean;
}

/**
 * Parse Spoken Bengali Numbers
 */
function parseBengaliNumbers(str: string): string {
  let s = String(str || '');
  s = s.replace(/দেড়শো|দেড়শ|দেড়শো|দেড়শ/g, '150');
  s = s.replace(/আড়াইশো|আড়াইশ|আড়াইশো|আড়াইশ/g, '250');
  s = s.replace(/সাড়ে তিনশো|সাড়ে তিনশ/g, '350');
  s = s.replace(/সাড়ে চারশো|সাড়ে চারশ/g, '450');
  s = s.replace(/একশত|একশো|একশ/g, '100');
  s = s.replace(/দুইশত|দুইশো|দুইশ/g, '200');
  s = s.replace(/তিনশত|তিনশো|তিনশ/g, '300');
  s = s.replace(/চারশত|চারশো|চারশ/g, '400');
  s = s.replace(/পাঁচশত|পাঁচশো|পাঁচশ/g, '500');
  s = s.replace(/ছয়শো|ছয়শ/g, '600');
  s = s.replace(/সাতশো|সাতশ/g, '700');
  s = s.replace(/আটশো|আটশ/g, '800');
  s = s.replace(/নয়শো|নয়শ/g, '900');
  s = s.replace(/দেড় হাজার|দেড় হাজার/g, '1500');
  s = s.replace(/আড়াই হাজার|আড়াই হাজার/g, '2500');
  s = s.replace(/এক হাজার/g, '1000');

  // Convert Bengali digits to English digits
  const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  for (let i = 0; i < 10; i++) {
    s = s.replace(new RegExp(bnNums[i], 'g'), String(i));
  }
  return s;
}

/**
 * High-Speed Client-Side Offline AI Assistant Engine
 * Runs 100% in browser memory with zero internet required.
 */
export function executeOfflineAiShopCommand(
  tenantId: string,
  rawText: string,
  assistantName = 'সহজহিসাব',
  speakerRole: 'owner' | 'staff' | string = 'owner',
  speakerName = 'দোকান মালিক'
): OfflineAiResult {
  const text = cleanSpokenBengali(rawText);
  if (!text) {
    return {
      success: false,
      reply: 'দয়া করে কিছু মুখে বলুন বা লিখে জানান।',
      speech: 'দয়া করে কিছু মুখে বলুন বা লিখে জানান।',
      isOffline: true
    };
  }

  // Clean emojis, punctuation and normalize
  const cleanedText = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}?？!।,:;]/gu, '').trim();
  const normalized = parseBengaliNumbers(cleanedText.toLowerCase());

  const vault = getVaultData(tenantId) || { tenantId, updatedAt: new Date().toISOString() };
  let products: any[] = vault.products || [];
  let sales: any[] = vault.sales || [];
  let customers: any[] = vault.customers || [];
  let expenses: any[] = vault.expenses || [];

  // If vault is completely empty, initialize default mock data so assistant works immediately
  if (products.length === 0) {
    products = [
      { id: 'p-def-1', name: 'নাপা এক্সট্রা', banglaName: 'নাপা এক্সট্রা', sellingPrice: 30, purchasePrice: 24, stock: 45, unit: 'পাতা' },
      { id: 'p-def-2', name: 'সয়াবিন তেল', banglaName: 'সয়াবিন তেল', sellingPrice: 180, purchasePrice: 165, stock: 12, unit: 'লিটার' },
      { id: 'p-def-3', name: 'চিনি', banglaName: 'চিনি', sellingPrice: 135, purchasePrice: 120, stock: 30, unit: 'কেজি' }
    ];
    saveVaultSnapshot(tenantId, { products });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((s: any) => (s.createdAt || s.created_at || '').startsWith(todayStr));
  const todayExpenses = expenses.filter((e: any) => (e.date || e.createdAt || '').startsWith(todayStr));

  // 1. Comprehensive Navigation Commands (মুখে বলা মাত্র নির্ভুলভাবে সঠিক পেজে নিয়ে যাওয়া)
  // A. POS / বিক্রি / মেমো / কাউন্টার পেজ
  if (
    /^(পস|কাউন্টার|মেমো|বিক্রি|বিক্রয়|সেল|বিল|pos)$/i.test(normalized) ||
    /(পস|কাউন্টার|মেমো|বিক্রি|বিক্রয়|সেল|বিল|pos|counter|memo|sell|bikri).*(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন|করো|করুন|পেজ|পাতা|স্ক্রিন)/i.test(normalized) ||
    /(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন).*(পস|কাউন্টার|মেমো|বিক্রি|বিক্রয়|সেল|বিল|pos)/i.test(normalized) ||
    /^(বিক্রি পেজ|বিক্রির পেজ|পস পেজ|মেমো পেজ|বিক্রি কাউন্টার|ক্যাশ কাউন্টার|বিক্রিতে যাও|বিক্রি পেজে যাও|বিক্রি পেজে যান|বিক্রি পেজ যান|বিক্রিতে যান|বিক্রি যান)$/i.test(normalized)
  ) {
    return {
      success: true,
      reply: 'বিক্রয় ও মেমো কাউন্টারে নিয়ে যাচ্ছি...',
      speech: 'বিক্রয় কাউন্টারে যাচ্ছি।',
      navigateTo: '/pos',
      actionLink: { text: 'POS কাউন্টার খুলুন →', href: '/pos' },
      isOffline: true
    };
  }

  // B. বাকি / খাতা পেজ
  if (
    /^(খাতা|বাকি|বাকির খাতা|কাস্টমার|কাস্টমার খাতা|বাকির পেজ)$/i.test(normalized) ||
    /(খাতা|বাকি|কাস্টমার|দেনাদার).*(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন|করো|করুন|পেজ)/i.test(normalized) ||
    /(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন).*(খাতা|বাকি|কাস্টমার)/i.test(normalized)
  ) {
    if (!/টাকা|জমা|নিল|দিল|কত|লেখো/i.test(normalized)) {
      return {
        success: true,
        reply: 'বাকির খাতায় নিয়ে যাচ্ছি...',
        speech: 'বাকি খাতা খুলছি।',
        navigateTo: '/khata',
        actionLink: { text: 'বাকি খাতা খুলুন →', href: '/khata' },
        isOffline: true
      };
    }
  }

  // C. স্টক / ইনভেন্টরি পেজ (বিক্রি সংক্রান্ত কথা না থাকলে তবেই যাবে)
  if (
    !/বিক্রি|সেল|কাউন্টার|মেমো/i.test(normalized) &&
    (/^(স্টক|মাল|পণ্য|ইনভেন্টরি|স্টক পেজ)$/i.test(normalized) ||
     /(স্টক|মাল|পণ্য|ইনভেন্টরি).*(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন|করো|করুন|পেজ)/i.test(normalized) ||
     /(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন).*(স্টক|ইনভেন্টরি)/i.test(normalized))
  ) {
    if (!/কত|যোগ|তোল|কম|শেষ|কয়টা|কয়টা/i.test(normalized)) {
      return {
        success: true,
        reply: 'দোকানের স্টক ইনভেন্টরিতে নিয়ে যাচ্ছি...',
        speech: 'স্টক পেজে নিয়ে যাচ্ছি।',
        navigateTo: '/stock',
        actionLink: { text: 'স্টক ইনভেন্টরি খুলুন →', href: '/stock' },
        isOffline: true
      };
    }
  }

  // D. খরচ পেজ
  if (
    /^(খরচ|ব্যয়|খরচের খাতা|খরচ পেজ)$/i.test(normalized) ||
    /(খরচ|ব্যয়).*(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন|করো|করুন|পেজ)/i.test(normalized) ||
    /(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন).*(খরচ|ব্যয়)/i.test(normalized)
  ) {
    if (!/টাকা|লেখো|কত/i.test(normalized)) {
      return {
        success: true,
        reply: 'দোকান খরচের খাতায় নিয়ে যাচ্ছি...',
        speech: 'খরচ পেজ খুলছি।',
        navigateTo: '/expenses',
        actionLink: { text: 'খরচের খাতা খুলুন →', href: '/expenses' },
        isOffline: true
      };
    }
  }

  // E. রিপোর্ট পেজ
  if (
    /^(রিপোর্ট|হিসাব|আজকের হিসাব|রিপোর্ট পেজ)$/i.test(normalized) ||
    /(রিপোর্ট|হিসাব).*(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন|করো|করুন|পেজ)/i.test(normalized) ||
    /(যাও|যান|যাবেন|খোল|খুলুন|নিয়ে|চল|চলুন|দেখা|দেখান|ওপেন).*(রিপোর্ট|হিসাব)/i.test(normalized)
  ) {
    if (!/কত|লাভ|বিক্রি/i.test(normalized)) {
      return {
        success: true,
        reply: 'আজকের রিপোর্ট ও হিসাব পেজে নিয়ে যাচ্ছি...',
        speech: 'রিপোর্ট পেজ খুলছি।',
        navigateTo: '/reports',
        actionLink: { text: 'রিপোর্ট পেজ খুলুন →', href: '/reports' },
        isOffline: true
      };
    }
  }

  if (/^(কিস্তি|কিস্তির খাতা)$/i.test(normalized) || /কিস্তি.*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন)/i.test(normalized)) {
    return {
      success: true,
      reply: 'কিস্তির খাতায় নিয়ে যাচ্ছি...',
      speech: 'কিস্তির খাতা খুলছি।',
      navigateTo: '/installments',
      actionLink: { text: 'কিস্তির খাতা খুলুন →', href: '/installments' },
      isOffline: true
    };
  }

  if (/^(ডিলার|মহাজন|সাপ্লায়ার)$/i.test(normalized) || /ডিলার.*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন)|মহাজন.*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন)/i.test(normalized)) {
    return {
      success: true,
      reply: 'ডিলার ও মহাজন তালিকায় নিয়ে যাচ্ছি...',
      speech: 'ডিলার পেজ খুলছি।',
      navigateTo: '/dealers',
      actionLink: { text: 'ডিলার তালিকা খুলুন →', href: '/dealers' },
      isOffline: true
    };
  }

  if (/^(সেটিংস|দোকান সেটিংস)$/i.test(normalized) || /সেটিংস.*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন)/i.test(normalized)) {
    if (speakerRole === 'staff') {
      return {
        success: false,
        reply: `🛡️ **কর্মচারী মোড সীমাবদ্ধতা (${speakerName}):**\nদোকানের সেটিংস দেখার ও পরিবর্তন করার অনুমতি শুধুমাত্র প্রধান মালিকের জন্য সংরক্ষিত।`,
        speech: 'দোকান সেটিংস শুধুমাত্র প্রধান মালিকের জন্য সংরক্ষিত।',
        isOffline: true
      };
    }
    return {
      success: true,
      reply: 'দোকান সেটিংসে নিয়ে যাচ্ছি...',
      speech: 'সেটিংস পেজ খুলছি।',
      navigateTo: '/settings',
      actionLink: { text: 'সেটিংস খুলুন →', href: '/settings' },
      isOffline: true
    };
  }

  if (/^(স্টাফ|কর্মচারী)$/i.test(normalized) || /স্টাফ.*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন)/i.test(normalized)) {
    return {
      success: true,
      reply: 'কর্মচারী ও স্টাফ লিস্টে নিয়ে যাচ্ছি...',
      speech: 'স্টাফ পেজ খুলছি।',
      navigateTo: '/staff',
      actionLink: { text: 'স্টাফ তালিকা খুলুন →', href: '/staff' },
      isOffline: true
    };
  }

  // 2. Today's Sales & Profit Query (আজকের বিক্রি ও লাভ)
  if (/আজকে|আজকের/i.test(normalized) && /বিক্রি|সেল|লাভ|ইনকাম|আয়|টাকা/i.test(normalized) && !/খরচ|বাকি|স্টক/i.test(normalized)) {
    // 🛡️ Staff mode restrictions on confidential profit calculations
    if (speakerRole === 'staff') {
      if (/লাভ|ইনকাম|আয়|প্রফিট|মার্জিন/i.test(normalized)) {
        return {
          success: false,
          reply: `🛡️ **কর্মচারী মোড সীমাবদ্ধতা (${speakerName}):**\nদোকানের ব্যবসায়িক লাভ, নিট আয় বা গোপনীয় আর্থিক হিসাব দেখার অনুমতি শুধুমাত্র দোকান মালিকের জন্য সংরক্ষিত। আপনি কাউন্টারের বিক্রি ও মেমো দেখতে পারেন।`,
          speech: 'কর্মচারী মোডে ব্যবসায়িক লাভ বা গোপনীয় হিসাব দেখার অনুমতি নেই। এটি শুধুমাত্র দোকান মালিকের জন্য সংরক্ষিত।',
          isOffline: true
        };
      }
      const totalSold = todaySales.reduce((acc, s) => acc + (Number(s.totalAmount || s.netTotal || s.total_amount || 0)), 0);
      return {
        success: true,
        reply: `👔 **কর্মচারী মোড (${speakerName}):**\n• আজকের কাউন্টারে মোট বিক্রি: **৳${totalSold.toLocaleString('en-US')}**\n• সর্বমোট মেমো: **${todaySales.length}টি**\n\n🟢 *অফলাইন কাউন্টার রেকর্ড*`,
        speech: `আজকে কাউন্টারে মোট বিক্রি হয়েছে ৳${totalSold} টাকা এবং মোট মেমো হয়েছে ${todaySales.length}টি।`,
        navigateTo: '/pos',
        actionLink: { text: 'POS কাউন্টারে যান →', href: '/pos' },
        isOffline: true
      };
    }

    const totalSold = todaySales.reduce((acc, s) => acc + (Number(s.totalAmount || s.netTotal || s.total_amount || 0)), 0);
    const totalCash = todaySales.reduce((acc, s) => acc + (Number(s.paidAmount || s.paid_amount || 0)), 0);
    const totalExp = todayExpenses.reduce((acc, e) => acc + (Number(e.amount || 0)), 0);
    const estProfit = Math.round(totalSold * 0.2 - totalExp);

    const speech = `আজকে সর্বমোট বিক্রি ৳${totalSold.toLocaleString('en-US')} টাকা, ক্যাশ জমা ৳${totalCash.toLocaleString('en-US')} টাকা এবং আনুমানিক নিট লাভ ৳${estProfit.toLocaleString('en-US')} টাকা।`;
    return {
      success: true,
      reply: `👑 **মালিক মোড (${speakerName}):**\n• সর্বমোট বিক্রি: **৳${totalSold.toLocaleString('en-US')}**\n• ক্যাশ কালেকশন: **৳${totalCash.toLocaleString('en-US')}**\n• মোট খরচ: **৳${totalExp.toLocaleString('en-US')}**\n• আনুমানিক নিট লাভ: **৳${estProfit.toLocaleString('en-US')}**\n• মোট মেমো: ${todaySales.length}টি\n\n🟢 *অফলাইন মেমোরি থেকে তাৎক্ষণিক প্রস্তুত*`,
      speech,
      navigateTo: '/reports',
      actionLink: { text: 'আজকের বিস্তারিত রিপোর্ট →', href: '/reports' },
      isOffline: true
    };
  }

  // 2b. Business Status & Summary Query ("ব্যবসা কেমন চলছে?", "আজকের সারাংশ বলো", "আজকের রিপোর্ট", "দোকানের অবস্থা কেমন")
  if (
    /ব্যবসা\s*কেমন|দোকান\s*কেমন|আজকের?\s*(সারাংশ|সামারি|রিপোর্ট|খবর|অবস্থা|হিসাব-নিকাশ)|সারাদিনের\s*হিসাব|দোকানের\s*খবর/i.test(normalized) &&
    !/খরচ|বাকি|স্টক/i.test(normalized)
  ) {
    if (speakerRole === 'staff') {
      return {
        success: false,
        reply: `🛡️ **কর্মচারী মোড সীমাবদ্ধতা (${speakerName}):**\nসার্বিক ব্যবসার লাভ-ক্ষতি ও ব্যালেন্স রিপোর্ট শুধুমাত্র প্রধান মালিকের জন্য সংরক্ষিত।`,
        speech: 'সার্বিক ব্যবসার সারাংশ ও লাভ ক্ষতি শুধুমাত্র দোকান মালিকের জন্য সংরক্ষিত।',
        isOffline: true
      };
    }

    const totalSold = todaySales.reduce((acc, s) => acc + (Number(s.totalAmount || s.netTotal || s.total_amount || 0)), 0);
    const totalCash = todaySales.reduce((acc, s) => acc + (Number(s.paidAmount || s.paid_amount || 0)), 0);
    const totalExp = todayExpenses.reduce((acc, e) => acc + (Number(e.amount || 0)), 0);
    const estProfit = Math.round(totalSold * 0.2 - totalExp);
    const marketDue = customers.reduce((acc, c) => acc + (Number(c.totalDue || c.total_due || 0)), 0);
    const lowStockCount = products.filter(p => Number(p.stock || 0) <= Number(p.lowStockThreshold || p.low_stock_threshold || 5)).length;

    const speech = `আজকে মোট বিক্রি ৳${totalSold} টাকা, নগদ আদায় ৳${totalCash} টাকা, মোট খরচ ৳${totalExp} টাকা, আনুমানিক নিট লাভ ৳${estProfit} টাকা এবং বাজারে মোট বাকি ৳${marketDue} টাকা।`;
    return {
      success: true,
      reply: `👑 **মালিক মোড (${speakerName}):**\n• মোট বিক্রি (${todaySales.length}টি মেমো): **৳${totalSold.toLocaleString('en-US')}**\n• ক্যাশ কালেকশন: **৳${totalCash.toLocaleString('en-US')}**\n• মোট খরচ: **৳${totalExp.toLocaleString('en-US')}**\n• আনুমানিক নিট লাভ: **৳${estProfit.toLocaleString('en-US')}**\n• মোট বাজার বাকি: **৳${marketDue.toLocaleString('en-US')}**\n• স্টক অ্যালার্ট: **${lowStockCount}টি পণ্যের স্টক কম**\n\n🟢 *অফলাইন রিয়েলটাইম ড্যাশবোর্ড রিপোর্ট*`,
      speech,
      navigateTo: '/reports',
      actionLink: { text: 'বিস্তারিত রিপোর্ট পেজ →', href: '/reports' },
      isOffline: true
    };
  }

  // 3. Low Stock / Stock Check (কোন মালের স্টক কম / স্টক কত)
  if (/স্টক কম|কোন মাল কম|মাল শেষ|কোন কোন মালের স্টক/i.test(normalized)) {
    const lowItems = products.filter(p => Number(p.stock || 0) <= Number(p.lowStockThreshold || p.low_stock_threshold || 5));
    if (lowItems.length === 0) {
      return {
        success: true,
        reply: '✅ আলহামদুলিল্লাহ! আপনার দোকানে কোনো পণ্যের স্টক কম নেই।',
        speech: 'দোকানে সব মালের স্টক পর্যাপ্ত আছে।',
        navigateTo: '/stock',
        actionLink: { text: 'স্টক ইনভেন্টরি দেখুন →', href: '/stock' },
        isOffline: true
      };
    }

    const top3 = lowItems.slice(0, 3).map(p => `• ${p.banglaName || p.name} (বাকি: ${p.stock} ${p.unit || 'পিস'})`).join('\n');
    const speech = `দোকানে ${lowItems.length}টি পণ্যের স্টক কম রয়েছে। যেমন: ${lowItems.slice(0, 2).map(p => p.banglaName || p.name).join(' ও ')}।`;
    return {
      success: true,
      reply: `⚠️ **স্টক অ্যালার্ট (${lowItems.length}টি পণ্যের স্টক কম):**\n${top3}\n\n🟢 *অফলাইন ইনভেন্টরি রেকর্ড*`,
      speech,
      navigateTo: '/stock',
      actionLink: { text: 'সকল লো-স্টক পণ্য দেখুন →', href: '/stock' },
      isOffline: true
    };
  }

  // 4. Overall Stock Query (যেমন: "আজকের স্টক কত?" / "স্টক কত আছে")
  if (/স্টক কত|মোট স্টক|স্টকের হিসাব|স্টক রিপোর্ট|মালের হিসাব|আজকের স্টক/i.test(normalized)) {
    const totalStockCount = products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
    const lowItems = products.filter(p => Number(p.stock || 0) <= Number(p.lowStockThreshold || p.low_stock_threshold || 5));
    const speech = `দোকানে সর্বমোট ${products.length}টি পণ্যের ${totalStockCount}টি আইটেম স্টকে আছে।${lowItems.length > 0 ? ` এর মধ্যে ${lowItems.length}টি পণ্যের স্টক কম।` : ''}`;
    return {
      success: true,
      reply: `📦 **দোকানের মোট স্টক ইনভেন্টরি:**\n• মোট আইটেম সংখ্যা: ${totalStockCount}টি\n• ভিন্ন ভিন্ন পণ্য: ${products.length} প্রকার\n• লো-স্টক অ্যালার্ট: ${lowItems.length}টি পণ্য\n\n🟢 *অফলাইন ইনভেন্টরি ডাটা*`,
      speech,
      navigateTo: '/stock',
      actionLink: { text: 'স্টক ইনভেন্টরি দেখুন →', href: '/stock' },
      isOffline: true
    };
  }

  // 4b. Product Price & Rate Inquiry (যেমন: "চিনির দাম কত?", "তেলের রেট কত?", "নাপা পাতার দাম কত?", "চিনির কেজি কত?")
  const priceInquiryMatch = normalized.match(/(.+?)\s*(?:এর)?\s*(?:দাম\s*কত|রেট\s*কত|দর\s*কত|টাকা\s*করে|কত\s*করে|কেজি\s*কত|লিটার\s*কত|পাতা\s*কত|পিস\s*কত|দর\s*কেমন|বিক্রি\s*কত|বেচা\s*কত)/i);
  if (priceInquiryMatch && !/আজকে|মোট|খরচ|লাভ|বাকি|স্টক\s*কত/i.test(normalized)) {
    const searchName = priceInquiryMatch[1].replace(/দোকানে|আমাদের|বর্তমান|ভাই|মাল|পণ্য/g, '').trim();
    if (searchName && searchName.length >= 2) {
      const stem = searchName.replace(/(?:ের|এর|র)$/, '').trim();
      const p = products.find(prod => {
        const b = (prod.banglaName || prod.name || '').toLowerCase();
        const nm = (prod.name || '').toLowerCase();
        const s = searchName.toLowerCase();
        const st = stem.toLowerCase();
        return b.includes(s) || s.includes(b) || nm.includes(s) || (st.length >= 2 && (b.includes(st) || st.includes(b) || nm.includes(st)));
      });
      if (p) {
        const sPrice = Number(p.sellingPrice) || 0;
        const pPrice = Number(p.purchasePrice) || Math.round(sPrice * 0.85);
        const unit = p.unit || 'পিস';
        const stockAmt = Number(p.stock || 0);

        const speech = `${p.banglaName || p.name} এর বিক্রয় মূল্য ৳${sPrice} টাকা প্রতি ${unit}। স্টকে আছে ${stockAmt} ${unit}।`;
        return {
          success: true,
          reply: `🏷️ **পণ্যের দর ও মূল্য তালিকা:**\n• পণ্য: **${p.banglaName || p.name}**\n• বিক্রয় মূল্য: **৳${sPrice} / ${unit}**\n• কেনা দর: ৳${pPrice} / ${unit}\n• বর্তমান মজুদ: **${stockAmt} ${unit}**\n\n🟢 *অফলাইন ক্যাটালগ তথ্য*`,
          speech,
          navigateTo: '/stock',
          actionLink: { text: 'স্টক ইনভেন্টরি দেখুন →', href: '/stock' },
          isOffline: true
        };
      }
    }
  }

  // 4c. Specific Product Stock Query (যেমন: "নাপা কয়টা আছে?", "তেল কত লিটার আছে?", "চাল কতটুকু আছে?")
  const specificStockMatch = normalized.match(/(.+?)\s*(?:কয়টা|কয়টা|কতটুকু|কত\s*কেজি|কত\s*লিটার|কত\s*পাতা|কত\s*পিস|কত|কয়|কয়)\s*(?:কেজি|লিটার|পাতা|পিস|প্যাকেট|বোতল)?\s*(?:আছে|স্টক আছে|স্টকে আছে|মজুদ আছে|বাকি আছে)/i);
  if (specificStockMatch && !/আজকে|মোট|খরচ|বাকি|টাকা/i.test(normalized)) {
    const searchName = specificStockMatch[1].replace(/দোকানে|স্টকে|আমাদের|বর্তমান|ভাই|মাল/g, '').trim();
    if (searchName && searchName.length >= 2) {
      const stem = searchName.replace(/(?:ের|এর|র)$/, '').trim();
      const p = products.find(prod => {
        const b = (prod.banglaName || prod.name || '').toLowerCase();
        const nm = (prod.name || '').toLowerCase();
        const s = searchName.toLowerCase();
        const st = stem.toLowerCase();
        return b.includes(s) || s.includes(b) || nm.includes(s) || (st.length >= 2 && (b.includes(st) || st.includes(b) || nm.includes(st)));
      });
      if (p) {
        const stockAmt = Number(p.stock || 0);
        const unit = p.unit || 'পিস';
        const speech = `${p.banglaName || p.name} বর্তমানে ${stockAmt} ${unit} স্টকে আছে। বিক্রয় মূল্য ${p.sellingPrice} টাকা।`;
        return {
          success: true,
          reply: `📦 **পণ্য স্টক অনুসন্ধান:**\n• পণ্য: **${p.banglaName || p.name}**\n• বর্তমান স্টক: **${stockAmt} ${unit}**\n• বিক্রয় মূল্য: ৳${p.sellingPrice}\n• কেনা মূল্য: ৳${p.purchasePrice || Math.round(Number(p.sellingPrice) * 0.85)}\n\n🟢 *অফলাইন ইনভেন্টরি রেকর্ড*`,
          speech,
          navigateTo: '/stock',
          actionLink: { text: 'স্টক ইনভেন্টরি দেখুন →', href: '/stock' },
          isOffline: true
        };
      }
    }
  }

  // 5. Quick Stock Addition Command (যেমন: "নাপা ৫০ পাতা স্টক যোগ করো")
  const stockAddMatch = normalized.match(/(.+?)\s+(\d+)\s*(পাতা|পিস|কেজি|লিটার|বোতল|প্যাকেট|বক্স|ডজন|টি)?\s*(স্টক যোগ|স্টকে তোল|স্টকে ঢুকা|মাল তোল|স্টক)/i);
  if (stockAddMatch) {
    const prodSearch = stockAddMatch[1].replace(/স্টক|মাল|যোগ|নতুন/g, '').trim();
    const qty = Number(stockAddMatch[2]);
    const unit = stockAddMatch[3] || 'পিস';

    if (prodSearch && qty > 0) {
      let matchedProd = products.find(p => (p.banglaName || p.name || '').toLowerCase().includes(prodSearch.toLowerCase()));
      if (!matchedProd) {
        matchedProd = {
          id: `prod-off-${Date.now()}`,
          tenantId,
          name: prodSearch,
          banglaName: prodSearch,
          sellingPrice: 50,
          purchasePrice: 40,
          stock: qty,
          unit
        };
        products.push(matchedProd);
      } else {
        const oldStock = Number(matchedProd.stock || 0);
        matchedProd.stock = oldStock + qty;
      }

      // Update local vault and queue outbox
      saveVaultSnapshot(tenantId, { products });
      queueOfflineAction({
        type: 'update_product',
        payload: { id: matchedProd.id, stock: matchedProd.stock, reason: `অফলাইন স্টক যোগ: ${qty} ${unit}` }
      });

      const reply = `✓ "${matchedProd.banglaName || matchedProd.name}" এর স্টকে ${qty} ${unit} যোগ হয়েছে! (নতুন স্টক: ${matchedProd.stock} ${unit})`;
      const speech = `${matchedProd.banglaName || matchedProd.name} এর স্টকে ${qty} ${unit} যোগ হয়েছে।`;
      return {
        success: true,
        reply,
        speech,
        action: 'trigger_add_stock',
        navigateTo: '/stock',
        actionLink: { text: 'স্টক ইনভেন্টরি খুলুন →', href: '/stock' },
        isOffline: true
      };
    }
  }

  // 5b. Retail Sales Memo / বিক্রি ও মেমো কাটা (যেমন: "২ কেজি চিনি আর ১ লিটার তেল বিক্রি হলো" / "চিনি ১ কেজি বিক্রি" / "মেমো করো চিনি ১ কেজি")
  const isSaleIntent = (
    /বিক্রি|বেচা|সেল|মেমো\s*কাটো|মেমো\s*করো|মেমো|বিল\s*কাটো|বিল\s*করো/.test(normalized) ||
    ((/বাকি|বাকিতে/.test(normalized)) && /(কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|বস্তা|হালি|টি|টা)/.test(normalized))
  ) && !/কত|কেমন|রিপোর্ট|দেখাও|খাতায়\s*যাও|বাকি\s*খাতা|বাকি\s*কত|পাওনা|তালিকা|লিস্ট|পেজ|পাতা|স্ক্রিন/.test(normalized);

  if (isSaleIntent && /\d+/.test(normalized)) {
    const posRes = parseVoicePOSCommand(cleanedText, products);
    if (posRes.type === 'add_items' && posRes.items && posRes.items.length > 0) {
      const isDue = /বাকি|বাকিতে|বাকি\s*নিল|বাকি\s*দাও/.test(normalized);
      let customerName = isDue ? 'বাকি গ্রাহক' : 'নগদ কাস্টমার';
      let targetCust: any = null;

      if (isDue) {
        const custMatch = cleanedText.match(/(.+?)\s*(?:ভাই|চাচা|কাকা|মামা|এর|ের)?\s*(?:বাকি|বাকিতে)/);
        if (custMatch) {
          const candidate = custMatch[1].replace(/মেমো|বিক্রি|টাকা|কেজি|লিটার|\d+/g, '').trim();
          if (candidate && candidate.length >= 2) {
            targetCust = customers.find(c => (c.name || '').toLowerCase().includes(candidate.toLowerCase()) || candidate.toLowerCase().includes((c.name || '').toLowerCase()));
            if (!targetCust) {
              targetCust = {
                id: `cust-off-${Date.now()}`,
                tenantId,
                name: candidate.includes('ভাই') || candidate.includes('চাচা') ? candidate : `${candidate} ভাই`,
                phone: '',
                totalDue: 0
              };
              customers.push(targetCust);
            }
            customerName = targetCust.name;
          }
        }
      }

      // Check stock and process items
      const validItems: any[] = [];
      const outOfStockItems: string[] = [];
      let totalSaleAmount = 0;
      let totalProfitAmount = 0;

      for (const item of posRes.items) {
        const prod = products.find(p =>
          (item.productId && p.id === item.productId) ||
          (p.banglaName || p.name || '').toLowerCase().includes(item.name.toLowerCase()) ||
          item.name.toLowerCase().includes((p.banglaName || p.name || '').toLowerCase())
        );

        if (!prod) {
          const qty = item.quantity || 1;
          const sPrice = item.unitPrice || 50;
          const lineTotal = item.totalPrice || Math.round(qty * sPrice);
          totalSaleAmount += lineTotal;
          totalProfitAmount += Math.round(lineTotal * 0.15);
          validItems.push({
            productId: null,
            productName: item.banglaName || item.name,
            quantity: qty,
            unit: item.unit || 'পিস',
            sellingPrice: sPrice,
            totalPrice: lineTotal
          });
          continue;
        }

        const currentStock = Number(prod.stock || 0);
        const qty = item.quantity;
        const sPrice = item.unitPrice || Number(prod.sellingPrice) || 0;
        const pPrice = Number(prod.purchasePrice) || Math.round(sPrice * 0.8);
        const lineTotal = item.totalPrice || Math.round(qty * sPrice);
        const lineProfit = Math.max(0, lineTotal - Math.round(qty * pPrice));

        // Deduct stock in memory
        prod.stock = currentStock - qty;

        totalSaleAmount += lineTotal;
        totalProfitAmount += lineProfit;

        validItems.push({
          productId: prod.id,
          productName: prod.banglaName || prod.name,
          quantity: qty,
          unit: item.unit || prod.unit || 'পিস',
          sellingPrice: sPrice,
          totalPrice: lineTotal
        });
      }

      if (validItems.length > 0) {
        const saleId = `sale-off-${Date.now()}`;
        const invoiceNo = (isDue ? 'BK-' : 'MEMO-') + Date.now().toString().slice(-4);

        if (isDue && targetCust) {
          targetCust.totalDue = (Number(targetCust.totalDue) || 0) + totalSaleAmount;
        }

        const newSale = {
          id: saleId,
          tenantId,
          invoiceNo,
          totalAmount: totalSaleAmount,
          paidAmount: isDue ? 0 : totalSaleAmount,
          dueAmount: isDue ? totalSaleAmount : 0,
          profitAmount: totalProfitAmount,
          paymentMethod: isDue ? 'due' : 'cash',
          customerId: targetCust?.id || null,
          customerName,
          items: validItems,
          createdAt: new Date().toISOString()
        };
        sales.push(newSale);

        // Update vault snapshot and queue sync
        saveVaultSnapshot(tenantId, { products, sales, customers });
        queueOfflineAction({
          type: 'create_sale',
          payload: newSale
        });

        const itemsSummary = validItems.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', ');
        const speech = isDue
          ? `${customerName} এর বাকি খাতায় ${itemsSummary} বাবদ ৳${totalSaleAmount} টাকা যোগ করা হয়েছে।`
          : `৳${totalSaleAmount} টাকার বিক্রি সম্পন্ন হয়েছে। ${itemsSummary} মেমো তৈরি করা হয়েছে।`;

        const reply = isDue
          ? `📒 **বাকির মেমো সফল!**\n• খরিদ্দার: **${customerName}**\n• আইটেম: ${itemsSummary}\n• মোট বাকি: **৳${totalSaleAmount.toLocaleString('en-US')}**\n(বর্তমান মোট দেনা: ৳${targetCust?.totalDue || totalSaleAmount} টাকা)\n\n🟢 *অফলাইন খাতা ও মেমোতে সংরক্ষিত*`
          : `🧾 **বিক্রয় মেমো সফল!**\n• মোট বিল: **৳${totalSaleAmount.toLocaleString('en-US')}**\n• পণ্যসমূহ: ${itemsSummary}\n• ইনভয়েস: #${invoiceNo}\n\n🟢 *অফলাইন ক্যাশ কাউন্টারে রেকর্ড সম্পন্ন*`;

        return {
          success: true,
          action: 'sale_completed',
          reply,
          speech,
          navigateTo: '/pos',
          actionLink: { text: 'POS কাউন্টারে মেমো দেখুন →', href: '/pos' },
          data: { saleId, totalAmount: totalSaleAmount, items: validItems },
          isOffline: true
        };
      }
    }
  }

  // 6. Customer Due Payment / জমা আদায় (যেমন: "রিয়ান ২০ টাকা জমা দিল")
  const payMatch = normalized.match(/(.+?)\s+(\d+)\s*টাকা?\s*(জমা দিল|পরিশোধ করল|দিল|জমা করলো|জমা)/i);
  if (payMatch) {
    const custName = payMatch[1].replace(/ভাই|চাচা|মামা|এর|কে/g, '').trim();
    const amount = Number(payMatch[2]);

    if (custName && amount > 0) {
      let cust = customers.find(c => (c.name || '').toLowerCase().includes(custName.toLowerCase()));
      if (!cust) {
        cust = {
          id: `cust-off-${Date.now()}`,
          tenantId,
          name: custName,
          phone: '',
          totalDue: 0
        };
        customers.push(cust);
      } else {
        cust.totalDue = Math.max(0, Number(cust.totalDue || 0) - amount);
      }

      saveVaultSnapshot(tenantId, { customers });
      queueOfflineAction({
        type: 'due_payment',
        payload: { customerId: cust.id, customerName: cust.name, amount, note: 'অফলাইন জমা গ্রহণ' }
      });

      const speech = `${cust.name} এর জমা ${amount} টাকা গ্রহণ করা হয়েছে। বর্তমান বকেয়া ${cust.totalDue} টাকা।`;
      return {
        success: true,
        reply: `✓ **${cust.name}** ৳${amount} টাকা পরিশোধ করেছেন!\n(বর্তমান বকেয়া: ৳${cust.totalDue} টাকা)\n\n🟢 *অফলাইনে সংরক্ষিত হয়েছে*`,
        speech,
        navigateTo: '/khata',
        actionLink: { text: 'বাকি খাতা দেখুন →', href: '/khata' },
        isOffline: true
      };
    }
  }

  // 7. Customer Due Entry (যেমন: "রহিম ভাই ৫০০ টাকা বাকি নিল" / "রিয়ানের ২০ টাকা বাকি")
  const dueMatch = normalized.match(/(.+?)\s+(\d+)\s*টাকা?\s*(বাকি নিল|বাকি লেখো|বাকি|বাকি দিলো)/i);
  if (dueMatch) {
    const custName = dueMatch[1].replace(/ভাই|চাচা|মামা|এর|কে/g, '').trim();
    const amount = Number(dueMatch[2]);

    if (custName && amount > 0) {
      let cust = customers.find(c => (c.name || '').toLowerCase().includes(custName.toLowerCase()));
      if (!cust) {
        cust = {
          id: `cust-off-${Date.now()}`,
          tenantId,
          name: custName,
          phone: '',
          totalDue: amount
        };
        customers.push(cust);
      } else {
        cust.totalDue = Number(cust.totalDue || 0) + amount;
      }

      saveVaultSnapshot(tenantId, { customers });
      queueOfflineAction({
        type: 'add_customer_due',
        payload: { customerId: cust.id, customerName: cust.name, amount, itemsSummary: 'অফলাইন বাকি' }
      });

      const speech = `${cust.name} এর খাতায় ${amount} টাকা বাকি যোগ হয়েছে।`;
      return {
        success: true,
        reply: `✓ **${cust.name}** এর খাতায় ৳${amount} টাকা বাকি রেকর্ড হয়েছে!\n(মোট বকেয়া: ৳${cust.totalDue} টাকা)\n\n🟢 *অফলাইন মেমোরিতে সংরক্ষিত (ইন্টারনেট পেলে সিঙ্ক হবে)*`,
        speech,
        navigateTo: '/khata',
        actionLink: { text: 'বাকি খাতা দেখুন →', href: '/khata' },
        isOffline: true
      };
    }
  }

  // 8. Expense Entry (যেমন: "চা নাস্তা ৬০ টাকা খরচ লেখো")
  const expMatch = normalized.match(/(.+?)\s+(\d+)\s*টাকা?\s*(খরচ লেখো|খরচ|ব্যয়)/i);
  if (expMatch) {
    const expTitle = expMatch[1].replace(/টাকা|খরচ|লেখো/g, '').trim() || 'দোকান খরচ';
    const amount = Number(expMatch[2]);

    if (amount > 0) {
      const newExp = {
        id: `exp-off-${Date.now()}`,
        tenantId,
        title: expTitle,
        amount,
        category: 'অন্যান্য',
        date: todayStr,
        createdAt: new Date().toISOString()
      };
      expenses.push(newExp);

      saveVaultSnapshot(tenantId, { expenses });
      queueOfflineAction({
        type: 'add_expense',
        payload: newExp
      });

      const speech = `${expTitle} ${amount} টাকা খরচ লেখা হয়েছে।`;
      return {
        success: true,
        reply: `✓ **${expTitle}** ৳${amount} টাকা খরচ হিসেবে লিপিবদ্ধ হয়েছে!\n\n🟢 *অফলাইনে সংরক্ষিত হয়েছে*`,
        speech,
        navigateTo: '/expenses',
        actionLink: { text: 'খরচের খাতা দেখুন →', href: '/expenses' },
        isOffline: true
      };
    }
  }

  // 9. Market Total Due Query (বাজারে মোট বাকি কত)
  if (/মোট বাকি|বাজারে কত বাকি|কাস্টমার বাকি|বকেয়া/i.test(normalized)) {
    const totalDue = customers.reduce((acc, c) => acc + (Number(c.totalDue || c.total_due || 0)), 0);
    const speech = `বাজারে মোট বকেয়া বাকি আছে ৳${totalDue.toLocaleString('en-US')} টাকা।`;
    return {
      success: true,
      reply: `📒 **বাজারে মোট বকেয়া বাকি:** ৳${totalDue.toLocaleString('en-US')} টাকা\nমোট বাকি কাস্টমার: ${customers.filter(c => Number(c.totalDue || c.total_due || 0) > 0).length} জন\n\n🟢 *অফলাইন ডেটাবেজ*`,
      speech,
      navigateTo: '/khata',
      actionLink: { text: 'বাকি খাতা খুলুন →', href: '/khata' },
      isOffline: true
    };
  }

  // Default Fallback
  return {
    success: true,
    reply: `💡 আমি আপনার হিসাব বুঝতে প্রস্তুত।\nআপনি বলতে পারেন:\n• "আজকের বিক্রি কত"\n• "আজকের স্টক কত"\n• "রহিম ৫০০ টাকা বাকি নিল"\n• "চা ৬০ টাকা খরচ"`,
    speech: 'দোকানের বিক্রি, বাকি, খরচ বা স্টকের হিসাব জানতে যেকোনো কিছু বলুন।',
    isOffline: true
  };
}
