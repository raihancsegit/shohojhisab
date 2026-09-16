/**
 * 🔊 Universal Native Audio & Soundbox Synthesizer for React Native
 * Uses Expo Speech + Haptics with multi-locale fallback for 100% reliable voice on Android & iOS.
 */

import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

export function playNativeChime(type: 'cash' | 'success' | 'alert' | 'beep' = 'success') {
  try {
    if (type === 'cash') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'success') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (type === 'alert') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (e) {}
}

export function speakNativeText(text: string, onDone?: () => void) {
  if (!text) return;

  const clean = String(text)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[*_#`~]/g, '')
    .trim();

  if (!clean) return;

  console.log('[AudioEngine] Speaking announcement:', clean);
  playNativeChime(/টাকা|মেমো|পরিশোধ|ক্যাশ/i.test(clean) ? 'cash' : 'success');

  try {
    Speech.stop();

    // 1st try: Bengali (Bangladesh)
    Speech.speak(clean, {
      language: 'bn-BD',
      pitch: 1.0,
      rate: 0.95,
      onDone,
      onError: () => {
        // 2nd try fallback: Bengali (India)
        try {
          Speech.speak(clean, {
            language: 'bn-IN',
            pitch: 1.0,
            rate: 0.95,
            onDone,
            onError: () => {
              // 3rd try fallback: Hindi (India)
              try {
                Speech.speak(clean, {
                  language: 'hi-IN',
                  pitch: 1.0,
                  rate: 0.95,
                  onDone,
                  onError: () => {
                    // 4th try fallback: Default / English
                    try {
                      Speech.speak(clean, {
                        language: 'en-US',
                        onDone,
                        onError: onDone
                      });
                    } catch (e4) {
                      if (onDone) onDone();
                    }
                  }
                });
              } catch (e3) {
                if (onDone) onDone();
              }
            }
          });
        } catch (e2) {
          if (onDone) onDone();
        }
      }
    });
  } catch (e) {
    console.warn('[AudioEngine] Speech synthesis error:', e);
    if (onDone) onDone();
  }
}
