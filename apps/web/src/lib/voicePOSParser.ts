/**
 * Bengali Voice OS Engine & Smart Multi-Industry Parser
 * Handles Voice POS, Voice Product Add, Voice Stock-In, and Auto-Cataloging
 * Supports Grocery, Pharmacy, Clothing, Electronics, Hardware, Tea stall, etc.
 */

export interface ParsedVoiceItem {
  id?: string;
  name: string;
  banglaName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  isExistingProduct: boolean;
  productId?: string;
  genericName?: string;
  size?: string;
  color?: string;
  brand?: string;
  stock?: number;
  isOutOfStock?: boolean;
}

export interface VoicePOSParseResult {
  type: 'add_items' | 'cash_checkout' | 'due_checkout' | 'discount' | 'remove_item' | 'clear_memo' | 'undo_last_item' | 'update_last_item' | 'noise_ignored';
  items?: ParsedVoiceItem[];
  customerName?: string;
  dueAmount?: number;
  discountAmount?: number;
  removeItemName?: string;
  updateQuantity?: number;
  updateUnit?: string;
  updatePrice?: number;
  rawSpeech: string;
  explanation: string;
}

export interface VoiceProductEntryResult {
  success: boolean;
  name: string;
  banglaName: string;
  categoryId: string;
  stock: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  genericName?: string;
  size?: string;
  color?: string;
  brand?: string;
  rawSpeech: string;
  explanation: string;
}

export interface VoiceStockInResult {
  success: boolean;
  product?: any;
  productName: string;
  quantityToAdd: number;
  unit: string;
  purchasePrice?: number;
  sellingPrice?: number;
  rawSpeech: string;
  explanation: string;
}

// Spoken Bengali numerals and words to standard digits
export function normalizeSpokenNumbers(text: string): string {
  let s = String(text || '').trim();

  // 0. English & Banglish Unit Aliases (supports 1kg, 2ltr, 1packet etc.)
  s = s.replace(/(?<=\d|\s|^)(?:kgs?|kilos?|কেজি|কেজির)\b/gi, ' কেজি ');
  s = s.replace(/(?<=\d|\s|^)(?:gms?|grams?|গ্রাম)\b/gi, ' গ্রাম ');
  s = s.replace(/(?<=\d|\s|^)(?:ltrs?|liters?|litres?|লিটার)\b/gi, ' লিটার ');
  s = s.replace(/(?<=\d|\s|^)(?:packets?|pkts?|প্যাকেট|প্যাক)\b/gi, ' প্যাকেট ');
  s = s.replace(/(?<=\d|\s|^)(?:pieces?|pcs?|pc|পিস)\b/gi, ' পিস ');
  s = s.replace(/(?<=\d|\s|^)(?:bottles?|বোতল)\b/gi, ' বোতল ');
  s = s.replace(/(?<=\d|\s|^)(?:boxes?|বক্স)\b/gi, ' বক্স ');
  s = s.replace(/(?<=\d|\s|^)(?:bags?|বস্তা)\b/gi, ' বস্তা ');
  s = s.replace(/(?<=\d|\s|^)(?:patas?|পাতা)\b/gi, ' পাতা ');
  s = s.replace(/(?<=\d|\s|^)(?:halis?|হালি)\b/gi, ' হালি ');
  s = s.replace(/(?<=\d|\s|^)(?:dozens?|ডজন)\b/gi, ' ডজন ');
  s = s.replace(/(?<=\d|\s|^)(?:tablets?|tabs?|ট্যাবলেট|ট্যাব)\b/gi, ' ট্যাবলেট ');
  s = s.replace(/(?<=\d|\s|^)(?:capsules?|caps?|ক্যাপসুল)\b/gi, ' ক্যাপসুল ');

  // Strip trailing '+' or 'প্লাস' (e.g. '৫০+' or '৫০ প্লাস')
  s = s.replace(/\s*[+]\s*$/g, '');
  s = s.replace(/\s*প্লাস\s*$/g, '');

  // Common Product Banglish Transliterations
  s = s.replace(/\b(?:chal|chaal)\b/gi, 'চাল');
  s = s.replace(/\b(?:dal|daal)\b/gi, 'ডাল');
  s = s.replace(/\b(?:tel|oill?)\b/gi, 'তেল');
  s = s.replace(/\b(?:chini|sugar)\b/gi, 'চিনি');
  s = s.replace(/\b(?:lobon|loban|nobon|salt)\b/gi, 'লবণ');
  s = s.replace(/\b(?:alu|aloo|potato)\b/gi, 'আলু');
  s = s.replace(/\b(?:peyaj|peaj|onion)\b/gi, 'পেঁয়াজ');
  s = s.replace(/\b(?:roshun|roson|garlic)\b/gi, 'রসুন');
  s = s.replace(/\b(?:ada|ginger)\b/gi, 'আদা');
  s = s.replace(/\b(?:dim|eggs?)\b/gi, 'ডিম');
  s = s.replace(/\b(?:shaban|saban|soaps?)\b/gi, 'সাবান');
  s = s.replace(/\b(?:dudh|dud|milk)\b/gi, 'দুধ');
  s = s.replace(/\b(?:pani|water)\b/gi, 'পানি');

  // 1. Spoken Hundreds / Thousands
  s = s.replace(/দেড়শো|দেড়শ|দেড়শো|দেড়শ/g, '150');
  s = s.replace(/আড়াইশো|আড়াইশ|আড়াইশো|আড়াইশ/g, '250');
  s = s.replace(/সাড়ে তিনশো|সাড়ে তিনশ|সাড়ে তিনশো/g, '350');
  s = s.replace(/সাড়ে চারশো|সাড়ে চারশ|সাড়ে চারশো/g, '450');
  s = s.replace(/একশত|একশো|একশ/g, '100');
  s = s.replace(/দুইশত|দুইশো|দুইশ/g, '200');
  s = s.replace(/তিনশত|তিনশো|তিনশ/g, '300');
  s = s.replace(/চারশত|চারশো|চারশ/g, '400');
  s = s.replace(/পাঁচশত|পাঁচশো|পাঁচশ/g, '500');
  s = s.replace(/ছয়শো|ছয়শ|ছয়শো|ছয়শ/g, '600');
  s = s.replace(/সাতশো|সাতশ/g, '700');
  s = s.replace(/আটশো|আটশ/g, '800');
  s = s.replace(/নয়শো|নয়শ|নয়শো|নয়শ/g, '900');
  s = s.replace(/দেড় হাজার|দেড় হাজার/g, '1500');
  s = s.replace(/আড়াই হাজার|আড়াই হাজার/g, '2500');
  s = s.replace(/এক হাজার/g, '1000');
  s = s.replace(/দুই হাজার/g, '2000');
  s = s.replace(/তিন হাজার/g, '3000');
  s = s.replace(/চার হাজার/g, '4000');
  s = s.replace(/পাঁচ হাজার/g, '5000');
  s = s.replace(/দশ হাজার/g, '10000');

  // 2. Fractional Weights & Measures
  s = s.replace(/দেড় কেজি|দেড় কেজি|দেড়কেজি|দেড়কেজি/g, '1.5 কেজি');
  s = s.replace(/আড়াই কেজি|আড়াই কেজি|আড়াইকেজি|আড়াইকেজি/g, '2.5 কেজি');
  s = s.replace(/সাড়ে তিন কেজি|সাড়ে তিন কেজি/g, '3.5 কেজি');
  s = s.replace(/সাড়ে চার কেজি|সাড়ে চার কেজি/g, '4.5 কেজি');
  s = s.replace(/আধা কেজি|আধ কেজি|হাফ কেজি|হাফকেজি/g, '0.5 কেজি');
  s = s.replace(/এক পোয়া|১ পোয়া|১ পোয়া|এক পোয়া|পোয়া|পোয়া/g, '0.25 কেজি');
  s = s.replace(/তিন পোয়া|৩ পোয়া|৩ পোয়া|তিন পোয়া/g, '0.75 কেজি');
  s = s.replace(/দেড় লিটার|দেড় লিটার/g, '1.5 লিটার');
  s = s.replace(/আড়াই লিটার|আড়াই লিটার/g, '2.5 লিটার');
  s = s.replace(/আধা লিটার|আধ লিটার|হাফ লিটার/g, '0.5 লিটার');
  s = s.replace(/দেড় পোয়া|দেড় পোয়া/g, '0.375 কেজি');
  s = s.replace(/(?:^|\s)(?:১০০|100)\s*গ্রাম(?=\s|$)/g, ' 0.1 কেজি ');
  s = s.replace(/(?:^|\s)(?:২০০|200)\s*গ্রাম(?=\s|$)/g, ' 0.2 কেজি ');
  s = s.replace(/(?:^|\s)(?:২৫০|250)\s*গ্রাম(?=\s|$)/g, ' 0.25 কেজি ');
  s = s.replace(/(?:^|\s)(?:৫০০|500)\s*গ্রাম(?=\s|$)/g, ' 0.5 কেজি ');
  s = s.replace(/(?:^|\s)(?:৭৫০|750)\s*গ্রাম(?=\s|$)/g, ' 0.75 কেজি ');

  // 3. Packaging / Counts
  s = s.replace(/এক হালি|১ হালি/g, '4 পিস');
  s = s.replace(/দুই হালি|২ হালি|দু হালি/g, '8 পিস');
  s = s.replace(/তিন হালি|৩ হালি/g, '12 পিস');
  s = s.replace(/এক ডজন|১ ডজন/g, '12 পিস');
  s = s.replace(/আধা ডজন|আধ ডজন|হাফ ডজন/g, '6 পিস');
  s = s.replace(/দেড় ডজন|দেড় ডজন/g, '18 পিস');
  s = s.replace(/দুই ডজন|২ ডজন|দু ডজন/g, '24 পিস');
  s = s.replace(/আধা বস্তা|হাফ বস্তা/g, '0.5 বস্তা');
  s = s.replace(/দেড় বস্তা|দেড় বস্তা/g, '1.5 বস্তা');
  s = s.replace(/আধা পাতা|হাফ পাতা/g, '0.5 পাতা');
  s = s.replace(/দেড় পাতা|দেড় পাতা/g, '1.5 পাতা');
  s = s.replace(/আধা প্যাকেট|হাফ প্যাকেট/g, '0.5 প্যাকেট');
  s = s.replace(/দেড় প্যাকেট|দেড় প্যাকেট/g, '1.5 প্যাকেট');
  s = s.replace(/এক জোড়া|১ জোড়া|১ জোड़ा/g, '2 পিস');
  s = s.replace(/দুই জোড়া|২ জোড়া|২ জোड़ा|দু জোড়া/g, '4 পিস');
  s = s.replace(/তিন জোড়া|৩ জোড়া|৩ জোড়া/g, '6 পিস');

  // 4. Word Numbers (using Unicode-safe boundaries)
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(একটি|একটা|একখানা|এক)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '1'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(দুটি|দুটো|দুইটা|দুইখানা|দুই|দু)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '2'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(তিনটি|তিনটে|তিনটা|তিনখানা|তিন)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '3'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(চারটি|চারটে|চারটা|চারখানা|চার)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '4'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(পাঁচটি|পাঁচটা|পাঁচখানা|পাঁচ)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '5'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(ছয়টি|ছয়টা|ছয়টি|ছয়টা|ছয়খানা|ছয়|ছয়)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '6'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(সাতটি|সাতটা|সাতখানা|সাত)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '7'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(আটটি|আটটা|আটখানা|আট)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '8'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(নয়টি|নয়টা|নয়টি|নয়টা|নয়খানা|নয়|নয়)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '9'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(দশটি|দশটা|দশখানা|দশ)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '10'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(এগারো|এগারটা|এগারটি)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '11'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(বারো|বারটা|বারটি)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '12'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(তেরো|তেরটা|তেরটি)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '13'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(চৌদ্দ|চৌদ্দটা|চৌদ্দটি)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '14'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(পনেরো|পনেরটা|পনেরটি|পনের)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '15'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(ষোল|ষোলটা|ষোলটি)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '16'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(সতেরো|সতেরটা|সতেরটি|সতের)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '17'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(আঠারো|আঠারটা|আঠারটি|আঠার)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '18'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(উনিশ|উনিশটা|উনিশটি)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '19'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(বিশটি|বিশটা|বিশ|কুড়ি|কুড়ি)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '20'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(ত্রিশটি|ত্রিশটা|ত্রিশ)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '30'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(চল্লিশটি|চল্লিশটা|চল্লিশ)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '40'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(পঞ্চাশটি|পঞ্চাশটা|পঞ্চাশ)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '50'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(ষাটটি|ষাটটা|ষাট)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '60'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(সত্তরটি|সত্তরটা|সত্তর)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '70'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(আশিটি|আশিটা|আশি)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '80'));
  s = s.replace(/(?:^|\s|[^\u0980-\u09FFa-zA-Z0-9])(নব্বইটি|নব্বইটা|নব্বই)(?=\s|$|[^\u0980-\u09FFa-zA-Z0-9])/g, (m, w) => m.replace(w, '90'));

  // Convert Bengali numerals to English digits
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  s = s.replace(/[০-৯]/g, d => bnToEn[d] || d);

  return s.replace(/\s+/g, ' ').trim();
}

// Clean colloquial filler words
export function cleanFillerWords(text: string): string {
  let s = String(text || '');
  s = s.replace(/(?:^|\s)(বললাম\s*যে|বললাম|বলসি|বলছি|লিখুন|লেখেন|লেখ|তোলো|তুলুন|উঠান|তুলে\s*নেন|যোগ\s*করুন|যোগ\s*করো|দাও|দেন|দিন\s*তো|দিন|নিন|নাও|রাখেন|রাখো|হবে|চাই|নেব|নেবো|একটু|প্লিজ|মেমোতে|খাতায়|তুলে|রেখে|হলো|হল|করে|প্লাস|যোগ)(?=\s|$)/gi, ' ');
  s = s.replace(/[+]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

// Common grocery catalog defaults for accurate rate inference
const COMMON_GROCERY_DEFAULTS: Record<string, { price: number; unit: string }> = {
  'চাল': { price: 65, unit: 'কেজি' },
  'মিনিকেট চাল': { price: 75, unit: 'কেজি' },
  'নাজিরশাইল চাল': { price: 82, unit: 'কেজি' },
  'ডাল': { price: 130, unit: 'কেজি' },
  'মসুর ডাল': { price: 140, unit: 'কেজি' },
  'মুগ ডাল': { price: 160, unit: 'কেজি' },
  'তেল': { price: 190, unit: 'লিটার' },
  'সয়াবিন তেল': { price: 190, unit: 'লিটার' },
  'সরিষার তেল': { price: 260, unit: 'লিটার' },
  'চিনি': { price: 140, unit: 'কেজি' },
  'লবণ': { price: 40, unit: 'প্যাকেট' },
  'লবন': { price: 40, unit: 'প্যাকেট' },
  'আটা': { price: 55, unit: 'কেজি' },
  'ময়দা': { price: 65, unit: 'কেজি' },
  'আলু': { price: 35, unit: 'কেজি' },
  'পেঁয়াজ': { price: 70, unit: 'কেজি' },
  'রসুন': { price: 220, unit: 'কেজি' },
  'আদা': { price: 240, unit: 'কেজি' },
  'ডিম': { price: 12, unit: 'পিস' },
  'সাবান': { price: 50, unit: 'পিস' },
  'লাক্স সাবান': { price: 60, unit: 'পিস' },
  'লাইফবয় সাবান': { price: 50, unit: 'পিস' },
  'শ্যাম্পু': { price: 120, unit: 'বোতল' },
  'টুথপেস্ট': { price: 95, unit: 'পিস' },
  'চা': { price: 10, unit: 'কাপ' },
  'দুধ চা': { price: 15, unit: 'কাপ' },
  'কফি': { price: 30, unit: 'কাপ' },
  'নাপা': { price: 15, unit: 'পাতা' },
  'নাপা এক্সট্রা': { price: 30, unit: 'পাতা' },
  'সেক্লো': { price: 70, unit: 'পাতা' }
};

// Background noise & TTS echo prevention
const NON_COMMERCIAL_PATTERNS = [
  /কেমন\s*আছেন|কেমন\s*আছো|ভালো\s*আছেন|ভালো\s*আছো|ভালো\s*থাকেন/,
  /বাইরে\s*অনেক\s*গরম|বৃষ্টি\s*আসবে|বৃষ্টি\s*হচ্ছে|রোদে\s*পুড়ে\s*গেলাম/,
  /ভাংতি\s*নাই|ভাঙতি\s*নাই|খুচরা\s*নাই|খুচরা\s*টাকা|ভাংতি\s*দেন|ভাঙতি\s*দেন/,
  /টেবিলের\s*উপর|কোথায়\s*রাখব|ওখানে\s*রাখো|নিচে\s*রাখুন/,
  /কখন\s*আসলেন|দেরি\s*হলো|যান\s*গা|চলে\s*যান|পরে\s*আসেন/,
  /হ্যালো\s*হ্যালো|শোনা\s*যায়|মাইক\s*টেস্টিং|চেক\s*চেক|শুনতে\s*পাচ্ছেন/,
  /এই\s*শুনুন|এই\s*যে|এই\s*ভাই|ভাই\s*শুনেন|ভাই\s*শুনুন|কিরে|আরে\s*ভাই|দোকানদার\s*ভাই|শুনছেন|আচ্ছা\s*শুনেন|মামা\s*শোনেন|মামা\s*শুনছেন|কাকা\s*শুনেন/,
  /কোথায়\s*গেলা|কোথায়\s*আছো|পরে\s*কথা\s*বলি|ফোন\s*ধরো|মোবাইলে\s*কথা|রিং\s*হচ্ছে/,
  /দাম\s*বেশি|কম\s*রাখেন|কম\s*রাখা\s*যায়\s*না|একদাম|এক\s*টাকাও\s*কম\s*হবে\s*না/,
  /চা\s*খাবেন|চা\s*খাব|পানি\s*খাব|পানি\s*খান|বসেন\s*একটু|একটু\s*দাঁড়ান|দাঁড়ান\s*ভাই/,
  /গাড়ি\s*আসতেছে|রিকশা\s*ডাকো|রাস্তায়\s*যানজট|যানজট\s*লেগে\s*আছে/,
  /যোগ\s*হয়েছে|যোগ\s*করা\s*হয়েছে|বাদ\s*দেওয়া\s*হয়েছে|ছাড়\s*দেওয়া\s*হয়েছে|ক্লিয়ার\s*হয়েছে|ক্যালকুলেটর\s*চালু|স্বাগতম|চালু\s*হয়েছে|মোট\s*\d+\s*টাকা/
];

export function isBackgroundNoise(text: string): boolean {
  const clean = text.trim();
  if (!clean || clean.length < 2) return true;

  // Single filler words or conversational noise without numbers/units are noise
  if (/^(হ্যাঁ|হাঁ|না|আচ্ছা|ওকে|থ্যাংক\s*ইউ|ধন্যবাদ|হ্যালো|শুনো|দেখি|দাঁড়াও|দাঁড়ান|একটু|হুম|হুঁ|আচ্ছা\s*ভাই|ঠিক\s*আছে|বাই\s*বাই)$/i.test(clean)) {
    return true;
  }

  // Detect TTS echo (system announcing its own messages)
  if (/যোগ\s*হয়েছে|টাকা\s*যোগ|বাদ\s*দেওয়া\s*হয়েছে|ছাড়\s*দেওয়া\s*হয়েছে|ক্লিয়ার\s*হয়েছে|পণ্যটির\s*স্টক\s*শেষ|দোকানে\s*স্টকে\s*নেই/.test(clean)) {
    return true;
  }

  for (const pattern of NON_COMMERCIAL_PATTERNS) {
    if (pattern.test(clean)) {
      // Only permit if it has a strict commercial number + unit / rate
      if (!/\d+\s*(টাকা|tk|টাকার|কেজি|লিটার|পিস|পাতা|জোড়া|হালি|বক্স|বস্তা|প্যাকেট)|\b\d+\s+\d+\b/.test(clean)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Intelligent Category Detector based on product name keywords
 */
export function detectProductCategory(name: string): { categoryId: string; defaultUnit: string } {
  const s = name.toLowerCase().trim();

  // 1. Medicine / Pharmacy
  if (/নাপা|এইস|সেক্লো|ম্যাক্সপ্রো|এলাট্রল|ফেক্সো|মোনাস|গ্যাভিসকন|প্যারাসিটামল|ওমিপ্রাজল|এন্টাসিড|স্যাভলন|তুসকা|সিরাপ|স্যালাইন|ট্যাবলেট|ক্যাপসুল|ভিটামিন|ব্যান্ডেজ|ডেক্সট্রোজ|ইনসুলিন|পভিসেপ|ড্রপ|মলম|ওষুধ|ঔষধ|ইনজেকশন/.test(s)) {
    return { categoryId: 'cat-pharmacy', defaultUnit: /সিরাপ|লিকুইড|ড্রপ/.test(s) ? 'বোতল' : 'পাতা' };
  }

  // 2. Clothing / Fashion
  if (/শার্ট|প্যান্ট|জিন্স|টি-শার্ট|পোলো|পাঞ্জাবি|পায়জামা|থ্রি-পিস|শাড়ি|লুঙ্গি|গামছা|বোরকা|হিজাব|জ্যাকেট|সোয়েটার|ট্রাউজার|টুপি|বেল্ট|মোজা|ওড়না|কামিজ|গেঞ্জি|ব্লেজার/.test(s)) {
    return { categoryId: 'cat-clothing', defaultUnit: 'পিস' };
  }

  // 3. Electronics & Electrical / Hardware
  if (/লাইট|বাল্ব|এলইডি|টিউবলাইট|ফ্যান|সুইচ|সকেট|প্লাগ|মাল্টিপ্লাগ|তার|ক্যাবল|ব্যাটারি|চার্জার|সার্কিট|ব্রেকার|হোল্ডার|টেপ|কয়েল|পাইপ|রড|সিমেন্ট|রং|স্ক্রু|তালা|মোটর|ড্রিল/.test(s)) {
    return { categoryId: 'cat-hardware', defaultUnit: /তার|ক্যাবল|পাইপ/.test(s) ? 'গজ' : 'পিস' };
  }

  // 4. Tea Stall / Restaurant (Strict word matching, excluding চাল)
  if (/(?:^|\s)(?:দুধ\s*চা|রং\s*চা|লাল\s*চা|কফি|পরোটা|ডিম\s*ভাজি|সিঙ্গারা|সমুচা|পুরি|খিচুড়ি|বিরিয়ানি|ভাত|চিকেন|চা)(?:\s|$)/.test(s) && !/চাল|চামচ|চাদর|চানাচুর/.test(s)) {
    return { categoryId: 'cat-restaurant', defaultUnit: /চা|কফি/.test(s) ? 'কাপ' : 'প্লেট' };
  }

  // 5. Cosmetics & Personal Care (লিপস্টিক, ক্রিম, লোশন, ফেসওয়াশ, নেইলপলিশ, পারফিউম)
  if (/লিপস্টিক|লিপবাম|নেইলপলিশ|কাজল|আইলাইনার|মাশকারা|ব্লাশ|ফাউন্ডেশন|কনসিলার|মেকআপ|ফেসওয়াশ|ফেসপ্যাক|স্ক্রাব|সিরাম|লোশন|বডি\s*লোশন|ক্রিম|ময়েশ্চারাইজার|ভ্যাসলিন|পেট্রোলিয়াম|পারফিউম|বডি\s*স্প্রে|ডিওডোরেন্ট|আতর|পাউডার|ট্যাল্ক|মেহেদি|হেয়ার\s*কালার|হেয়ার\s*কালার|কসমেটিক|লিপলাইনার/.test(s)) {
    if (/ফেসওয়াশ|স্ক্রাব|মেহেদি/.test(s)) {
      return { categoryId: 'cat-cosmetics', defaultUnit: 'টিউব' };
    }
    if (/লোশন|বডি\s*স্প্রে|পারফিউম|আতর/.test(s)) {
      return { categoryId: 'cat-cosmetics', defaultUnit: 'বোতল' };
    }
    if (/ক্রিম|পন্ডস|ভ্যাসলিন|প্যাক|জার/.test(s)) {
      return { categoryId: 'cat-cosmetics', defaultUnit: 'জার' };
    }
    return { categoryId: 'cat-cosmetics', defaultUnit: 'পিস' };
  }

  // 6. Default Grocery / General Store (Explicitly check common staples)
  if (/তেল|সয়াবিন|সরিষার\s*তেল|পানি|দুধ|ঘি|জুস|কোক|স্প্রাইট|ফান্টা/.test(s)) {
    return { categoryId: 'cat-grocery', defaultUnit: 'লিটার' };
  }

  if (/ডিম|কলা/.test(s)) {
    return { categoryId: 'cat-grocery', defaultUnit: 'হালি' };
  }

  if (/লবণ|লবন|নুডলস|চিপস|বিস্কুট|কেক|চানাচুর|ম্যাচ|কয়েল|ডিটারজেন্ট|সাবান|শ্যাম্পু|টুথপেস্ট/.test(s)) {
    return { categoryId: 'cat-grocery', defaultUnit: 'প্যাকেট' };
  }

  if (/চাল|ডাল|মসুর|মুগ|চিনি|আটা|ময়দা|সুজি|আলু|পেঁয়াজ|রসুন|আদা|হলুদ|মরিচ|জিরা|ধনিয়া|ছোলা|মুড়ি|চিঁড়া|গুড়|লবণ/.test(s)) {
    return { categoryId: 'cat-grocery', defaultUnit: 'কেজি' };
  }

  return { categoryId: 'cat-grocery', defaultUnit: 'পিস' };
}

/**
 * Splits continuous multi-item spoken stream into individual item chunks
 */
export function splitMultiItemSpokenText(text: string, existingProducts: any[] = []): string[] {
  let s = normalizeSpokenNumbers(text);

  // 1. Split on punctuation, connectives or comma
  const coarseSegments = s.split(/[\n,;।|+]|\s+(?:আর|এবং|তারপর|সাথে|ও|প্লাস)\s+/).map(x => x.trim()).filter(Boolean);

  const finalSegments: string[] = [];

  // Known staple product starter keywords
  const stapleNames = [
    'চাল', 'ডাল', 'তেল', 'চিনি', 'লবণ', 'লবন', 'আটা', 'ময়দা', 'সুজি', 'আলু', 'পেঁয়াজ', 'রসুন', 'আদা',
    'হলুদ', 'মরিচ', 'জিরা', 'ধনিয়া', 'ছোলা', 'মুড়ি', 'চিঁড়া', 'গুড়', 'ডিম', 'সাবান', 'লাক্স',
    'লাইফবয়', 'শ্যাম্পু', 'টুথপেস্ট', 'নাপা', 'এইস', 'সেক্লো', 'ম্যাক্সপ্রো', 'শার্ট', 'প্যান্ট',
    'জিন্স', 'টি-শার্ট', 'লাইট', 'বাল্ব', 'চা', 'দুধ', 'পানি', 'জুস', 'কফি', 'বিস্কুট', 'কেক',
    'মিনিকেট', 'নাজিরশাইল', 'সয়াবিন', 'সরিষার'
  ];

  existingProducts.forEach(p => {
    const bName = (p.banglaName || p.name || '').trim();
    if (bName && !stapleNames.includes(bName)) {
      stapleNames.push(bName);
    }
  });

  const staplePattern = stapleNames
    .sort((a, b) => b.length - a.length)
    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  for (const coarse of coarseSegments) {
    let tagged = coarse;

    // Pattern 1: Product1 + (Qty1 or Price1) -> followed by Product2
    // e.g. "চাল 1 কেজি ডাল 2 কেজি" -> split before "ডাল"
    // e.g. "চাল 60 ডাল 200 তেল 190" -> split before "ডাল", before "তেল"
    const prodFirstRegex = new RegExp(`((?:${staplePattern})[^\\d]+(?:\\d+(?:\\.\\d+)?\\s*(?:কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|বস্তা|জোড়া|জোড়া|হালি|বোতল|কাপ|প্লেট|বক্স|টি|টা|টাকা)?\\s*(?:\\d+(?:\\.\\d+)?)?))\\s+(?=(?:${staplePattern}))`, 'gi');
    tagged = tagged.replace(prodFirstRegex, '$1|||');

    // Pattern 2: Qty1 + Product1 -> followed by Qty2 + Product2
    // e.g. "2টা লাক্স সাবান 3টা লাইফবয়" -> split before "3টা"
    // e.g. "1 প্যাকেট লবণ 2 কেজি চিনি" -> split before "2 কেজি"
    const qtyFirstRegex = new RegExp(`((?:${staplePattern})(?:\\s*\\d+\\s*(?:টাকা|টাকার|tk))?)\\s+(?=\\d+(?:\\.\\d+)?\\s*(?:কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|বস্তা|জোড়া|জোড়া|হালি|বোতল|কাপ|প্লেট|বক্স|টি|টা)\\s+(?:${staplePattern}))`, 'gi');
    tagged = tagged.replace(qtyFirstRegex, '$1|||');

    // Pattern 3: Price followed by known product
    const priceFollowedByProductRegex = new RegExp(`(\\b\\d{2,5}\\b\\s*(?:টাকা|টাকার|tk)?)\\s+(?=(?:${staplePattern}))`, 'gi');
    tagged = tagged.replace(priceFollowedByProductRegex, '$1|||');

    const splitPieces = tagged.split('|||').map(p => p.trim()).filter(Boolean);
    finalSegments.push(...splitPieces);
  }

  return finalSegments;
}

/**
 * Main Voice POS Parser
 */
export function parseVoicePOSCommand(
  rawInput: string,
  existingProducts: any[] = []
): VoicePOSParseResult {
  const cleanRaw = rawInput.trim();
  if (!cleanRaw) {
    return { type: 'noise_ignored', rawSpeech: cleanRaw, explanation: 'শব্দ পাওয়া যায়নি' };
  }

  if (isBackgroundNoise(cleanRaw)) {
    return {
      type: 'noise_ignored',
      rawSpeech: cleanRaw,
      explanation: 'দোকানের সাধারণ কথাবলার নয়েজ ফিল্টার করা হয়েছে'
    };
  }

  const normalized = normalizeSpokenNumbers(cleanRaw.toLowerCase());

  // A. Cash Checkout
  if (/ক্যাশ\s*বিক্রি|নগদ\s*বিক্রি|বিল\s*করো|বিল\s*ফাইনাল|টাকা\s*পেয়েছি|ক্যাশ\s*পেমেন্ট|নগদ\s*আদায়|ক্যাশে\s*দাও|নগদে\s*বিক্রি|ক্যাশ\s*করো/.test(cleanRaw)) {
    return {
      type: 'cash_checkout',
      rawSpeech: cleanRaw,
      explanation: 'নগদ ক্যাশ বিক্রয় সম্পন্ন করার কমান্ড'
    };
  }

  // B. Due / Khata Checkout
  const dueWithAmtMatch = normalized.match(/(?:(.+?)(?:\s*ভাইয়ের|\s*চাচার|\s*কাকুর|\s*এর)?\s*)?(?:বাকি\s*খাতায়|বাকিতে)\s*(?:লেখো\s*)?(\d+)\s*(?:টাকা)?/i);
  if (dueWithAmtMatch && !/বাকি\s*কত|মোট\s*বাকি/.test(cleanRaw)) {
    const custRaw = dueWithAmtMatch[1] || '';
    const custName = custRaw.replace(/খাতায়|এর|ভাইয়ের|চাচার|কাকুর|বাকি|বিক্রি/g, '').trim();
    const dueAmt = Number(dueWithAmtMatch[2]);
    return {
      type: 'due_checkout',
      customerName: custName || undefined,
      dueAmount: dueAmt > 0 ? dueAmt : undefined,
      rawSpeech: cleanRaw,
      explanation: `${custName ? `"${custName}" এর ` : ''}বাকি খাতায়${dueAmt ? ` ৳${dueAmt} টাকা` : ''} যোগ করার কমান্ড`
    };
  }

  const dueMatch = cleanRaw.match(/(.+?)(?:\s*ভাইয়ের|\s*চাচার|\s*কাকুর|\s*এর)?\s*(?:খাতায়)?\s*বাকি(?:\s*লেখো|\s*নিল|\s*দাও|\s*বিক্রি)?/);
  if (dueMatch && !/বাকি\s*কত|মোট\s*বাকি/.test(cleanRaw)) {
    const custName = dueMatch[1].replace(/খাতায়|এর|ভাইয়ের|চাচার|কাকুর|বাকি|বিক্রি/g, '').trim();
    return {
      type: 'due_checkout',
      customerName: custName || 'বাকি গ্রাহক',
      rawSpeech: cleanRaw,
      explanation: `"${custName || 'গ্রাহক'}" এর বাকি খাতায় হিসাব যোগ করার কমান্ড`
    };
  }

  // C. Discount
  const discountMatch = normalized.match(/(\d+)\s*(?:টাকা|টাকার)?\s*(?:ছাড়|ডিসকাউন্ট|লেস)/i);
  if (discountMatch) {
    const disc = Number(discountMatch[1]);
    return {
      type: 'discount',
      discountAmount: disc,
      rawSpeech: cleanRaw,
      explanation: `৳${disc} ছাড় (ডিসকাউন্ট) প্রয়োগের কমান্ড`
    };
  }

  // D1. Quick Undo / Remove Last Item ("আগেরটা কাটো", "ভুল হইছে", "লাস্টেরটা বাদ", "কেটে দাও")
  if (
    /^(শেষেরটা|লাস্টেরটা|আগেরটা|লাস্ট\s*আইটেম|শেষের\s*আইটেম|ভুল\s*হইছে|ভুল\s*হয়েছে|এটা\s*ভুল)\s*(কাটো|বাদ\s*দাও|বাদ|মুছে\s*ফেলো|মুছো|ডিলিট\s*করো|কেটে\s*দাও|বাতিল\s*করো)?$/i.test(cleanRaw) ||
    /(শেষেরটা|লাস্টেরটা|আগেরটা|লাস্ট\s*আইটেম|ভুল\s*হইছে|ভুল\s*হয়েছে)\s*(কাটো|বাদ\s*দাও|বাদ|মুছে\s*ফেলো|মুছো|ডিলিট|কেটে\s*দাও)/i.test(cleanRaw)
  ) {
    return {
      type: 'undo_last_item',
      removeItemName: '__last__',
      rawSpeech: cleanRaw,
      explanation: 'সর্বশেষ যুক্ত করা আইটেমটি মেমো থেকে মুছে ফেলার (Undo) কমান্ড'
    };
  }

  // D2. Modify Last Item Quantity ("না না ২ কেজি করো", "না না ৩টা", "পরিমাণ ৩টা করো", "না ১ কেজি")
  // Note: Must require start of string (^|\s) and avoid matching product names ending in 'না' (e.g. সাবুদানা, ছানা)
  const updateQtyMatch = normalized.match(/^(?:না\s*না\s+|পরিমাণ\s+|না\s+)(\d+(?:\.\d+)?)\s*(কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|বস্তা|হালি|টি|টা)?(?:\s*করো|\s*দাও|\s*রাখো)?$/i);
  if (updateQtyMatch && !/বাকি|ক্যাশ|ছাড়/.test(cleanRaw)) {
    const newQty = Number(updateQtyMatch[1]);
    const newUnit = updateQtyMatch[2];
    if (newQty > 0) {
      return {
        type: 'update_last_item',
        updateQuantity: newQty,
        updateUnit: newUnit,
        rawSpeech: cleanRaw,
        explanation: `সর্বশেষ পণ্যের পরিমাণ পরিবর্তন করে ${newQty} ${newUnit || ''} করার কমান্ড`
      };
    }
  }

  // D3. Remove Named Item ("তেল বাদ দাও", "আলু কাটো", "নাপা ডিলিট করো")
  const removeMatch = cleanRaw.match(/(.+?)\s*(?:বাদ\s*দাও|বাদ|মুছে\s*ফেলো|মুছো|ডিলিট\s*করো|ডিলিট|কেটে\s*দাও|কাটো|বাতিল\s*করো|বাতিল)/);
  if (removeMatch && !/বাকি|ক্যাশ|ছাড়/.test(cleanRaw)) {
    const itemToRem = removeMatch[1].trim();
    if (itemToRem && itemToRem !== 'সব' && itemToRem !== 'মেমো' && itemToRem !== 'বিল') {
      return {
        type: 'remove_item',
        removeItemName: itemToRem,
        rawSpeech: cleanRaw,
        explanation: `"${itemToRem}" পণ্যটি মেমো থেকে মুছে ফেলার কমান্ড`
      };
    }
  }

  // E. Clear Memo
  if (/নতুন\s*মেমো|সব\s*ক্লিয়ার|ক্লিয়ার\s*করো|ক্লিয়ার|রিসেট\s*করো|মেমো\s*মুছো|সব\s*মুছো|সব\s*কাটো|মেমো\s*ক্লিয়ার|বিল\s*ক্লিয়ার|মেমো\s*রিসেট/.test(cleanRaw)) {
    return {
      type: 'clear_memo',
      rawSpeech: cleanRaw,
      explanation: 'মেমোর সকল পণ্য মুছে নতুন মেমো খোলার কমান্ড'
    };
  }

  // Multi-item stream splitter
  const segments = splitMultiItemSpokenText(cleanRaw, existingProducts);
  const parsedItems: ParsedVoiceItem[] = [];

  for (const seg of segments) {
    const item = parseSingleVoiceItem(seg, existingProducts);
    if (item) {
      parsedItems.push(item);
    }
  }

  if (parsedItems.length > 0) {
    return {
      type: 'add_items',
      items: parsedItems,
      rawSpeech: cleanRaw,
      explanation: `${parsedItems.length}টি পণ্য মেমোতে যোগ করা হয়েছে`
    };
  }

  return {
    type: 'noise_ignored',
    rawSpeech: cleanRaw,
    explanation: 'বাণিজ্যিক পণ্যের তথ্য পাওয়া যায়নি'
  };
}

/**
 * Fast Levenshtein distance for Bengali script to handle spelling and dialect variances
 */
export function bengaliLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Rich Bengali Product Synonyms & Colloquial Aliases
 */
export const BENGALI_PRODUCT_SYNONYMS: Record<string, string[]> = {
  'সয়াবিন তেল': ['সয়াবিন', 'তীর তেল', 'রূপচাঁদা', 'রান্নার তেল', 'ফ্রেশ তেল', 'খোলা তেল', 'তেল', 'সোয়াবিন'],
  'সরিষার তেল': ['সরিষা', 'সরিষার', 'ঘানি ভাঙা তেল', 'রাঁধুনী সরিষা'],
  'চিনি': ['সাদা চিনি', 'লাল চিনি', 'চিনু', 'সুগার'],
  'লবণ': ['লবন', 'আয়োডিন লবণ', 'মোটা লবণ', 'চিকন লবণ', 'সল্ট'],
  'চাল': ['মিনিকেট', 'নাজিরশাইল', 'আটাশ', 'বালাম', 'পাইজাম', 'মোটা চাল', 'পোলাও চাল', 'বাসমতী', 'চাউল'],
  'মসুর ডাল': ['মসুর', 'ডাল', 'মুসুর', 'লাল ডাল', 'চিকন ডাল'],
  'মুগ ডাল': ['মুগ', 'মুগডাল'],
  'ছোলা': ['বুট', 'ছোলার ডাল', 'ছোলা বুট'],
  'আটা': ['ফ্রেশ আটা', 'প্যাকেট আটা', 'খোলা আটা', 'তীর আটা'],
  'ময়দা': ['ময়দা', 'ফ্রেশ ময়দা', 'সাদা ময়দা', 'তীর ময়দা'],
  'আলু': ['গোল আলু', 'নতুন আলু', 'লাল আলু', 'বগুড়ার আলু'],
  'পেঁয়াজ': ['পিয়াজ', 'দেশি পেঁয়াজ', 'ভারতীয় পেঁয়াজ', 'পেয়াজ'],
  'রসুন': ['দেশি রসুন', 'চায়না রসুন', 'রশুন'],
  'আদা': ['দেশি আদা', 'চায়না আদা'],
  'ডিম': ['মুরগির ডিম', 'হাঁসের ডিম', 'ফার্মের ডিম', 'লাল ডিম', 'সাদা ডিম'],
  'চা': ['দুধ চা', 'রং চা', 'লাল চা', 'পাতা চা', 'ইস্পাহানি চা', 'তাঁজা চা'],
  'সাবান': ['লাক্স', 'লাইফবয়', 'তিব্বত', 'ডোভ', 'ডেটোল', 'হুইল সাবান'],
  'ডিটারজেন্ট': ['হুইল পাউডার', 'সার্ফ এক্সেল', 'রিন পাউডার', 'তিব্বত পাউডার'],
  'নাপা': ['প্যারাসিটামল', 'এইস', 'ফাস্ট', 'নাপা এক্সটেন্ড', 'নাপা এক্সট্রা'],
  'সেক্লো': ['ওমিপ্রাজল', 'সেকলো', 'ম্যাক্সপ্রো', 'প্যানটনিক', 'ফিনিক্স', 'গ্যাসের ওষুধ'],
  'ওরস্যালাইন': ['স্যালাইন', 'খাবারের স্যালাইন', 'এসএমসি স্যালাইন', 'টেস্টি স্যালাইন']
};

/**
 * Smart Catalog Scoring for Bengali Voice POS
 * Accurately scores catalog items against spoken names and units
 */
export function scoreCatalogCandidate(prod: any, queryName: string, requestedUnit?: string): number {
  const bName = (prod.banglaName || prod.name || '').toLowerCase().trim();
  const pName = (prod.name || '').toLowerCase().trim();
  const gName = (prod.genericName || '').toLowerCase().trim();
  const brand = (prod.brand || '').toLowerCase().trim();
  const qName = queryName.toLowerCase().trim();

  // Exact Match
  if (bName === qName || pName === qName) return 10000;

  let nameMatchScore = 0;

  // 1. Synonym & Colloquial Alias Mapping Match (+450 bonus)
  for (const [canonical, syns] of Object.entries(BENGALI_PRODUCT_SYNONYMS)) {
    const isProdInSyn = bName.includes(canonical) || canonical.includes(bName) || syns.some(s => bName.includes(s));
    const isQueryInSyn = qName.includes(canonical) || canonical.includes(qName) || syns.some(s => qName.includes(s));
    if (isProdInSyn && isQueryInSyn) {
      nameMatchScore += 450;
      break;
    }
  }

  // 2. Phonetic Levenshtein Distance for dialect/speech recognition quirks
  if (Math.abs(bName.length - qName.length) <= 2) {
    const dist = bengaliLevenshteinDistance(bName, qName);
    if (dist <= 1 && qName.length >= 3) {
      nameMatchScore += 350;
    } else if (dist <= 2 && qName.length >= 5) {
      nameMatchScore += 200;
    }
  }

  // Word token overlap
  const pWords = (bName + ' ' + pName + ' ' + gName)
    .split(/\s+/)
    .map(w => w.replace(/[^\u0980-\u09FFa-zA-Z0-9]/g, ''))
    .filter(Boolean);
  const qWords = qName
    .split(/\s+/)
    .map(w => w.replace(/[^\u0980-\u09FFa-zA-Z0-9]/g, ''))
    .filter(Boolean);

  for (const qw of qWords) {
    if (qw.length < 2) continue;
    if (pWords.includes(qw)) {
      nameMatchScore += 300;
    } else if (pWords.some(pw => pw.includes(qw) || qw.includes(pw))) {
      nameMatchScore += 120;
    }
  }

  // Substring inclusion
  if (bName.includes(qName) && qName.length >= 2) {
    nameMatchScore += 200;
    const ratio = qName.length / Math.max(bName.length, 1);
    nameMatchScore += Math.round(ratio * 100);
  } else if (qName.includes(bName) && bName.length >= 2) {
    nameMatchScore += 150;
  }

  if (brand && (brand.includes(qName) || qName.includes(brand))) {
    nameMatchScore += 100;
  }

  // If there is ZERO similarity in product name, this candidate is NOT a match!
  if (nameMatchScore === 0) {
    return 0;
  }

  let score = nameMatchScore;

  // In-stock availability preference
  if (Number(prod.stock || 0) > 0) score += 150;

  // Unit compatibility
  if (requestedUnit && prod.unit) {
    if (prod.unit.toLowerCase() === requestedUnit.toLowerCase()) {
      score += 150;
    } else if (requestedUnit === 'কেজি' && prod.unit === 'বস্তা') {
      score += 40;
    }
  }

  return score;
}

/**
 * Parses a single item phrase with exact unit and multiplier calculation
 */
function parseSingleVoiceItem(
  segment: string,
  existingProducts: any[] = []
): ParsedVoiceItem | null {
  // Step 1: Normalize numbers & Banglish units
  let normSeg = normalizeSpokenNumbers(segment.toLowerCase());

  // Step 2: Clean colloquial filler words
  normSeg = cleanFillerWords(normSeg);

  // 1. Check for explicit rate indicators (e.g. "৩০ টাকা করে", "৫০ টাকা কেজি", "দর ৬০")
  const isExplicitRate = /(?:দর|রেট|করে|প্রতি)\s*\d+|\d+\s*টাকা\s*(?:কেজি|লিটার|পাতা|পিস|প্যাকেট|করে|দর|রেট)/i.test(normSeg);

  // 2. Check for Taka/Price
  let extractedPrice: number | null = null;
  let isTakaForWeight = false;

  const takaMatch = normSeg.match(/(\d+(?:\.\d+)?)\s*(?:টাকা|টাকার|tk|taka)/i);
  if (takaMatch) {
    extractedPrice = parseFloat(takaMatch[1]);
    if (/টাকার/.test(segment)) {
      isTakaForWeight = true;
    }
  }

  // 3. Extract Quantity & Unit
  let quantity: number = 1;
  let unit: string = 'পিস';
  let unitMatched = false;

  const qtyUnitMatch = normSeg.match(/(\d+(?:\.\d+)?)\s*(কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|প্যাক|বস্তা|জোড়া|জোড়া|হালি|বোতল|ফুট|গজ|কাপ|প্লেট|কয়েল|বক্স|টি|টা|ট্যাবলেট|ক্যাপসুল)/);
  if (qtyUnitMatch) {
    quantity = parseFloat(qtyUnitMatch[1]);
    unit = qtyUnitMatch[2];
    unitMatched = true;

    if (unit === 'টি' || unit === 'টা') unit = 'পিস';
    if (unit === 'জোড়া') unit = 'জোড়া';
    if (unit === 'গ্রাম') {
      quantity = Math.round((quantity / 1000) * 1000) / 1000;
      unit = 'কেজি';
    }
  } else {
    // If unit is mentioned without explicit number (e.g. "লবণ প্যাকেট" or "চাল কেজি")
    const standaloneUnitMatch = normSeg.match(/(?:^|\s)(কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|প্যাক|বস্তা|জোড়া|হালি|বোতল|কাপ|প্লেট|বক্স|ট্যাবলেট|ক্যাপসুল)(?=\s|$)/);
    if (standaloneUnitMatch) {
      unit = standaloneUnitMatch[1];
      quantity = 1;
      unitMatched = true;
    }
  }

  // 4. Clean product name
  let cleanedName = normSeg
    .replace(/\d+(?:\.\d+)?\s*(?:টাকা|টাকার|tk|taka)/gi, '')
    .replace(/(\d+(?:\.\d+)?)\s*(?:কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|প্যাক|বস্তা|জোড়া|জোড়া|হালি|বোতল|ফুট|গজ|কাপ|প্লেট|কয়েল|বক্স|টি|টা|ট্যাবলেট|ক্যাপসুল)/gi, '')
    .replace(/(?:টাকা|টাকার|tk|taka|কেজি|লিটার|পিস|পাতা|প্যাকেট|প্যাক|বস্তা|জোড়া|জোড়া|হালি|বোতল|ফুট|গজ|কাপ|প্লেট|কয়েল|বক্স|টি|টা|ট্যাবলেট|ক্যাপসুল|যোগ\s*করো|দাও|নাও|মেমোতে|দর|রেট|করে|বললাম|বলসি|হলো|হল|বিক্রি\s*হলো|বিক্রি\s*করলাম|বিক্রি\s*করো|বিক্রি|বেচা\s*হলো|বেচা|সেল|মেমো\s*করো|মেমো\s*কাটো|মেমো|বিল\s*করো|বিল|প্লাস|যোগ)/gi, '')
    .trim();

  // If trailing numbers remain as price e.g. "চাল ১ কেজি ৬০"
  if (extractedPrice === null) {
    const trailingNumMatch = cleanedName.match(/\b(\d+(?:\.\d+)?)\b$/);
    if (trailingNumMatch) {
      const pVal = parseFloat(trailingNumMatch[1]);
      // If trailing number is > 5, it's a price (e.g. ৬০, ২০০, ৫০). If 1 or 2, and quantity wasn't set, it's quantity.
      if (pVal >= 5) {
        extractedPrice = pVal;
        cleanedName = cleanedName.replace(/\b\d+(?:\.\d+)?\b$/, '').trim();
      } else if (!unitMatched) {
        quantity = pVal;
        cleanedName = cleanedName.replace(/\b\d+(?:\.\d+)?\b$/, '').trim();
      }
    }
  }

  cleanedName = cleanedName.replace(/^[০-৯0-9\s]+/, '').trim();
  cleanedName = cleanedName.replace(/\s+[০-৯0-9]+$/, '').trim();
  cleanedName = cleanFillerWords(cleanedName);

  if (!cleanedName || cleanedName.length < 2) {
    return null;
  }

  // 5. Match with Existing Catalog with Smart Prioritization
  let matchedProd: any = null;
  const qName = cleanedName.toLowerCase().trim();

  if (existingProducts && existingProducts.length > 0) {
    // Tier 1: Exact Name Match
    matchedProd = existingProducts.find(p => {
      const bName = (p.banglaName || p.name || '').toLowerCase().trim();
      return bName === qName || (p.name || '').toLowerCase().trim() === qName;
    });

    // Tier 2: Smart Candidate Scoring (Keyword tokens, unit compatibility, in-stock priority)
    if (!matchedProd) {
      const scoredCandidates = existingProducts
        .map(p => ({
          prod: p,
          score: scoreCatalogCandidate(p, qName, unitMatched ? unit : undefined)
        }))
        .filter(c => c.score > 60);

      if (scoredCandidates.length > 0) {
        scoredCandidates.sort((a, b) => b.score - a.score);
        matchedProd = scoredCandidates[0].prod;
      }
    }

    // Tier 3: Substring Inclusion (e.g. "চিনি" matches "সাদা চিনি", "তেল" matches "সয়াবিন তেল")
    if (!matchedProd) {
      matchedProd = existingProducts.find(p => {
        const b = (p.banglaName || p.name || '').toLowerCase().trim();
        return (b.length >= 2 && qName.includes(b)) || (qName.length >= 2 && b.includes(qName));
      });
    }

    // If not found in shop's existing products and no explicit price provided:
    // Strictly require a genuine commercial unit (e.g. "১ বোতল হরলিক্স", "২ কেজি চাল")
    // or known retail catalog item. DO NOT convert random conversation ("এই ভাই", "মামা") into products!
    if (!matchedProd && (!extractedPrice || extractedPrice <= 0)) {
      const isKnownStaple = COMMON_GROCERY_DEFAULTS[qName] !== undefined;
      const hasCommercialUnit = unitMatched && ['কেজি', 'লিটার', 'গ্রাম', 'পিস', 'পাতা', 'প্যাকেট', 'বস্তা', 'জোড়া', 'হালি', 'বোতল', 'বক্স', 'ট্যাবলেট', 'ক্যাপসুল'].includes(unit);

      if ((hasCommercialUnit || isKnownStaple) && cleanedName && cleanedName.length >= 2 && !isBackgroundNoise(cleanedName)) {
        const detected = detectProductCategory(cleanedName);
        const fallbackPrice = isKnownStaple ? COMMON_GROCERY_DEFAULTS[qName].price : 0;
        return {
          name: cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1),
          banglaName: cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1),
          quantity,
          unit: unitMatched ? unit : detected.defaultUnit,
          unitPrice: fallbackPrice,
          totalPrice: Math.round(fallbackPrice * quantity * 100) / 100,
          isExistingProduct: false,
          productId: undefined,
          stock: 0,
          isOutOfStock: true,
          category: detected.categoryId
        };
      }
      return null;
    }
  }

  // Preserve category and default unit
  const detected = detectProductCategory(cleanedName);
  if (!unitMatched) {
    if (matchedProd?.unit) {
      unit = matchedProd.unit;
    } else {
      unit = detected.defaultUnit;
    }
  }

  // If medicine product and user asked for individual tablets/pieces (e.g. "৩টা নাপা")
  if (matchedProd && (matchedProd.unit === 'পাতা' || matchedProd.category === 'cat-pharmacy')) {
    if (unit === 'পিস' || unit === 'টা') {
      unit = 'ট্যাবলেট';
    }
  }

  // 6. Precise Unit Rate & Line Total Calculations
  let finalUnitPrice = 0;
  let finalTotalPrice = 0;
  const currentStock = matchedProd ? Number(matchedProd.stock || 0) : 0;
  const isOutOfStock = matchedProd ? currentStock <= 0 : false;

  if (isTakaForWeight && extractedPrice && matchedProd) {
    // e.g. "৫০ টাকার তেল"
    const catalogRate = Number(matchedProd.sellingPrice) || 100;
    quantity = Math.round((extractedPrice / catalogRate) * 1000) / 1000;
    unit = matchedProd.unit || 'কেজি';
    finalUnitPrice = catalogRate;
    finalTotalPrice = extractedPrice;
  } else if (extractedPrice !== null && extractedPrice > 0) {
    const catalogRate = matchedProd ? (Number(matchedProd.sellingPrice) || 0) : 0;
    if (isExplicitRate) {
      finalUnitPrice = extractedPrice;
      finalTotalPrice = Math.round(finalUnitPrice * quantity * 100) / 100;
    } else if (quantity < 1) {
      // E.g. "হাফ কেজি চাল ৫০" or "১ পোয়া ডাল ২৫"
      // In Bengali commerce, the spoken amount is the TOTAL price for that fractional weight!
      finalTotalPrice = extractedPrice;
      finalUnitPrice = Math.round((extractedPrice / quantity) * 100) / 100;
    } else if (quantity === 1) {
      finalUnitPrice = extractedPrice;
      finalTotalPrice = extractedPrice;
    } else {
      // Quantity > 1 (e.g. "চাল ৪ কেজি ৩০০ টাকা" or "নাপা ৫ টা ২৫ টাকা")
      if (catalogRate > 0 && Math.abs(extractedPrice - catalogRate) < Math.abs(extractedPrice - (catalogRate * quantity))) {
        // Closer to single unit rate
        finalUnitPrice = extractedPrice;
        finalTotalPrice = Math.round(finalUnitPrice * quantity * 100) / 100;
      } else {
        // Spoken price is total price for the given quantity (e.g. 300 tk for 4 kg -> unit price = 75)
        finalTotalPrice = extractedPrice;
        finalUnitPrice = Math.round((extractedPrice / quantity) * 100) / 100;
      }
    }
  } else if (matchedProd) {
    const rawRate = Number(matchedProd.sellingPrice) || 0;
    const prodRatio = Number(matchedProd.conversionRatio) || 1;

    // Pharmacy strip to tablet conversion
    if ((matchedProd.unit === 'পাতা' || matchedProd.category === 'cat-pharmacy') && (unit === 'ট্যাবলেট' || unit === 'ক্যাপসুল' || unit === 'পিস' || unit === 'টা')) {
      const stripRatio = prodRatio > 1 ? prodRatio : 10;
      finalUnitPrice = Math.round((rawRate / stripRatio) * 100) / 100;
      finalTotalPrice = Math.round(finalUnitPrice * quantity * 100) / 100;
      unit = 'ট্যাবলেট';
    } else if (matchedProd.unit === 'পাতা' && unit === 'পাতা' && quantity === 0.5) {
      // হাফ পাতা (e.g. half strip = 5 tablets)
      finalUnitPrice = rawRate;
      finalTotalPrice = Math.round(rawRate * 0.5 * 100) / 100;
    } else if (matchedProd.unit === 'বস্তা' && unit === 'কেজি') {
      const bagKgMatch = (matchedProd.banglaName || matchedProd.name || '').match(/(\d+(?:\.\d+)?)\s*কেজি/);
      const bagCap = bagKgMatch ? parseFloat(bagKgMatch[1]) : (prodRatio > 1 ? prodRatio : 50);
      finalUnitPrice = bagCap > 0 ? Math.round((rawRate / bagCap) * 100) / 100 : rawRate;
      finalTotalPrice = Math.round(finalUnitPrice * quantity * 100) / 100;
    } else if (matchedProd.unit === 'হালি' && (unit === 'পিস' || unit === 'টা')) {
      finalUnitPrice = Math.round((rawRate / 4) * 100) / 100;
      finalTotalPrice = Math.round(finalUnitPrice * quantity * 100) / 100;
    } else if (matchedProd.unit === 'ডজন' && (unit === 'পিস' || unit === 'টা')) {
      finalUnitPrice = Math.round((rawRate / 12) * 100) / 100;
      finalTotalPrice = Math.round(finalUnitPrice * quantity * 100) / 100;
    } else {
      finalUnitPrice = rawRate;
      finalTotalPrice = Math.round(finalUnitPrice * quantity * 100) / 100;
    }
  } else {
    // Fallback if no existingProducts provided (standalone mode)
    finalUnitPrice = 50;
    finalTotalPrice = Math.round(finalUnitPrice * quantity * 100) / 100;
  }

  const finalBanglaName = matchedProd ? (matchedProd.banglaName || matchedProd.name) : cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1);

  return {
    name: finalBanglaName,
    banglaName: finalBanglaName,
    quantity,
    unit,
    unitPrice: finalUnitPrice,
    totalPrice: finalTotalPrice,
    isExistingProduct: Boolean(matchedProd),
    productId: matchedProd?.id,
    stock: currentStock,
    isOutOfStock,
    category: matchedProd?.categoryId || detected.categoryId
  };
}

/**
 * Parses spoken sentence to CREATE a new product in the catalog
 * Examples:
 * - "প্যারাসিটামল ৫০ পাতা কেনা দর ২০ টাকা বিক্রয় দর ২৫ টাকা"
 * - "নতুন জিন্স প্যান্ট সাইজ ৩২ স্টক ৫০ পিস কেনা ৫০০ বিক্রয় ৮০০"
 * - "এলইডি লাইট ১২ ওয়াট কেনা ১২০ বিক্রয় ১৮০ স্টক ৩০ টা"
 * - "মিনিকেট চাল ৫০ বস্তা কেনা ৩০০০ বিক্রয় ৩৪০০"
 */
export function parseVoiceProductEntry(rawSpeech: string): VoiceProductEntryResult {
  const norm = normalizeSpokenNumbers(rawSpeech.toLowerCase());

  // 1. Purchase & Selling Price extraction
  let purchasePrice = 0;
  let sellingPrice = 0;

  const buyMatch = norm.match(/(?:কেনা|ক্রয়|ক্রয়|খরচ|আসল|কেনা\s*দর|ক্রয়\s*মূল্য)\s*(?:দর|মূল্য)?\s*(\d+(?:\.\d+)?)/i);
  if (buyMatch) purchasePrice = parseFloat(buyMatch[1]);

  const sellMatch = norm.match(/(?:বিক্রি|বিক্রয়|বিক্রয়|বেচা|বিক্রয়\s*দর|বিক্রয়\s*মূল্য|দাম)\s*(?:দর|মূল্য)?\s*(\d+(?:\.\d+)?)/i);
  if (sellMatch) sellingPrice = parseFloat(sellMatch[1]);

  // If only 2 numbers spoken at end e.g. "কেনা ১২০ বিক্রয় ১৮০"
  if (purchasePrice === 0 && sellingPrice === 0) {
    const numPair = norm.match(/(\d+)\s*(?:টাকা)?\s*(?:আর|এবং|,)?\s*(\d+)\s*(?:টাকা)?/);
    if (numPair) {
      purchasePrice = parseFloat(numPair[1]);
      sellingPrice = parseFloat(numPair[2]);
    }
  }

  // 2. Quantity & Unit
  let stock = 20;
  let unit = 'পিস';
  const stockMatch = norm.match(/(\d+(?:\.\d+)?)\s*(কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|বস্তা|জোড়া|জোড়া|হালি|বোতল|ফুট|গজ|কাপ|প্লেট|কয়েল|বক্স|টি|টা)/);
  if (stockMatch) {
    stock = parseFloat(stockMatch[1]);
    unit = stockMatch[2];
    if (unit === 'টি' || unit === 'টা') unit = 'পিস';
    if (unit === 'জোড়া') unit = 'জোড়া';
  }

  // 3. Size, Color, Watt, Generic Name attributes
  let size: string | undefined;
  let color: string | undefined;
  let genericName: string | undefined;

  const sizeMatch = norm.match(/সাইজ\s*([a-z0-9]+)/i);
  if (sizeMatch) size = sizeMatch[1].toUpperCase();

  const wattMatch = norm.match(/(\d+)\s*ওয়াট|(\d+)\s*watt/i);
  if (wattMatch) size = (wattMatch[1] || wattMatch[2]) + 'W';

  const colorMatch = norm.match(/(সাদা|কালো|লাল|নীল|হলুদ|সবুজ|হোয়াইট|ব্ল্যাক|নেভি\s*ব্লু)/i);
  if (colorMatch) color = colorMatch[1];

  // 4. Product Name Cleaning
  let cleanName = norm
    .replace(/(?:নতুন|পণ্য|আইটেম|যোগ\s*করো|সেভ\s*করো|এন্ট্রি)/gi, ' ')
    .replace(/(?:কেনা|ক্রয়|ক্রয়|খরচ|আসল|কেনা\s*দর|ক্রয়\s*মূল্য)\s*(?:দর|মূল্য)?\s*\d+(?:\.\d+)?/gi, ' ')
    .replace(/(?:বিক্রি|বিক্রয়|বিক্রয়|বেচা|বিক্রয়\s*দর|বিক্রয়\s*মূল্য|দাম)\s*(?:দর|মূল্য)?\s*\d+(?:\.\d+)?/gi, ' ')
    .replace(/বিক্রয়|বিক্রয়|বিক্রি|বেচা|ক্রয়|ক্রয়|কেনা|দাম|দর|মূল্য|আসল|খরচ/gi, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|বস্তা|জোড়া|জোড়া|হালি|বোতল|ফুট|গজ|কাপ|প্লেট|কয়েল|বক্স|টি|টা|টাকা)/gi, ' ')
    .replace(/(?:সাইজ\s*[a-z0-9]+|\d+\s*ওয়াট|\d+\s*watt|স্টক|মজুদ)/gi, ' ')
    .replace(/[০-৯0-9]/g, ' ')
    .replace(/\s+বি\s+|\s+বি$|^বি\s+|\bবি\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleanName = cleanFillerWords(cleanName);

  if (!cleanName || cleanName.length < 2) {
    cleanName = 'নতুন পণ্য';
  }

  const detected = detectProductCategory(cleanName);
  if (!stockMatch) unit = detected.defaultUnit;

  if (sellingPrice === 0 && purchasePrice > 0) {
    sellingPrice = Math.round(purchasePrice * 1.25);
  } else if (purchasePrice === 0 && sellingPrice > 0) {
    purchasePrice = Math.round(sellingPrice * 0.8);
  }

  const banglaName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  return {
    success: sellingPrice > 0 || purchasePrice > 0 || cleanName.length >= 2,
    name: banglaName,
    banglaName,
    categoryId: detected.categoryId,
    stock,
    unit,
    purchasePrice,
    sellingPrice: sellingPrice || 50,
    size,
    color,
    genericName,
    rawSpeech,
    explanation: `পণ্য: ${banglaName} | স্টক: ${stock} ${unit} | কেনা: ৳${purchasePrice} | বিক্রয়: ৳${sellingPrice || 50}`
  };
}

/**
 * Parses spoken sentence to RESTOCK / UPDATE an existing product
 * Examples:
 * - "নাপা এক্সট্রা ৫০ পাতা স্টক যোগ করো কেনা ২২"
 * - "চিনি ১০০ কেজি স্টক ইন কেনা ১৩০ বিক্রয় ১৪০"
 * - "সয়াবিন তেল ২০ লিটার নতুন চালান"
 */
export function parseVoiceStockIn(
  rawSpeech: string,
  existingProducts: any[] = []
): VoiceStockInResult {
  const norm = normalizeSpokenNumbers(rawSpeech.toLowerCase());

  // 1. Quantity & Unit to Add
  let quantityToAdd = 10;
  let unit = 'পিস';
  const qtyMatch = norm.match(/(\d+(?:\.\d+)?)\s*(কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|বস্তা|জোড়া|জোড়া|হালি|বোতল|ফুট|গজ|কাপ|প্লেট|কয়েল|বক্স|টি|টা)/);
  if (qtyMatch) {
    quantityToAdd = parseFloat(qtyMatch[1]);
    unit = qtyMatch[2];
    if (unit === 'টি' || unit === 'টা') unit = 'পিস';
    if (unit === 'জোড়া') unit = 'জোড়া';
  }

  // 2. Updated prices if mentioned
  let purchasePrice: number | undefined;
  let sellingPrice: number | undefined;

  const buyMatch = norm.match(/(?:কেনা|ক্রয়|ক্রয়|খরচ|আসল)\s*(?:দর|মূল্য)?\s*(\d+(?:\.\d+)?)/i);
  if (buyMatch) purchasePrice = parseFloat(buyMatch[1]);

  const sellMatch = norm.match(/(?:বিক্রি|বিক্রয়|বিক্রয়|বেচা|দাম)\s*(?:দর|মূল্য)?\s*(\d+(?:\.\d+)?)/i);
  if (sellMatch) sellingPrice = parseFloat(sellMatch[1]);

  // 3. Clean product name
  let cleanName = norm
    .replace(/(?:স্টক|স্টক\s*ইন|চালান|যোগ\s*করো|নতুন\s*স্টক|ঢুকছে|মাল\s*আসছে|আপডেট|ইন)/gi, ' ')
    .replace(/(?:কেনা|ক্রয়|ক্রয়|খরচ|আসল|বিক্রি|বিক্রয়|বিক্রয়|বেচা|দাম|দর|মূল্য)\s*(?:দর|মূল্য)?\s*\d+(?:\.\d+)?/gi, ' ')
    .replace(/(?:কেনা|ক্রয়|ক্রয়|খরচ|আসল|বিক্রি|বিক্রয়|বিক্রয়|বেচা|দাম|দর|মূল্য)/gi, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:কেজি|লিটার|গ্রাম|পিস|পাতা|প্যাকেট|বস্তা|জোড়া|জোড়া|হালি|বোতল|ফুট|গজ|কাপ|প্লেট|কয়েল|বক্স|টি|টা|টাকা)/gi, ' ')
    .replace(/[০-৯0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleanName = cleanFillerWords(cleanName);

  // Find product in catalog
  const matchedProd = existingProducts.find(p => {
    const bName = (p.banglaName || p.name || '').toLowerCase();
    const qName = cleanName.toLowerCase();
    return bName.includes(qName) || qName.includes(bName);
  });

  const finalName = matchedProd ? (matchedProd.banglaName || matchedProd.name) : (cleanName || 'পণ্য');
  const finalUnit = matchedProd?.unit || unit;

  return {
    success: Boolean(matchedProd) || cleanName.length >= 2,
    product: matchedProd,
    productName: finalName,
    quantityToAdd,
    unit: finalUnit,
    purchasePrice: purchasePrice || matchedProd?.purchasePrice,
    sellingPrice: sellingPrice || matchedProd?.sellingPrice,
    rawSpeech,
    explanation: `${finalName}: +${quantityToAdd} ${finalUnit} স্টক যুক্ত হবে`
  };
}
