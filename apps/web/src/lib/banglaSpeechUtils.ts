/**
 * Universal Bengali Speech Cleaner & Parser Utilities
 * Handles mobile Android/Chrome SpeechRecognition quirks, deduplication, and TTS echo suppression
 */

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
  const s = text.trim().toLowerCase();

  // Check if TTS is currently active
  if (typeof window !== 'undefined' && (window as any).__IS_TTS_SPEAKING__) {
    return true;
  }

  // Check against last spoken TTS text
  if (typeof window !== 'undefined' && (window as any).__LAST_TTS_TEXT__) {
    const lastTTS = String((window as any).__LAST_TTS_TEXT__).trim().toLowerCase();
    if (lastTTS && (s.includes(lastTTS) || lastTTS.includes(s) || getBengaliStringSimilarity(s, lastTTS) > 0.65)) {
      return true;
    }
  }

  // Known confirmation keywords from system TTS speech
  return /লেখা\s*হয়েছে|যুক্ত\s*হয়েছে|হিসাব\s*সম্পন্ন|পরিশোধ\s*রেকর্ড|বাকি\s*খাতায়.*লেখা|খরচ\s*খাতায়.*যুক্ত|বাকি\s*থেকে.*জমা|বর্তমান\s*মোট\s*বকেয়া|সাউন্ডবক্স|সফলভাবে/i.test(s);
}

/**
 * Safely extracts the cumulative transcript from SpeechRecognition event
 * Guaranteed not to duplicate tokens across interim and final results
 */
export function extractTranscriptFromEvent(event: any): { fullTranscript: string; isFinal: boolean } {
  if (!event || !event.results) return { fullTranscript: '', isFinal: false };

  // If TTS is actively speaking, drop the microphone event immediately to prevent feedback loop
  if (typeof window !== 'undefined' && (window as any).__IS_TTS_SPEAKING__) {
    return { fullTranscript: '', isFinal: false };
  }

  let finalTranscript = '';
  let interimTranscript = '';
  let hasFinal = false;

  for (let i = 0; i < event.results.length; i++) {
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

  const rawCombined = (finalTranscript || interimTranscript).trim();

  // Check if this is an echo of the assistant's own voice
  if (isEchoedTTSResponse(rawCombined)) {
    return { fullTranscript: '', isFinal: false };
  }

  const cleaned = cleanSpokenBengali(rawCombined);
  return { fullTranscript: cleaned, isFinal: hasFinal };
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
 */
export function findBestFuzzyMatch<T extends { name?: string; banglaName?: string; bangla_name?: string }>(
  spoken: string,
  candidates: T[],
  threshold = 0.45
): { match: T | null; confidence: number } {
  if (!spoken || !candidates || candidates.length === 0) return { match: null, confidence: 0 };
  const cleanSpoken = spoken.replace(/(ভাই|কাকা|চাচা|মাস্টার|দাদা|আপা|সাহেব|বেগম|হাজী)/g, '').trim();

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

    const sim = Math.max(
      getBengaliStringSimilarity(spoken, candidateName),
      getBengaliStringSimilarity(cleanSpoken, cleanCand)
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
