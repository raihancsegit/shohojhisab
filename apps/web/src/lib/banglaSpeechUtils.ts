/**
 * Universal Bengali Speech Cleaner & Parser Utilities
 * Handles mobile Android/Chrome SpeechRecognition quirks, deduplication, and TTS echo suppression
 */
import { voiceProximityManager } from './voiceProximityGate';

/**
 * Universal phrase and word deduplication for Bengali speech recognition
 */
export function cleanSpokenBengali(text: string): string {
  if (!text) return '';
  let s = String(text).trim();

  // 1. Remove continuous repetitions of single words: "রহিম রহিম রহিম" -> "রহিম"
  const words = s.split(/\s+/).filter(Boolean);
  const dedupedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const prev = dedupedWords[dedupedWords.length - 1];
    if (current && current.toLowerCase() !== prev?.toLowerCase()) {
      dedupedWords.push(current);
    }
  }
  s = dedupedWords.join(' ');

  // 2. Remove multi-word repeated phrases (e.g. "চা নাস্তা ৫০ টাকা চা নাস্তা ৫০ টাকা" -> "চা নাস্তা ৫০ টাকা")
  for (let len = 6; len >= 1; len--) {
    const pattern = new RegExp(`((?:\\S+\\s+){${len - 1}}\\S+)(?:\\s+\\1)+`, 'gi');
    s = s.replace(pattern, '$1');
  }

  // 3. Clean repetitive tails e.g. "রহিম ভাই ৫০ টাকা ৫০ টাকা"
  s = s.replace(/(\d+\s*টাকা)(?:\s+\1)+/gi, '$1');

  return s.trim();
}

/**
 * Detects if the spoken transcript is the device speaker's own TTS output echoed back into the microphone
 */
export function isEchoedTTSResponse(text: string): boolean {
  if (!text) return false;
  // If native browser speech synthesis is actively producing audio right now
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
    return true;
  }
  return false;
}

/**
 * Safely extracts the cumulative transcript from SpeechRecognition event
 * Guaranteed not to duplicate tokens across interim and final results
 */
export function extractTranscriptFromEvent(event: any): { fullTranscript: string; isFinal: boolean; isDistantNoise?: boolean } {
  if (!event || !event.results) return { fullTranscript: '', isFinal: false, isDistantNoise: false };

  let finalTranscript = '';
  let interimTranscript = '';
  let hasFinal = false;

  const startIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0;

  for (let i = startIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (result && result[0] && result[0].transcript) {
      const trans = result[0].transcript.trim();
      if (result.isFinal) {
        finalTranscript += (finalTranscript ? ' ' : '') + trans;
        hasFinal = true;
      } else {
        interimTranscript += (interimTranscript ? ' ' : '') + trans;
      }
    }
  }

  // Combine final and interim safely
  const rawCombined = (finalTranscript && interimTranscript)
    ? `${finalTranscript} ${interimTranscript}`
    : (finalTranscript || interimTranscript);

  if (!rawCombined) {
    return { fullTranscript: '', isFinal: false, isDistantNoise: false };
  }

  const cleaned = cleanSpokenBengali(rawCombined);
  return { fullTranscript: cleaned, isFinal: hasFinal, isDistantNoise: false };
}

/**
 * Converts Bengali digits & spoken words to numerical equivalents
 */
export function normalizeBengaliNumbers(str: string): string {
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
  s = s.replace(/দুই হাজার/g, '2000');
  s = s.replace(/তিন হাজার/g, '3000');
  s = s.replace(/পাঁচ হাজার/g, '5000');
  s = s.replace(/দশ হাজার/g, '10000');
  s = s.replace(/দেড় কেজি|দেড় কেজি/g, '1.5 কেজি');
  s = s.replace(/আড়াই কেজি|আড়াই কেজি/g, '2.5 কেজি');
  s = s.replace(/আধা কেজি|আধ কেজি|হাফ কেজি/g, '0.5 কেজি');

  // Colloquial Bangladeshi Quantities & Units
  s = s.replace(/এক পোয়া|১ পোয়া|এক পোয়া|১ পোয়া|পোয়া|পোয়া/g, '0.25 কেজি');
  s = s.replace(/আধ পোয়া|আধ পোয়া|হাফ পোয়া|হাফ পোয়া/g, '0.125 কেজি');
  s = s.replace(/তিন পোয়া|তিন পোয়া|৩ পোয়া|৩ পোয়া/g, '0.75 কেজি');
  s = s.replace(/এক কুড়ি|১ কুড়ি|এক কুড়ি|১ কুড়ি/g, '20টি');
  s = s.replace(/দুই কুড়ি|২ কুড়ি|দুই কুড়ি|২ কুড়ি/g, '40টি');
  s = s.replace(/এক ডজন|১ ডজন/g, '12টি');
  s = s.replace(/হাফ ডজন|আধা ডজন|আধ ডজন/g, '6টি');
  s = s.replace(/দেড় ডজন|দেড় ডজন/g, '18টি');
  s = s.replace(/দুই ডজন|২ ডজন/g, '24টি');

  // Convert digits ০-৯ to 0-9
  s = s.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());

  // Traditional Ser / শের
  s = s.replace(/দেড়\s*সের|দেড়\s*সের|১\.৫\s*সের|1\.5\s*সের/g, '1.4 কেজি');
  s = s.replace(/আড়াই\s*সের|আড়াই\s*সের|২\.৫\s*সের|2\.5\s*সের/g, '2.33 কেজি');
  s = s.replace(/আধা\s*সের|আধ\s*সের|হাফ\s*সের/g, '0.465 কেজি');
  s = s.replace(/এক\s*সের|১\s*সের|1\s*সের/g, '0.93 কেজি');
  s = s.replace(/দুই\s*সের|২\s*সের|2\s*সের/g, '1.86 কেজি');
  s = s.replace(/তিন\s*সের|৩\s*সের|3\s*সের/g, '2.79 কেজি');
  s = s.replace(/পাঁচ\s*সের|৫\s*সের|5\s*সের/g, '4.65 কেজি');

  // Pata / Strip (Pharmacy)
  s = s.replace(/আধা\s*পাতা|আধ\s*পাতা|হাফ\s*পাতা/g, '5টি');
  s = s.replace(/এক\s*পাতা|১\s*পাতা|1\s*পাতা/g, '10টি');
  s = s.replace(/দুই\s*পাতা|২\s*পাতা|2\s*পাতা/g, '20টি');

  // Mon / মণ
  s = s.replace(/এক\s*মণ|১\s*মণ|1\s*মণ/g, '40 কেজি');
  s = s.replace(/আধা\s*মণ|আধ\s*মণ|হাফ\s*মণ/g, '20 কেজি');

  return s;
}

/**
 * Phonetically normalizes Bengali text by grouping interchangeable consonants,
 * sibilants (শ/ষ/স), nasals (ণ/ন), flaps (ড়/ঢ়/র), and removing hasanta/nukta.
 */
export function canonicalizeBengaliPhonetic(str: string): string {
  if (!str) return '';
  let s = str.trim().toLowerCase();

  // Remove nukta, virama (hasanta), chandrabindu
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

  // Group Vowels
  s = s.replace(/[যয়]/g, 'জ');
  s = s.replace(/ৈ/g, 'ই');
  s = s.replace(/ৌ/g, 'উ');
  s = s.replace(/ী/g, 'ি');
  s = s.replace(/ূ/g, 'ু');

  // Collapse repetitions
  s = s.replace(/(.)\1+/g, '$1');

  // Strip non-Bengali symbols
  s = s.replace(/[^\u0980-\u09FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Levenshtein distance string similarity score (0 to 1)
 */
export function getBengaliStringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

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
 * Finds the best matching candidate from the database for a spoken name
 * Enhanced with Phonetic Canonical matching!
 */
export function findBestFuzzyMatch<T extends { name?: string; banglaName?: string; bangla_name?: string }>(
  spoken: string,
  candidates: T[],
  threshold = 0.45
): { match: T | null; confidence: number } {
  if (!spoken || !candidates || candidates.length === 0) return { match: null, confidence: 0 };
  const cleanSpoken = spoken.replace(/(ভাই|কাকা|চাচা|মাস্টার|দাদা|আপা|সাহেব|বেগম|হাজী)/g, '').trim();
  const phoneticSpoken = canonicalizeBengaliPhonetic(cleanSpoken);

  let bestMatch: T | null = null;
  let highestScore = 0;

  for (const c of candidates) {
    const candidateName = c.banglaName || c.bangla_name || c.name || '';
    if (!candidateName) continue;

    const cleanCand = candidateName.replace(/(ভাই|কাকা|চাচা|মাস্টার|দাদা|আপা|সাহেব|বেগম|হাজী)/g, '').trim();

    // Exact or direct substring match
    if (candidateName.includes(spoken) || spoken.includes(candidateName) || cleanCand.includes(cleanSpoken) || cleanSpoken.includes(cleanCand)) {
      return { match: c, confidence: 0.95 };
    }

    // Phonetic canonical match
    const phoneticCand = canonicalizeBengaliPhonetic(cleanCand);
    if (phoneticCand && (phoneticCand === phoneticSpoken || phoneticCand.includes(phoneticSpoken) || phoneticSpoken.includes(phoneticCand))) {
      if (highestScore < 0.90) {
        highestScore = 0.90;
        bestMatch = c;
      }
    }

    const sim = Math.max(
      getBengaliStringSimilarity(spoken, candidateName),
      getBengaliStringSimilarity(cleanSpoken, cleanCand),
      phoneticCand ? getBengaliStringSimilarity(phoneticSpoken, phoneticCand) : 0
    );

    if (sim > highestScore) {
      highestScore = sim;
      bestMatch = c;
    }
  }

  if (highestScore >= threshold && bestMatch) {
    return { match: bestMatch, confidence: highestScore };
  }

  return { match: null, confidence: highestScore };
}

