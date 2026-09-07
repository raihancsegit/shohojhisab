/**
 * Universal Bengali Speech Cleaner & Parser Utilities
 * Handles mobile Android/Chrome SpeechRecognition quirks and deduplication
 */

export function cleanSpokenBengali(text: string): string {
  if (!text) return '';
  let s = String(text).trim();

  // 1. Remove obvious continuous repetitions of single words: "রহিম রহিম রহিম" -> "রহিম"
  const words = s.split(/\s+/);
  const dedupedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const prev = dedupedWords[dedupedWords.length - 1];
    if (current && current !== prev) {
      dedupedWords.push(current);
    }
  }
  s = dedupedWords.join(' ');

  // 2. Remove multi-word repeated phrases:
  // e.g. "রহিম ভাই রহিম ভাই রহিম ভাই" -> "রহিম ভাই"
  // e.g. "৫০ টাকা ৫০ টাকা" -> "৫০ টাকা"
  for (let len = 4; len >= 1; len--) {
    const pattern = new RegExp(`((?:\\S+\\s+){${len - 1}}\\S+)(?:\\s+\\1)+`, 'gi');
    s = s.replace(pattern, '$1');
  }

  return s.trim();
}

/**
 * Safely extracts the cumulative transcript from SpeechRecognition event
 * Guaranteed not to duplicate tokens across interim and final results
 */
export function extractTranscriptFromEvent(event: any): { fullTranscript: string; isFinal: boolean } {
  if (!event || !event.results) return { fullTranscript: '', isFinal: false };

  let full = '';
  let hasFinal = false;

  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i];
    if (result && result[0] && result[0].transcript) {
      full += result[0].transcript + ' ';
      if (result.isFinal) hasFinal = true;
    }
  }

  const cleaned = cleanSpokenBengali(full);
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

  // Convert digits ০-৯ to 0-9
  s = s.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());

  return s;
}

/**
 * Detects if the spoken transcript is the device speaker's own TTS output echoed back into the microphone
 */
export function isEchoedTTSResponse(text: string): boolean {
  if (!text) return false;
  const s = text.trim();
  return /লেখা\s*হয়েছে|যুক্ত\s*হয়েছে|হিসাব\s*সম্পন্ন|পরিশোধ\s*রেকর্ড|বাকি\s*খাতায়.*লেখা|খরচ\s*খাতায়.*যুক্ত|বাকি\s*থেকে.*জমা\s*হয়েছে|বর্তমান\s*মোট\s*বকেয়া/i.test(s);
}

