/**
 * 🔊 Native Audio & Soundbox Synthesizer for React Native
 * Uses Expo Speech + Haptics for instant on-device audio feedback.
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

  playNativeChime(/টাকা|মেমো|পরিশোধ|ক্যাশ/i.test(clean) ? 'cash' : 'success');

  try {
    Speech.stop();
    Speech.speak(clean, {
      language: 'bn-BD',
      pitch: 1.0,
      rate: 1.0,
      onDone,
      onError: onDone
    });
  } catch (e) {
    if (onDone) onDone();
  }
}
