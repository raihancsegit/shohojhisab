/**
 * Universal Bengali Voice Parser for Installment Sales (কিস্তি ও ইএমআই বিক্রয়)
 * Extracts customer, product, total price, down payment, installment duration (months), and guarantor details from natural spoken Bengali.
 */

import { normalizeSpokenNumbers } from './voicePOSParser';
import { normalizeBengaliNumbers, getBengaliStringSimilarity } from './banglaSpeechUtils';

export interface VoiceInstallmentParseResult {
  success: boolean;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productName: string;
  totalAmount: number;
  downPayment: number;
  totalMonths: string;
  monthlyInstallment: number;
  remainingDue: number;
  guarantorName: string;
  guarantorPhone: string;
  rawSpeech: string;
  explanation: string;
}

export function parseVoiceInstallment(
  rawSpeech: string,
  existingCustomers: any[] = [],
  existingProducts: any[] = []
): VoiceInstallmentParseResult {
  if (!rawSpeech || !rawSpeech.trim()) {
    return {
      success: false,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      productName: '',
      totalAmount: 0,
      downPayment: 0,
      totalMonths: '4',
      monthlyInstallment: 0,
      remainingDue: 0,
      guarantorName: '',
      guarantorPhone: '',
      rawSpeech: '',
      explanation: 'কোনো কথা শুনতে পাওয়া যায়নি।'
    };
  }

  // 1. Normalize numbers & speech
  let normalized = normalizeSpokenNumbers(rawSpeech);
  normalized = normalizeBengaliNumbers(normalized);

  // Extract phone numbers (01xxxxxxxxx or 8801xxxxxxxxx)
  let customerPhone = '';
  let guarantorPhone = '';
  const phoneRegex = /(?:(?:\+|00)?88)?(01[3-9]\d{8})/g;
  const phoneMatches = [...normalized.matchAll(phoneRegex)];

  if (phoneMatches.length > 0) {
    customerPhone = phoneMatches[0][1];
    if (phoneMatches.length > 1) {
      guarantorPhone = phoneMatches[1][1];
    }
  }

  // Extract Duration / Months (default is 4 months)
  let totalMonths = '4';
  const monthMatch = normalized.match(/(\d+)\s*(?:মাস|মাসের|মাসিক|month)/i);
  if (monthMatch && monthMatch[1]) {
    const m = parseInt(monthMatch[1], 10);
    if ([2, 3, 4, 5, 6, 8, 9, 10, 12, 18, 24].includes(m)) {
      totalMonths = String(m);
    } else if (m > 0 && m <= 36) {
      totalMonths = String(m);
    }
  } else if (/১\s*বছর|এক\s*বছর|1\s*year/i.test(normalized)) {
    totalMonths = '12';
  } else if (/দেড়\s*বছর|1\.5\s*year/i.test(normalized)) {
    totalMonths = '18';
  } else if (/২\s*বছর|দুই\s*বছর|2\s*year/i.test(normalized)) {
    totalMonths = '24';
  }

  // Extract Down Payment
  let downPayment = 0;
  const downPaymentRegexes = [
    /(?:ডাউন\s*পেমেন্ট|ডাউনপেমেন্ট|ডাউন|নগদ\s*জমা|নগদ\s*দিল|নগদ\s*দিলো|অগ্রিম|জমা|নগদ)\s*(?:দিল|দিলো|হলো|হল|হচ্ছে|বাবদ)?\s*(\d+(?:\.\d+)?)\s*(?:টাকা|টাকার)?/i,
    /(\d+(?:\.\d+)?)\s*(?:টাকা|টাকার)?\s*(?:ডাউন\s*পেমেন্ট|ডাউন|নগদ\s*জমা|অগ্রিম|জমা)/i
  ];

  for (const regex of downPaymentRegexes) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (val > 0) {
        downPayment = val;
        break;
      }
    }
  }

  // Extract Total Amount
  let totalAmount = 0;
  const totalAmountRegexes = [
    /(?:মোট\s*মূল্য|মোট\s*দাম|মোট|মূল্য|দাম|বিল)\s*(\d+(?:\.\d+)?)\s*(?:টাকা|টাকার)?/i,
    /(\d+(?:\.\d+)?)\s*টাকার/i,
    /(\d+(?:\.\d+)?)\s*টাকা\s*(?:কিস্তি|কিস্তিতে|বিক্রি|দিলাম|হিসাব)/i
  ];

  for (const regex of totalAmountRegexes) {
    const match = normalized.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (val > downPayment || totalAmount === 0) {
        totalAmount = val;
        break;
      }
    }
  }

  // If totalAmount is still 0, find any large number in the speech that is not phone or months
  if (totalAmount === 0) {
    const allNumbers = [...normalized.matchAll(/\b(\d+)\b/g)]
      .map(m => parseInt(m[1], 10))
      .filter(n => n >= 100 && String(n) !== customerPhone && String(n) !== guarantorPhone);

    if (allNumbers.length > 0) {
      // Pick the highest number as total amount
      const maxNum = Math.max(...allNumbers);
      totalAmount = maxNum;
      // If downPayment wasn't found and there's a second smaller number >= 100
      if (downPayment === 0 && allNumbers.length > 1) {
        const smaller = allNumbers.filter(n => n < maxNum && n >= 100);
        if (smaller.length > 0) {
          downPayment = Math.max(...smaller);
        }
      }
    }
  }

  // Extract Guarantor Name if spoken
  let guarantorName = '';
  const guarantorMatch = normalized.match(/(?:জামিনদার|গ্যারান্টার|জামিন)\s*(?:হিসেবে|হিসাবে|নামে|হলো|হল)?\s*([^\d,।\n]+?)(?=\s*(?:ফোন|মোবাইল|০১৭|০১৮|০১৯|০১৩|০১৬|টাকা|ডাউন|কিস্তি|,|$))/i);
  if (guarantorMatch && guarantorMatch[1]) {
    guarantorName = guarantorMatch[1].replace(/(?:এর|কে|নামে|ভাই|সাহেব)/g, '').trim();
  }

  // Extract Customer Name
  let customerName = '';
  // Check against existing customers first
  if (existingCustomers && existingCustomers.length > 0) {
    for (const cust of existingCustomers) {
      if (!cust.name) continue;
      const cleanCustName = cust.name.trim();
      if (normalized.includes(cleanCustName)) {
        customerName = cleanCustName;
        if (!customerPhone && cust.phone) {
          customerPhone = cust.phone;
        }
        break;
      }
    }
  }

  // If not found in existing customers, extract from grammar patterns
  if (!customerName) {
    const customerPatterns = [
      /(?:নামে|নাম)\s*([^\d,।\n]+?)(?=\s*(?:এর|কে|র|পণ্য|ফোন|মোবাইল|কিস্তি|টাকা|দাম|,|$))/i,
      /^([^\d,।\n]+?)(?:\s*(?:এর|ের|কে|ভাইকে|ভাই|চাচা|কাকা|সাহেব|বেগম|হাজী)?\s*(?:কাছে|নামে|কিস্তিতে|কিস্তি))/i,
      /গ্রাহক\s*([^\d,।\n]+?)(?=\s*(?:ফোন|মোবাইল|পণ্য|কিস্তি|টাকা|,|$))/i
    ];

    for (const pat of customerPatterns) {
      const match = normalized.match(pat);
      if (match && match[1]) {
        let nameCandidate = match[1].trim();
        nameCandidate = nameCandidate.replace(/^(?:নতুন\s*কিস্তি|কিস্তি\s*বিক্রি|একটি|একটা|আরেকটা|দোকানদার|ভাই)\s*/i, '');
        nameCandidate = nameCandidate.replace(/\s*(?:এর\s*কাছে|কে|এর|ের|কাছে)$/i, '').trim();
        if (nameCandidate.length >= 2 && !/(?:কিস্তি|টাকা|পণ্য|মোবাইল|ফ্রিজ|টিভি)/i.test(nameCandidate)) {
          customerName = nameCandidate;
          break;
        }
      }
    }
  }

  // Fallback customer name if none detected
  if (!customerName) {
    const words = rawSpeech.split(/\s+/);
    if (words.length > 0 && !/(?:কিস্তি|টাকা|বিক্রি|ডাউন)/i.test(words[0])) {
      customerName = words.slice(0, 2).join(' ');
    } else {
      customerName = 'সম্মানিত গ্রাহক';
    }
  }

  // Extract Product Name
  let productName = '';
  // Check against existing products catalog
  if (existingProducts && existingProducts.length > 0) {
    for (const prod of existingProducts) {
      const pName = prod.bangla_name || prod.banglaName || prod.name || '';
      if (!pName) continue;
      if (normalized.toLowerCase().includes(pName.toLowerCase())) {
        productName = pName;
        break;
      }
    }
  }

  // If not matched directly, search for appliance/electronics/furniture keywords
  if (!productName) {
    const commonProductKeywords = [
      /(?:স্যামসাং|রিয়েলমি|শাওমি|অপ্পো|ভিভো|আইফোন|নকিয়া|স্মার্টফোন|বাটন\s*ফোন|মোবাইল\s*ফোন|মোবাইল)/i,
      /(?:ওয়ালটন|সিঙ্গার|মার্সেল|হাইসেন্স|হায়ার|ভিশন|মিনিস্টার|যমুনা)\s*(?:ফ্রিজ|টিভি|রেফ্রিজারেটর|এলইডি\s*টিভি|এসি|ওয়াশিং\s*মেশিন|ওভেন|ব্লেন্ডার)?/i,
      /(?:ফ্রিজ|রেফ্রিজারেটর|ডিপ\s*ফ্রিজ|স্মার্ট\s*টিভি|এলইডি\s*টিভি|টিভি|এসি|এয়ার\s*কন্ডিশনার|সিলিং\s*ফ্যান|স্ট্যান্ড\s*ফ্যান|আইপিএস|ব্যাটারি)/i,
      /(?:ল্যাপটপ|কম্পিউটার|ডেস্কটপ|মনিটর|প্রিন্টার)/i,
      /(?:খাট|সোফা|আলমারি|ওয়ারড্রব|ড্রেসিং\s*টেবিল|ডাইনিং\s*টেবিল|শোকেস|চেয়ার|টেবিল)/i,
      /(?:মোটরসাইকেল|বাইক|স্কুটার|সাইকেল)/i,
      /(?:সেলাই\s*মেশিন|রাইস\s*কুকার|প্রেসার\s*কুকার|গ্যাস\s*স্টোভ|চুলা)/i
    ];

    for (const kw of commonProductKeywords) {
      const match = normalized.match(kw);
      if (match) {
        // capture full surrounding words if brand + product
        const brandMatch = normalized.match(new RegExp(`([^\d,।\n]*?${match[0]}[^\d,।\n]*?)` + '(?=\\s*(?:কিস্তি|টাকা|মূল্য|দাম|ডাউন|ফোন|,|$))', 'i'));
        productName = (brandMatch && brandMatch[1]) ? brandMatch[1].trim() : match[0].trim();
        break;
      }
    }
  }

  // Fallback product name extraction
  if (!productName) {
    const prodMatch = normalized.match(/(?:পণ্য|আইটেম|মডেল|জিনিস)\s*([^\d,।\n]+?)(?=\s*(?:টাকা|মূল্য|দাম|ডাউন|কিস্তি|ফোন|,|$))/i);
    if (prodMatch && prodMatch[1]) {
      productName = prodMatch[1].trim();
    } else {
      productName = 'কিস্তির পণ্য / সরঞ্জাম';
    }
  }

  // Clean customer and product name
  customerName = customerName.replace(/(?:কিস্তি|বিক্রি|টাকা|দাম|ডাউন|পেমেন্ট)/g, '').trim();
  productName = productName.replace(/(?:কিস্তি|বিক্রি|টাকা|দাম|ডাউন|পেমেন্ট|হিসাব)/g, '').trim();

  // Calculations
  const remainingDue = Math.max(0, totalAmount - downPayment);
  const numMonths = Math.max(1, parseInt(totalMonths, 10) || 1);
  const monthlyInstallment = Math.round(remainingDue / numMonths);

  const isValid = totalAmount > 0;

  let explanation = '';
  if (isValid) {
    explanation = `${customerName}-এর নামে ${productName} (মোট ৳${totalAmount.toLocaleString('en-US')}, ডাউন ৳${downPayment.toLocaleString('en-US')}, ${totalMonths} মাস কিস্তি)`;
  } else {
    explanation = 'পণ্যের মোট মূল্য ও বিস্তারিত সঠিকভাবে বুঝতে পারিনি। আবার পরিষ্কার করে বলুন।';
  }

  return {
    success: isValid,
    customerName: customerName || 'সম্মানিত গ্রাহক',
    customerPhone: customerPhone || '',
    customerAddress: '',
    productName: productName || 'পণ্য',
    totalAmount,
    downPayment,
    totalMonths,
    monthlyInstallment,
    remainingDue,
    guarantorName,
    guarantorPhone,
    rawSpeech,
    explanation
  };
}
