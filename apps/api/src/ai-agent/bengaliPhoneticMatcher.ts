/**
 * 🌟 Bengali Phonetic Matcher & Colloquial Retail Unit Converter
 * Provides soundex-style normalization, fuzzy Levenshtein distance,
 * and Bangladeshi traditional retail unit multipliers (সের, পোয়া, হালি, ডজন, পাতা, ছটাক, ইত্যাদি)
 */

export interface ProductCatalogItem {
  id: string;
  name: string;
  bangla_name?: string;
  generic_name?: string;
  stock?: number;
  unit?: string;
  selling_price?: number;
  purchase_price?: number;
  sub_unit?: string;
  conversion_ratio?: number;
}

export interface CustomerCatalogItem {
  id: string;
  name: string;
  phone?: string;
  total_due?: number;
  credit_limit?: number;
}

/**
 * Common English-to-Bengali transliteration map for fast phonetic lookup of retail brands
 */
const BRAND_TRANSLITERATION_MAP: Record<string, string> = {
  lux: 'লাক্স',
  wheel: 'হুইল',
  rin: 'রিন',
  tide: 'টাইড',
  pepsodent: 'পেপসোডেন্ট',
  closeup: 'ক্লোজআপ',
  'close-up': 'ক্লোজআপ',
  'close up': 'ক্লোজআপ',
  napa: 'নাপা',
  ace: 'এইস',
  paracetamol: 'প্যারাসিটামল',
  savlon: 'স্যাভলন',
  dettol: 'ডেটোল',
  lifebuoy: 'লাইফবয়',
  horlicks: 'হরলিক্স',
  tang: 'ট্যাং',
  nestle: 'নেসলে',
  maggi: 'ম্যাগি',
  pran: 'প্রাণ',
  radhuni: 'রাঁধুনী',
  teer: 'তীর',
  fresh: 'ফ্রেশ',
  rupchanda: 'রূপচাঁদা',
  bashundhara: 'বসুন্ধরা',
  aci: 'এসিআই',
  square: 'স্কয়ার',
  beximco: 'বেক্সিমকো',
  incepta: 'ইনসেপ্টা',
  renata: 'রেনাটা',
  harpic: 'হারপিক',
  vim: 'ভিম',
  surf: 'সার্ফ',
  coke: 'কোক',
  pepsi: 'পেপসি',
  sprite: 'স্প্রাইট',
  sevenup: 'সেভেনআপ',
  '7up': 'সেভেনআপ',
  fanta: 'ফ্যান্টা',
  mirinda: 'মিরিন্ডা',
  mojo: 'মোজো',
  speed: 'স্পিড',
  tiger: 'টাইগার'
};

/**
 * Phonetically normalizes Bengali text by grouping interchangeable consonants,
 * sibilants (শ/ষ/স), nasals (ণ/ন), flaps (ড়/ঢ়/র), and removing hasanta/nukta.
 */
export function canonicalizeBengaliPhonetic(str: string): string {
  if (!str) return '';
  let s = str.trim().toLowerCase();

  // Transliterate common English words into Bengali equivalents
  for (const [en, bn] of Object.entries(BRAND_TRANSLITERATION_MAP)) {
    const reg = new RegExp(`\\b${en}\\b`, 'gi');
    s = s.replace(reg, bn);
  }

  // Remove nukta, virama (hasanta), chandrabindu, and punctuation
  s = s.replace(/[\u09BC\u09CD\u0981]/g, '');

  // Group Sibilants: শ, ষ, স -> স
  s = s.replace(/[শষ]/g, 'স');

  // Group Nasals: ণ, ঞ, ঙ -> ন
  s = s.replace(/[ণঞঙ]/g, 'ন');

  // Group Flaps & Rhotics: ড়, ঢ় -> র
  s = s.replace(/[ড়ঢ়]/g, 'র');

  // Group Dentals: ৎ -> ত, থ -> ত
  s = s.replace(/[ৎথ]/g, 'ত');

  // Group Bilabials: ভ, ফ, ব -> ব
  s = s.replace(/[ভফ]/g, 'ব');

  // Group Vowel variations & Semi-vowels
  s = s.replace(/[যয়]/g, 'জ'); // য/য় -> জ
  s = s.replace(/ৈ/g, 'ই');
  s = s.replace(/ৌ/g, 'উ');
  s = s.replace(/ী/g, 'ি'); // দীর্ঘ-ঈ -> হ্রস্ব-ই
  s = s.replace(/ূ/g, 'ু'); // দীর্ঘ-ঊ -> হ্রস্ব-উ
  s = s.replace(/ঋ/g, 'রি');
  s = s.replace(/ং/g, 'ন');

  // Collapse consecutive identical characters
  s = s.replace(/(.)\1+/g, '$1');

  // Strip non-alphanumeric
  s = s.replace(/[^\u0980-\u09FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Normalizes traditional Bangladeshi shop units and spoken numbers into standard metrics
 */
export function normalizeBangladeshiColloquialUnits(text: string): {
  normalizedText: string;
  detectedConversions: Array<{ original: string; converted: string; quantity: number; unit: string }>;
} {
  let s = String(text || '');
  const detectedConversions: Array<{ original: string; converted: string; quantity: number; unit: string }> = [];

  // Convert Bengali numerals to English numerals
  s = s.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());

  // 1. Ser / শের (1 Ser ≈ 0.93 kg, standard retail benchmark)
  const serMappings: Array<[RegExp, string, number, string]> = [
    [/দেড়\s*সের|দেড়\s*সের|১\.৫\s*সের|1\.5\s*সের/gi, '1.4 কেজি', 1.4, 'কেজি'],
    [/আড়াই\s*সের|আড়াই\s*সের|২\.৫\s*সের|2\.5\s*সের/gi, '2.33 কেজি', 2.33, 'কেজি'],
    [/সাড়ে\s*তিন\s*সের|3\.5\s*সের/gi, '3.25 কেজি', 3.25, 'কেজি'],
    [/আধা\s*সের|আধ\s*সের|হাফ\s*সের/gi, '0.465 কেজি', 0.465, 'কেজি'],
    [/এক\s*সের|১\s*সের|1\s*সের/gi, '0.93 কেজি', 0.93, 'কেজি'],
    [/দুই\s*সের|২\s*সের|2\s*সের/gi, '1.86 কেজি', 1.86, 'কেজি'],
    [/তিন\s*সের|৩\s*সের|3\s*সের/gi, '2.79 কেজি', 2.79, 'কেজি'],
    [/পাঁচ\s*সের|৫\s*সের|5\s*সের/gi, '4.65 কেজি', 4.65, 'কেজি'],
    [/দশ\s*সের|১০\s*সের|10\s*সের/gi, '9.3 কেজি', 9.3, 'কেজি']
  ];

  for (const [pattern, repl, qty, unit] of serMappings) {
    if (pattern.test(s)) {
      detectedConversions.push({ original: s.match(pattern)?.[0] || '', converted: repl, quantity: qty, unit });
      s = s.replace(pattern, repl);
    }
  }

  // 2. Poya / পোয়া (1 Poya = 250 grams = 0.25 kg)
  const poyaMappings: Array<[RegExp, string, number, string]> = [
    [/আধ\s*পোয়া|আধ\s*পোয়া|হাফ\s*পোয়া|হাফ\s*পোয়া|0\.5\s*পোয়া/gi, '0.125 কেজি', 0.125, 'কেজি'],
    [/দেড়\s*পোয়া|দেড়\s*পোয়া|দেড়\s*পোয়া|দেড়\s*পোয়া|1\.5\s*পোয়া/gi, '0.375 কেজি', 0.375, 'কেজি'],
    [/আড়াই\s*পোয়া|আড়াই\s*পোয়া|আড়াই\s*পোয়া|আড়াই\s*পোয়া|2\.5\s*পোয়া/gi, '0.625 কেজি', 0.625, 'কেজি'],
    [/তিন\s*পোয়া|তিন\s*পোয়া|৩\s*পোয়া|৩\s*পোয়া|3\s*পোয়া/gi, '0.75 কেজি', 0.75, 'কেজি'],
    [/এক\s*পোয়া|এক\s*পোয়া|১\s*পোয়া|১\s*পোয়া|1\s*পোয়া|পোয়া|পোয়া/gi, '0.25 কেজি', 0.25, 'কেজি'],
    [/দুই\s*পোয়া|দুই\s*পোয়া|২\s*পোয়া|২\s*পোয়া|2\s*পোয়া/gi, '0.5 কেজি', 0.5, 'কেজি']
  ];

  for (const [pattern, repl, qty, unit] of poyaMappings) {
    if (pattern.test(s)) {
      detectedConversions.push({ original: s.match(pattern)?.[0] || '', converted: repl, quantity: qty, unit });
      s = s.replace(pattern, repl);
    }
  }

  // 3. Hali / হালি (1 Hali = 4 pieces)
  const haliMappings: Array<[RegExp, string, number, string]> = [
    [/দেড়\s*হালি|দেড়\s*হালি|১\.৫\s*হালি|1\.5\s*হালি/gi, '6টি', 6, 'টি'],
    [/আড়াই\s*হালি|আড়াই\s*হালি|২\.৫\s*হালি|2\.5\s*হালি/gi, '10টি', 10, 'টি'],
    [/এক\s*হালি|১\s*হালি|1\s*হালি/gi, '4টি', 4, 'টি'],
    [/দুই\s*হালি|২\s*হালি|2\s*হালি/gi, '8টি', 8, 'টি'],
    [/তিন\s*হালি|৩\s*হালি|3\s*হালি/gi, '12টি', 12, 'টি'],
    [/চার\s*হালি|৪\s*হালি|4\s*হালি/gi, '16টি', 16, 'টি'],
    [/পাঁচ\s*হালি|৫\s*হালি|5\s*হালি/gi, '20টি', 20, 'টি']
  ];

  for (const [pattern, repl, qty, unit] of haliMappings) {
    if (pattern.test(s)) {
      detectedConversions.push({ original: s.match(pattern)?.[0] || '', converted: repl, quantity: qty, unit });
      s = s.replace(pattern, repl);
    }
  }

  // 4. Dozen / ডজন (1 Dozen = 12 pieces)
  const dozenMappings: Array<[RegExp, string, number, string]> = [
    [/হাফ\s*ডজন|আধা\s*ডজন|আধ\s*ডজন/gi, '6টি', 6, 'টি'],
    [/দেড়\s*ডজন|দেড়\s*ডজন|১\.৫\s*ডজন|1\.5\s*ডজন/gi, '18টি', 18, 'টি'],
    [/আড়াই\s*ডজন|আড়াই\s*ডজন|২\.৫\s*ডজন|2\.5\s*ডজন/gi, '30টি', 30, 'টি'],
    [/এক\s*ডজন|১\s*ডজন|1\s*ডজন/gi, '12টি', 12, 'টি'],
    [/দুই\s*ডজন|২\s*ডজন|2\s*ডজন/gi, '24টি', 24, 'টি'],
    [/তিন\s*ডজন|৩\s*ডজন|3\s*ডজন/gi, '36টি', 36, 'টি']
  ];

  for (const [pattern, repl, qty, unit] of dozenMappings) {
    if (pattern.test(s)) {
      detectedConversions.push({ original: s.match(pattern)?.[0] || '', converted: repl, quantity: qty, unit });
      s = s.replace(pattern, repl);
    }
  }

  // 5. Pata / Strip for Pharmacy (1 Pata = 10 tablets)
  const pataMappings: Array<[RegExp, string, number, string]> = [
    [/আধা\s*পাতা|আধ\s*পাতা|হাফ\s*পাতা/gi, '5টি', 5, 'টি'],
    [/দেড়\s*পাতা|দেড়\s*পাতা/gi, '15টি', 15, 'টি'],
    [/এক\s*পাতা|১\s*পাতা|1\s*পাতা/gi, '10টি', 10, 'টি'],
    [/দুই\s*পাতা|২\s*পাতা|2\s*পাতা/gi, '20টি', 20, 'টি'],
    [/তিন\s*পাতা|৩\s*পাতা|3\s*পাতা/gi, '30টি', 30, 'টি']
  ];

  for (const [pattern, repl, qty, unit] of pataMappings) {
    if (pattern.test(s)) {
      detectedConversions.push({ original: s.match(pattern)?.[0] || '', converted: repl, quantity: qty, unit });
      s = s.replace(pattern, repl);
    }
  }

  // 6. Mon / মণ (1 Mon ≈ 40 kg standard retail / 37.32 kg metric)
  const monMappings: Array<[RegExp, string, number, string]> = [
    [/আধা\s*মণ|আধ\s*মণ|হাফ\s*মণ/gi, '20 কেজি', 20, 'কেজি'],
    [/এক\s*মণ|১\s*মণ|1\s*মণ/gi, '40 কেজি', 40, 'কেজি'],
    [/দুই\s*মণ|২\s*মণ|2\s*মণ/gi, '80 কেজি', 80, 'কেজি']
  ];

  for (const [pattern, repl, qty, unit] of monMappings) {
    if (pattern.test(s)) {
      detectedConversions.push({ original: s.match(pattern)?.[0] || '', converted: repl, quantity: qty, unit });
      s = s.replace(pattern, repl);
    }
  }

  // 7. General Gram to Kg
  s = s.replace(/(\d+)\s*গ্রাম/gi, (match, g) => {
    const val = parseFloat(g) / 1000;
    return `${val} কেজি`;
  });

  return {
    normalizedText: s,
    detectedConversions
  };
}

/**
 * Calculates Levenshtein distance between two strings
 */
export function calculateLevenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.88;

  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(m, n);
  return maxLen === 0 ? 1 : 1 - (dp[m][n] / maxLen);
}

/**
 * Matches a spoken product mention against the shop's live database products
 * using a hybrid of Exact, Substring, Phonetic Canonical, and Levenshtein similarity.
 */
export function matchProductPhonetically(
  spokenCandidate: string,
  catalog: ProductCatalogItem[],
  threshold = 0.48
): { product: ProductCatalogItem | null; confidence: number; matchType: 'exact' | 'substring' | 'phonetic' | 'fuzzy' | null } {
  if (!spokenCandidate || !catalog || catalog.length === 0) {
    return { product: null, confidence: 0, matchType: null };
  }

  const cleanSpoken = spokenCandidate.toLowerCase().trim();
  const phoneticSpoken = canonicalizeBengaliPhonetic(cleanSpoken);

  let bestProduct: ProductCatalogItem | null = null;
  let highestScore = 0;
  let matchType: 'exact' | 'substring' | 'phonetic' | 'fuzzy' | null = null;

  for (const item of catalog) {
    const bnName = (item.bangla_name || '').toLowerCase().trim();
    const enName = (item.name || '').toLowerCase().trim();
    const genName = (item.generic_name || '').toLowerCase().trim();

    // 1. Exact match
    if (bnName === cleanSpoken || enName === cleanSpoken) {
      return { product: item, confidence: 1.0, matchType: 'exact' };
    }

    // 2. Substring match
    if (
      (bnName && (bnName.includes(cleanSpoken) || cleanSpoken.includes(bnName))) ||
      (enName && (enName.includes(cleanSpoken) || cleanSpoken.includes(enName))) ||
      (genName && (genName.includes(cleanSpoken) || cleanSpoken.includes(genName)))
    ) {
      if (highestScore < 0.92) {
        highestScore = 0.92;
        bestProduct = item;
        matchType = 'substring';
      }
    }

    // 3. Phonetic canonical match
    const phoneticBn = canonicalizeBengaliPhonetic(bnName);
    const phoneticEn = canonicalizeBengaliPhonetic(enName);

    if (
      (phoneticBn && (phoneticBn === phoneticSpoken || phoneticBn.includes(phoneticSpoken) || phoneticSpoken.includes(phoneticBn))) ||
      (phoneticEn && (phoneticEn === phoneticSpoken || phoneticEn.includes(phoneticSpoken) || phoneticSpoken.includes(phoneticEn)))
    ) {
      if (highestScore < 0.89) {
        highestScore = 0.89;
        bestProduct = item;
        matchType = 'phonetic';
      }
    }

    // 4. Fuzzy Levenshtein
    const scoreBn = bnName ? calculateLevenshteinSimilarity(cleanSpoken, bnName) : 0;
    const scorePhonetic = phoneticBn ? calculateLevenshteinSimilarity(phoneticSpoken, phoneticBn) : 0;
    const scoreEn = enName ? calculateLevenshteinSimilarity(cleanSpoken, enName) : 0;

    const currentMax = Math.max(scoreBn, scorePhonetic, scoreEn);
    if (currentMax > highestScore) {
      highestScore = currentMax;
      bestProduct = item;
      matchType = 'fuzzy';
    }
  }

  if (highestScore >= threshold && bestProduct) {
    return { product: bestProduct, confidence: highestScore, matchType };
  }

  return { product: null, confidence: highestScore, matchType: null };
}

/**
 * Matches customer names phonetically with honorific stripping (ভাই, কাকা, চাচা, আপা, ইত্যাদি)
 */
export function matchCustomerPhonetically(
  spokenName: string,
  customers: CustomerCatalogItem[],
  threshold = 0.50
): { customer: CustomerCatalogItem | null; confidence: number } {
  if (!spokenName || !customers || customers.length === 0) {
    return { customer: null, confidence: 0 };
  }

  const stripHonorifics = (s: string) => {
    return s
      .replace(/(ভাইয়ের|ভাইকে|ভাইরে|ভাই|কাকা|চাচা|মাস্টার|দাদা|আপা|সাহেব|বেগম|হাজী|চৌধুরী|শেখ|খন্দকার|মোল্লা)/gi, '')
      .replace(/(দেরকে|দেররে|দের|ের|য়ের|কে|রে|ে|ো|তে)$/gi, '')
      .trim();
  };

  const cleanSpoken = stripHonorifics(spokenName.toLowerCase());
  const phoneticSpoken = canonicalizeBengaliPhonetic(cleanSpoken);

  let bestCustomer: CustomerCatalogItem | null = null;
  let highestScore = 0;

  for (const c of customers) {
    const rawName = (c.name || '').toLowerCase().trim();
    const cleanCand = stripHonorifics(rawName);

    // Exact or direct match
    if (rawName === cleanSpoken || cleanCand === cleanSpoken) {
      return { customer: c, confidence: 1.0 };
    }

    if (rawName.includes(cleanSpoken) || cleanCand.includes(cleanSpoken) || cleanSpoken.includes(cleanCand)) {
      if (highestScore < 0.94) {
        highestScore = 0.94;
        bestCustomer = c;
      }
    }

    const phoneticCand = canonicalizeBengaliPhonetic(cleanCand);
    if (phoneticCand && (phoneticCand === phoneticSpoken || phoneticCand.includes(phoneticSpoken) || phoneticSpoken.includes(phoneticCand))) {
      if (highestScore < 0.90) {
        highestScore = 0.90;
        bestCustomer = c;
      }
    }

    const sim = Math.max(
      calculateLevenshteinSimilarity(cleanSpoken, cleanCand),
      calculateLevenshteinSimilarity(phoneticSpoken, phoneticCand)
    );

    if (sim > highestScore) {
      highestScore = sim;
      bestCustomer = c;
    }
  }

  if (highestScore >= threshold && bestCustomer) {
    return { customer: bestCustomer, confidence: highestScore };
  }

  return { customer: null, confidence: highestScore };
}
