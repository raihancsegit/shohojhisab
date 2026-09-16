/**
 * 🤖 On-Device Offline Bengali AI Assistant Engine (React Native)
 * Executes 100% locally on phone CPU in <10ms. Zero network needed.
 */

import { getLocalVaultData, saveLocalVaultSnapshot } from './offlineDataVault';

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
  s = s.replace(/দেড় হাজার|দেড় হাজার/g, '1500');
  s = s.replace(/আড়াই হাজার|আড়াই হাজার/g, '2500');
  s = s.replace(/এক হাজার/g, '1000');

  const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  for (let i = 0; i < 10; i++) {
    s = s.replace(new RegExp(bnNums[i], 'g'), String(i));
  }
  return s;
}

export function executeMobileAiCommand(
  tenantId: string,
  rawText: string,
  assistantName = 'সহজহিসাব'
): OfflineAiResult {
  const text = String(rawText || '').trim();
  if (!text) {
    return {
      success: false,
      reply: 'দয়া করে কিছু মুখে বলুন বা লিখে জানান।',
      speech: 'দয়া করে কিছু মুখে বলুন বা লিখে জানান।',
      isOffline: true
    };
  }

  const cleanedText = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}?？!।,:;]/gu, '').trim();
  const normalized = parseBengaliNumbers(cleanedText.toLowerCase());

  const vault = getLocalVaultData(tenantId);
  let products: any[] = vault.products || [];
  let sales: any[] = vault.sales || [];
  let customers: any[] = vault.customers || [];
  let expenses: any[] = vault.expenses || [];

  if (products.length === 0) {
    products = [
      { id: 'p-1', name: 'নাপা এক্সট্রা', banglaName: 'নাপা এক্সট্রা', sellingPrice: 30, purchasePrice: 24, stock: 45, unit: 'পাতা' },
      { id: 'p-2', name: 'সয়াবিন তেল', banglaName: 'সয়াবিন তেল', sellingPrice: 180, purchasePrice: 165, stock: 12, unit: 'লিটার' },
      { id: 'p-3', name: 'চিনি', banglaName: 'চিনি', sellingPrice: 135, purchasePrice: 120, stock: 30, unit: 'কেজি' }
    ];
    saveLocalVaultSnapshot(tenantId, { products });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((s: any) => (s.createdAt || s.created_at || '').startsWith(todayStr));
  const todayExpenses = expenses.filter((e: any) => (e.date || e.createdAt || '').startsWith(todayStr));

  // 1. Navigation Commands
  if (/^(পস|কাউন্টার|মেমো|বিক্রি|বিক্রয়|সেল)$/i.test(normalized) || /পস.*(যাও|খোল|নিয়ে|চল)|বিক্রি\s*পেজ/i.test(normalized)) {
    return {
      success: true,
      reply: 'বিক্রয় ও মেমো কাউন্টারে নিয়ে যাচ্ছি...',
      speech: 'বিক্রয় কাউন্টারে যাচ্ছি।',
      navigateTo: '/pos',
      isOffline: true
    };
  }

  if (/^(খাতা|বাকি|বাকির খাতা|কাস্টমার)$/i.test(normalized) || /খাতা.*(যাও|খোল|নিয়ে|চল)|বাকি.*(যাও|খোল|নিয়ে|চল)/i.test(normalized)) {
    return {
      success: true,
      reply: 'বাকির খাতায় নিয়ে যাচ্ছি...',
      speech: 'বাকি খাতা খুলছি।',
      navigateTo: '/khata',
      isOffline: true
    };
  }

  if (/^(স্টক|মাল|পণ্য|ইনভেন্টরি)$/i.test(normalized) || /স্টক.*(যাও|খোল|নিয়ে|চল)/i.test(normalized)) {
    if (!/কত|যোগ|তোল|কম|শেষ/i.test(normalized)) {
      return {
        success: true,
        reply: 'দোকানের স্টক ইনভেন্টরিতে নিয়ে যাচ্ছি...',
        speech: 'স্টক পেজে নিয়ে যাচ্ছি।',
        navigateTo: '/stock',
        isOffline: true
      };
    }
  }

  if (/^(খরচ|ব্যয়|খরচের খাতা)$/i.test(normalized) || /খরচ.*(যাও|খোল|নিয়ে|চল)/i.test(normalized)) {
    if (!/টাকা|লেখো/i.test(normalized)) {
      return {
        success: true,
        reply: 'দোকান খরচের খাতায় নিয়ে যাচ্ছি...',
        speech: 'খরচ পেজ খুলছি।',
        navigateTo: '/expenses',
        isOffline: true
      };
    }
  }

  if (/^(রিপোর্ট|হিসাব|আজকের হিসাব)$/i.test(normalized) || /রিপোর্ট.*(যাও|খোল|নিয়ে|চল)/i.test(normalized)) {
    return {
      success: true,
      reply: 'আজকের রিপোর্ট ও হিসাব পেজে নিয়ে যাচ্ছি...',
      speech: 'রিপোর্ট পেজ খুলছি।',
      navigateTo: '/reports',
      isOffline: true
    };
  }

  // 2. Sales & Profit Query (আজকের বিক্রি ও লাভ)
  if (/আজকে|আজকের/i.test(normalized) && /বিক্রি|সেল|লাভ|টাকা/i.test(normalized) && !/খরচ|বাকি|স্টক/i.test(normalized)) {
    const totalSold = todaySales.reduce((acc, s) => acc + Number(s.totalAmount || s.netTotal || 0), 0);
    const totalCash = todaySales.reduce((acc, s) => acc + Number(s.paidAmount || 0), 0);
    const totalExp = todayExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const estProfit = Math.round(totalSold * 0.2 - totalExp);

    const speech = `আজকে মোট বিক্রি ৳${totalSold.toLocaleString('en-US')} টাকা, ক্যাশ জমা ৳${totalCash.toLocaleString('en-US')} টাকা এবং আনুমানিক লাভ ৳${estProfit.toLocaleString('en-US')} টাকা।`;
    return {
      success: true,
      reply: `📊 **আজকের বিক্রি ও লাভ রিপোর্ট:**\n• সর্বমোট বিক্রি: ৳${totalSold.toLocaleString('en-US')}\n• ক্যাশ কালেকশন: ৳${totalCash.toLocaleString('en-US')}\n• মোট খরচ: ৳${totalExp.toLocaleString('en-US')}\n• আনুমানিক লাভ: ৳${estProfit.toLocaleString('en-US')}\n• মোট মেমো: ${todaySales.length}টি`,
      speech,
      navigateTo: '/reports',
      isOffline: true
    };
  }

  // 3. Stock Query (আজকের স্টক কত / মোট স্টক)
  if (/স্টক কত|মোট স্টক|স্টকের হিসাব|আজকের স্টক/i.test(normalized)) {
    const totalCount = products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
    const lowItems = products.filter(p => Number(p.stock || 0) <= 5);
    const speech = `দোকানে ${products.length} প্রকার পণ্যের মোট ${totalCount}টি আইটেম স্টকে আছে।${lowItems.length > 0 ? ` এর মধ্যে ${lowItems.length}টি পণ্যের স্টক কম।` : ''}`;
    return {
      success: true,
      reply: `📦 **মোট স্টক ইনভেন্টরি:**\n• মোট আইটেম সংখ্যা: ${totalCount}টি\n• ভিন্ন পণ্য: ${products.length} প্রকার\n• লো-স্টক পণ্য: ${lowItems.length}টি`,
      speech,
      navigateTo: '/stock',
      isOffline: true
    };
  }

  // 4. Quick Stock Add (যেমন: "নাপা ৫০ পাতা স্টক যোগ করো")
  const stockAddMatch = normalized.match(/(.+?)\s+(\d+)\s*(পাতা|পিস|কেজি|লিটার|বোতল|প্যাকেট|বক্স|ডজন|টি)?\s*(স্টক যোগ|স্টকে তোল|মাল তোল|স্টক)/i);
  if (stockAddMatch) {
    const prodSearch = stockAddMatch[1].replace(/স্টক|মাল|যোগ|নতুন/g, '').trim();
    const qty = Number(stockAddMatch[2]);
    const unit = stockAddMatch[3] || 'পিস';

    if (prodSearch && qty > 0) {
      let matched = products.find(p => (p.banglaName || p.name || '').toLowerCase().includes(prodSearch.toLowerCase()));
      if (!matched) {
        matched = {
          id: `p-off-${Date.now()}`,
          name: prodSearch,
          banglaName: prodSearch,
          sellingPrice: 50,
          purchasePrice: 40,
          stock: qty,
          unit
        };
        products.push(matched);
      } else {
        matched.stock = Number(matched.stock || 0) + qty;
      }

      saveLocalVaultSnapshot(tenantId, { products });
      const speech = `${matched.banglaName || matched.name} এর স্টকে ${qty} ${unit} যোগ হয়েছে।`;
      return {
        success: true,
        reply: `✓ "${matched.banglaName || matched.name}" এর স্টকে ${qty} ${unit} যোগ হয়েছে! (নতুন স্টক: ${matched.stock} ${unit})`,
        speech,
        navigateTo: '/stock',
        isOffline: true
      };
    }
  }

  // 5. Customer Due (যেমন: "রহিম ভাই ৫০০ টাকা বাকি নিল")
  const dueMatch = normalized.match(/(.+?)\s+(\d+)\s*টাকা?\s*(বাকি নিল|বাকি লেখো|বাকি)/i);
  if (dueMatch) {
    const custName = dueMatch[1].replace(/ভাই|চাচা|মামা|এর|কে/g, '').trim();
    const amount = Number(dueMatch[2]);

    if (custName && amount > 0) {
      let cust = customers.find(c => (c.name || '').toLowerCase().includes(custName.toLowerCase()));
      if (!cust) {
        cust = { id: `c-off-${Date.now()}`, name: custName, phone: '', totalDue: amount };
        customers.push(cust);
      } else {
        cust.totalDue = Number(cust.totalDue || 0) + amount;
      }

      saveLocalVaultSnapshot(tenantId, { customers });
      const speech = `${cust.name} এর খাতায় ${amount} টাকা বাকি যোগ হয়েছে।`;
      return {
        success: true,
        reply: `✓ **${cust.name}** এর খাতায় ৳${amount} টাকা বাকি রেকর্ড হয়েছে! (মোট বকেয়া: ৳${cust.totalDue} টাকা)`,
        speech,
        navigateTo: '/khata',
        isOffline: true
      };
    }
  }

  // 6. Expense Entry (যেমন: "চা নাস্তা ৬০ টাকা খরচ লেখো")
  const expMatch = normalized.match(/(.+?)\s+(\d+)\s*টাকা?\s*(খরচ লেখো|খরচ|ব্যয়)/i);
  if (expMatch) {
    const expTitle = expMatch[1].replace(/টাকা|খরচ|লেখো/g, '').trim() || 'দোকান খরচ';
    const amount = Number(expMatch[2]);

    if (amount > 0) {
      expenses.push({
        id: `e-off-${Date.now()}`,
        title: expTitle,
        amount,
        date: todayStr,
        createdAt: new Date().toISOString()
      });

      saveLocalVaultSnapshot(tenantId, { expenses });
      const speech = `${expTitle} ${amount} টাকা খরচ লেখা হয়েছে।`;
      return {
        success: true,
        reply: `✓ **${expTitle}** ৳${amount} টাকা খরচ লেখা হয়েছে!`,
        speech,
        navigateTo: '/expenses',
        isOffline: true
      };
    }
  }

  // Default Fallback
  return {
    success: true,
    reply: `💡 আমি আপনার হিসাব বুঝতে প্রস্তুত।\nবলুন:\n• "আজকের বিক্রি কত"\n• "আজকের স্টক কত"\n• "রহিম ৫০০ টাকা বাকি নিল"\n• "চা ৬০ টাকা খরচ"`,
    speech: 'দোকানের বিক্রি, বাকি, খরচ বা স্টকের হিসাব জানতে যেকোনো কিছু বলুন।',
    isOffline: true
  };
}
