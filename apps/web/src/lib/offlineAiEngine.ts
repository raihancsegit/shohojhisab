'use client';

import { getVaultData, saveVaultSnapshot } from './dataVault';
import { queueOfflineAction } from './offlineDataLayer';
import { cleanSpokenBengali } from './banglaSpeechUtils';

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
  assistantName = 'সহজহিসাব'
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
    /(পস|কাউন্টার|মেমো|বিক্রি|বিক্রয়|সেল|বিল|pos|counter|memo|sell|bikri).*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন|করো|পেজ|পাতা|স্ক্রিন)/i.test(normalized) ||
    /(যাও|খোল|নিয়ে|চল|দেখা|ওপেন).*(পস|কাউন্টার|মেমো|বিক্রি|বিক্রয়|সেল|বিল|pos)/i.test(normalized) ||
    /^(বিক্রি পেজ|বিক্রির পেজ|পস পেজ|মেমো পেজ|বিক্রি কাউন্টার|ক্যাশ কাউন্টার|বিক্রিতে যাও|বিক্রি পেজে যাও)$/i.test(normalized)
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
    /(খাতা|বাকি|কাস্টমার|দেনাদার).*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন|পেজ)/i.test(normalized) ||
    /(যাও|খোল|নিয়ে|চল|দেখা|ওপেন).*(খাতা|বাকি|কাস্টমার)/i.test(normalized)
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
     /(স্টক|মাল|পণ্য|ইনভেন্টরি).*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন|পেজ)/i.test(normalized) ||
     /(যাও|খোল|নিয়ে|চল|দেখা|ওপেন).*(স্টক|ইনভেন্টরি)/i.test(normalized))
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
    /(খরচ|ব্যয়).*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন|পেজ)/i.test(normalized) ||
    /(যাও|খোল|নিয়ে|চল|দেখা|ওপেন).*(খরচ|ব্যয়)/i.test(normalized)
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
    /(রিপোর্ট|হিসাব).*(যাও|খোল|নিয়ে|চল|দেখা|ওপেন|পেজ)/i.test(normalized) ||
    /(যাও|খোল|নিয়ে|চল|দেখা|ওপেন).*(রিপোর্ট|হিসাব)/i.test(normalized)
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
    const totalSold = todaySales.reduce((acc, s) => acc + (Number(s.totalAmount || s.netTotal || s.total_amount || 0)), 0);
    const totalCash = todaySales.reduce((acc, s) => acc + (Number(s.paidAmount || s.paid_amount || 0)), 0);
    const totalExp = todayExpenses.reduce((acc, e) => acc + (Number(e.amount || 0)), 0);
    const estProfit = Math.round(totalSold * 0.2 - totalExp);

    const speech = `আজকে সর্বমোট বিক্রি ৳${totalSold.toLocaleString('en-US')} টাকা, ক্যাশ জমা ৳${totalCash.toLocaleString('en-US')} টাকা এবং আনুমানিক নিট লাভ ৳${estProfit.toLocaleString('en-US')} টাকা।`;
    return {
      success: true,
      reply: `📊 **আজকের অফলাইন বিক্রি ও লাভ রিপোর্ট:**\n• সর্বমোট বিক্রি: ৳${totalSold.toLocaleString('en-US')}\n• ক্যাশ কালেকশন: ৳${totalCash.toLocaleString('en-US')}\n• মোট খরচ: ৳${totalExp.toLocaleString('en-US')}\n• আনুমানিক নিট লাভ: ৳${estProfit.toLocaleString('en-US')}\n• মোট মেমো: ${todaySales.length}টি\n\n🟢 *অফলাইন মেমোরি থেকে তাৎক্ষণিক প্রস্তুত*`,
      speech,
      navigateTo: '/reports',
      actionLink: { text: 'আজকের বিস্তারিত রিপোর্ট →', href: '/reports' },
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

  // 4b. Specific Product Stock Query (যেমন: "নাপা কয়টা আছে?", "তেল কত লিটার আছে?", "চাল কতটুকু আছে?")
  const specificStockMatch = normalized.match(/(.+?)\s*(?:কয়টা|কয়টা|কতটুকু|কত\s*কেজি|কত\s*লিটার|কত\s*পাতা|কত\s*পিস|কত|কয়|কয়)\s*(?:কেজি|লিটার|পাতা|পিস|প্যাকেট|বোতল)?\s*(?:আছে|স্টক আছে|স্টকে আছে|মজুদ আছে|বাকি আছে)/i);
  if (specificStockMatch && !/আজকে|মোট|খরচ|বাকি|টাকা/i.test(normalized)) {
    const searchName = specificStockMatch[1].replace(/দোকানে|স্টকে|আমাদের|বর্তমান|ভাই|মাল/g, '').trim();
    if (searchName && searchName.length >= 2) {
      const p = products.find(prod => {
        const b = (prod.banglaName || prod.name || '').toLowerCase();
        return b.includes(searchName) || searchName.includes(b);
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
        type: 'customer_payment',
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
