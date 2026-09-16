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

  // 2. Voice Sale Execution with Real Stock Deduction (যেমন: "তেল ১ লিটার বিক্রি করো" / "২ কেজি চিনি বিক্রি" / "নাপা ৫০ পাতা বিক্রি")
  const saleMatch = normalized.match(/(.+?)\s+(\d+)\s*(পাতা|পিস|কেজি|লিটার|বোতল|প্যাকেট|বক্স|ডজন|টি)?\s*(বিক্রি করো|বিক্রি|সেল|বেচলাম|বিক্রয়|মেমো করো)/i) ||
                    normalized.match(/(\d+)\s*(পাতা|পিস|কেজি|লিটার|বোতল|প্যাকেট|বক্স|ডজন|টি)?\s*(.+?)\s*(বিক্রি করো|বিক্রি|সেল|বেচলাম|বিক্রয়|মেমো করো)/i);
  if (saleMatch) {
    let prodSearch = '';
    let qty = 1;
    let unit = 'পিস';

    if (isNaN(Number(saleMatch[1]))) {
      prodSearch = saleMatch[1].replace(/বিক্রি|সেল|করো|মেমো|আইটেম|এর|টা/g, '').trim();
      qty = Number(saleMatch[2]) || 1;
      unit = saleMatch[3] || 'পিস';
    } else {
      qty = Number(saleMatch[1]) || 1;
      unit = saleMatch[2] || 'পিস';
      prodSearch = saleMatch[3].replace(/বিক্রি|সেল|করো|মেমো|আইটেম|এর|টা/g, '').trim();
    }

    if (prodSearch && qty > 0) {
      let matchedProd = products.find(p =>
        (p.banglaName || p.name || '').toLowerCase().includes(prodSearch.toLowerCase()) ||
        prodSearch.toLowerCase().includes((p.banglaName || p.name || '').toLowerCase())
      );

      const unitPrice = matchedProd ? (matchedProd.sellingPrice || matchedProd.price || 100) : 100;
      const prodName = matchedProd ? (matchedProd.banglaName || matchedProd.name) : prodSearch;
      const actualUnit = matchedProd?.unit || unit;
      const lineTotal = unitPrice * qty;

      // 1. Deduct Stock from matching product if found
      let updatedProducts = products.map(p => {
        if (matchedProd && p.id === matchedProd.id) {
          return { ...p, stock: Math.max(0, Number(p.stock || 0) - qty) };
        }
        return p;
      });

      const newStock = matchedProd ? Math.max(0, Number(matchedProd.stock || 0) - qty) : 0;

      // 2. Create Sale Record
      const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
      const newSale = {
        id: `sale-${Date.now()}`,
        invoiceNo,
        customerName: 'নগদ ক্রেতা',
        customerPhone: '',
        items: [{
          id: matchedProd?.id || `item-${Date.now()}`,
          name: prodName,
          unit: actualUnit,
          quantity: qty,
          price: unitPrice,
          unitPrice,
          total: lineTotal,
          totalPrice: lineTotal
        }],
        subtotal: lineTotal,
        discount: 0,
        total: lineTotal,
        totalAmount: lineTotal,
        paidAmount: lineTotal,
        dueAmount: 0,
        paymentMethod: 'cash' as const,
        createdAt: new Date().toISOString()
      };

      const updatedSales = [newSale, ...sales];
      saveLocalVaultSnapshot(tenantId, {
        products: updatedProducts,
        sales: updatedSales
      });

      const speech = `${qty} ${actualUnit} ${prodName} বিক্রি হয়েছে। মোট ${lineTotal} টাকা।${matchedProd ? ` বর্তমান স্টক ${newStock} ${actualUnit}।` : ''}`;
      return {
        success: true,
        reply: `🧾 **ভয়েস মেমো সফল #${invoiceNo}**\n• পণ্য: ${prodName}\n• পরিমাণ: ${qty} ${actualUnit}\n• মোট মূল্য: ৳${lineTotal} টাকা\n• নতুন স্টক: ${newStock} ${actualUnit}\n• পরিশোধ: নগদ (ক্যাশ)`,
        speech,
        navigateTo: '/pos',
        isOffline: true
      };
    }
  }

  // 3. Quick Cash Memo (যেমন: "১০০ টাকার মেমো" / "৫০০ টাকার বিক্রি")
  const quickMemoMatch = normalized.match(/(\d+)\s*টাকার?\s*(মেমো|বিক্রি|সেল|ক্যাশ)/i);
  if (quickMemoMatch) {
    const amount = Number(quickMemoMatch[1]);
    if (amount > 0) {
      const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
      const newSale = {
        id: `sale-${Date.now()}`,
        invoiceNo,
        customerName: 'নগদ ক্রেতা',
        customerPhone: '',
        items: [{
          id: `item-${Date.now()}`,
          name: 'খুচরা পণ্য সামগ্রী',
          unit: 'পিস',
          quantity: 1,
          price: amount,
          unitPrice: amount,
          total: amount,
          totalPrice: amount
        }],
        subtotal: amount,
        discount: 0,
        total: amount,
        totalAmount: amount,
        paidAmount: amount,
        dueAmount: 0,
        paymentMethod: 'cash' as const,
        createdAt: new Date().toISOString()
      };

      saveLocalVaultSnapshot(tenantId, {
        sales: [newSale, ...sales]
      });

      const speech = `${amount} টাকার নগদ মেমো সম্পন্ন হয়েছে।`;
      return {
        success: true,
        reply: `🧾 **নগদ মেমো #${invoiceNo}**\n• মোট আদায়: ৳${amount} টাকা\n• কাস্টমার: নগদ ক্রেতা`,
        speech,
        navigateTo: '/pos',
        isOffline: true
      };
    }
  }

  // 4. Sales & Profit Query (আজকের বিক্রি ও লাভ)
  if (/আজকে|আজকের/i.test(normalized) && /বিক্রি|সেল|লাভ|টাকা|আয়/i.test(normalized) && !/খরচ|বাকি|স্টক/i.test(normalized)) {
    const totalSold = todaySales.reduce((acc, s) => acc + Number(s.totalAmount || s.total || s.netTotal || 0), 0);
    const totalCash = todaySales.reduce((acc, s) => acc + Number(s.paidAmount || s.paid_amount || 0), 0);
    const totalExp = todayExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const estProfit = Math.round(totalSold * 0.2 - totalExp);

    const speech = `আজকে মোট বিক্রি ৳${totalSold.toLocaleString('en-US')} টাকা, ক্যাশ জমা ৳${totalCash.toLocaleString('en-US')} টাকা এবং আনুমানিক লাভ ৳${estProfit.toLocaleString('en-US')} টাকা।`;
    return {
      success: true,
      reply: `📊 **আজকের বিক্রি ও লাভ report:**\n• সর্বমোট বিক্রি: ৳${totalSold.toLocaleString('en-US')}\n• ক্যাশ কালেকশন: ৳${totalCash.toLocaleString('en-US')}\n• মোট খরচ: ৳${totalExp.toLocaleString('en-US')}\n• আনুমানিক লাভ: ৳${estProfit.toLocaleString('en-US')}\n• মোট মেমো: ${todaySales.length}টি`,
      speech,
      navigateTo: '/reports',
      isOffline: true
    };
  }

  // 5. Low Stock / Stock Check (কোন মালের স্টক কম)
  if (/স্টক কম|কোন মাল কম|মাল শেষ|কোন কোন মালের স্টক/i.test(normalized)) {
    const lowItems = products.filter(p => Number(p.stock || 0) <= Number(p.lowStockThreshold || p.minStockAlert || 5));
    if (lowItems.length === 0) {
      return {
        success: true,
        reply: '✅ আলহামদুলিল্লাহ! আপনার দোকানে কোনো পণ্যের স্টক কম নেই।',
        speech: 'দোকানে সব মালের স্টক পর্যাপ্ত আছে।',
        navigateTo: '/stock',
        isOffline: true
      };
    }

    const top3 = lowItems.slice(0, 3).map(p => `• ${p.banglaName || p.name} (বাকি: ${p.stock} ${p.unit || 'পিস'})`).join('\n');
    const speech = `দোকানে ${lowItems.length}টি পণ্যের স্টক কম রয়েছে। যেমন: ${lowItems.slice(0, 2).map(p => p.banglaName || p.name).join(' ও ')}।`;
    return {
      success: true,
      reply: `⚠️ **স্টক অ্যালার্ট (${lowItems.length}টি পণ্যের স্টক কম):**\n${top3}`,
      speech,
      navigateTo: '/stock',
      isOffline: true
    };
  }

  // 6. Overall Stock Query (আজকের স্টক কত / মোট স্টক)
  if (/স্টক কত|মোট স্টক|স্টকের হিসাব|আজকের স্টক/i.test(normalized)) {
    const totalCount = products.reduce((acc, p) => acc + Number(p.stock || 0), 0);
    const lowItems = products.filter(p => Number(p.stock || 0) <= Number(p.minStockAlert || 5));
    const speech = `দোকানে ${products.length} প্রকার পণ্যের মোট ${totalCount}টি আইটেম স্টকে আছে।${lowItems.length > 0 ? ` এর মধ্যে ${lowItems.length}টি পণ্যের স্টক কম।` : ''}`;
    return {
      success: true,
      reply: `📦 **মোট স্টক ইনভেন্টরি:**\n• মোট আইটেম সংখ্যা: ${totalCount}টি\n• ভিন্ন পণ্য: ${products.length} প্রকার\n• লো-স্টক পণ্য: ${lowItems.length}টি`,
      speech,
      navigateTo: '/stock',
      isOffline: true
    };
  }

  // 7. Product Price Check (যেমন: "তেলের দাম কত" / "চিনির দাম কত")
  const priceCheckMatch = normalized.match(/(.+?)\s*(এর দাম কত|দাম কত|কত টাকা|দর কত)/i);
  if (priceCheckMatch) {
    const prodSearch = priceCheckMatch[1].replace(/এর|দাম|কত|টাকা/g, '').trim();
    if (prodSearch) {
      const matched = products.find(p => (p.banglaName || p.name || '').toLowerCase().includes(prodSearch.toLowerCase()));
      if (matched) {
        const sellPrice = matched.sellingPrice || matched.price || 0;
        const buyPrice = matched.purchasePrice || matched.costPrice || 0;
        const speech = `${matched.banglaName || matched.name} এর বিক্রয় মূল্য ${sellPrice} টাকা, কেনা দাম ${buyPrice} টাকা। বর্তমান স্টক ${matched.stock} ${matched.unit || 'পিস'}।`;
        return {
          success: true,
          reply: `🏷️ **${matched.banglaName || matched.name}**\n• বিক্রয় মূল্য: ৳${sellPrice} টাকা\n• ক্রয় মূল্য: ৳${buyPrice} টাকা\n• বর্তমান স্টক: ${matched.stock} ${matched.unit || 'পিস'}`,
          speech,
          navigateTo: '/products',
          isOffline: true
        };
      }
    }
  }

  // 8. Quick Stock Add (যেমন: "নাপা ৫০ পাতা স্টক যোগ করো")
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
          price: 50,
          costPrice: 40,
          stock: qty,
          unit,
          category: 'সাধারণ',
          icon: '📦'
        };
        products.push(matched);
      } else {
        matched.stock = Number(matched.stock || 0) + qty;
      }

      saveLocalVaultSnapshot(tenantId, { products });
      const speech = `${matched.banglaName || matched.name} এর স্টকে ${qty} ${unit} যোগ হয়েছে। বর্তমান স্টক ${matched.stock} ${unit}।`;
      return {
        success: true,
        reply: `✓ "${matched.banglaName || matched.name}" এর স্টকে ${qty} ${unit} যোগ হয়েছে! (নতুন স্টক: ${matched.stock} ${unit})`,
        speech,
        navigateTo: '/stock',
        isOffline: true
      };
    }
  }

  // 9. Customer Due Payment / জমা আদায় (যেমন: "রহিম ৫০০ টাকা জমা দিল" / "করিমের ২০০ টাকা জমা নাও")
  const payMatch = normalized.match(/(.+?)\s+(\d+)\s*টাকা?\s*(জমা দিল|পরিশোধ করল|দিল|জমা করলো|জমা নাও|জমা)/i);
  if (payMatch) {
    const custName = payMatch[1].replace(/ভাই|চাচা|মামা|এর|কে/g, '').trim();
    const amount = Number(payMatch[2]);

    if (custName && amount > 0) {
      let cust = customers.find(c => (c.name || '').toLowerCase().includes(custName.toLowerCase()));
      if (!cust) {
        cust = { id: `c-off-${Date.now()}`, name: custName, phone: '', totalDue: 0 };
        customers.push(cust);
      } else {
        cust.totalDue = Math.max(0, Number(cust.totalDue || 0) - amount);
      }

      saveLocalVaultSnapshot(tenantId, { customers });
      const speech = `${cust.name} এর ${amount} টাকা জমা নেওয়া হয়েছে। বর্তমান বাকি ${cust.totalDue} টাকা।`;
      return {
        success: true,
        reply: `✓ **${cust.name}** ৳${amount} টাকা পরিশোধ করেছেন!\n(বর্তমান বকেয়া: ৳${cust.totalDue} টাকা)`,
        speech,
        navigateTo: '/khata',
        isOffline: true
      };
    }
  }

  // 10. Customer Due Entry (যেমন: "রহিম ভাই ৫০০ টাকা বাকি নিল")
  const dueMatch = normalized.match(/(.+?)\s+(\d+)\s*টাকা?\s*(বাকি নিল|বাকি লেখো|বাকি|বাকিতে)/i);
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

  // 11. Expense Entry (যেমন: "চা নাস্তা ৬০ টাকা খরচ লেখো")
  const expMatch = normalized.match(/(.+?)\s+(\d+)\s*টাকা?\s*(খরচ লেখো|খরচ|ব্যয়)/i);
  if (expMatch) {
    const expTitle = expMatch[1].replace(/টাকা|খরচ|লেখো/g, '').trim() || 'দোকান খরচ';
    const amount = Number(expMatch[2]);

    if (amount > 0) {
      expenses.push({
        id: `e-off-${Date.now()}`,
        title: expTitle,
        category: 'সাধারণ',
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

  // 12. Market Total Due Query (বাজারে মোট বাকি কত)
  if (/মোট বাকি|বাজারে কত বাকি|কাস্টমার বাকি|বকেয়া/i.test(normalized)) {
    const totalDue = customers.reduce((acc, c) => acc + Number(c.totalDue || c.due || 0), 0);
    const speech = `বাজারে মোট বকেয়া বাকি আছে ৳${totalDue.toLocaleString('en-US')} টাকা।`;
    return {
      success: true,
      reply: `📒 **বাজারে মোট বকেয়া বাকি:** ৳${totalDue.toLocaleString('en-US')} টাকা\nমোট বাকি কাস্টমার: ${customers.filter(c => Number(c.totalDue || 0) > 0).length} জন`,
      speech,
      navigateTo: '/khata',
      isOffline: true
    };
  }

  // Default Fallback
  return {
    success: true,
    reply: `💡 আমি আপনার হিসাব বুঝতে প্রস্তুত।\nবলুন:\n• "তেল ১ লিটার বিক্রি করো"\n• "আজকের বিক্রি কত"\n• "আজকের স্টক কত"\n• "রহিম ৫০০ টাকা বাকি নিল"\n• "চা ৬০ টাকা খরচ"`,
    speech: 'দোকানের বিক্রি, বাকি, খরচ বা স্টকের হিসাব জানতে যেকোনো কিছু বলুন।',
    isOffline: true
  };
}

export const parseBanglaVoiceInput = executeMobileAiCommand;
export const parseBengaliCommand = executeMobileAiCommand;
