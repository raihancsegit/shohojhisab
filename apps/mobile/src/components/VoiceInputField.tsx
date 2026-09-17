import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { playNativeChime, speakNativeText } from '../lib/offlineAudioEngine';

interface VoiceInputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isNumeric?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  style?: any;
  inputStyle?: any;
  required?: boolean;
  promptText?: string;
}

// Convert Bangla digits and spoken phrases into clean values
export function parseSpokenBanglaValue(text: string, isNumeric = false): string {
  if (!text) return '';
  let str = text.trim();

  // Replace Bangla digits ०-९
  str = str.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());

  if (isNumeric) {
    const phraseMap: Record<string, string> = {
      'দেড় হাজার': '1500', 'দেড় হাজার': '1500', 'আড়াই হাজার': '2500', 'আড়াই হাজার': '2500',
      'সাড়ে তিন হাজার': '3500', 'দেড়শো': '150', 'দেড়শো': '150', 'আড়াইশো': '250', 'আড়াইশো': '250',
      'একশত': '100', 'একশো': '100', 'দুইশত': '200', 'দুইশো': '200', 'তিনশত': '300', 'তিনশো': '300',
      'চারশত': '400', 'চারশো': '400', 'পাঁচশত': '500', 'পাঁচশো': '500',
      'এক হাজার': '1000', 'দুই হাজার': '2000', 'পাঁচ হাজার': '5000', 'দশ হাজার': '10000', 'বিশ হাজার': '20000', 'পঞ্চাশ হাজার': '50000'
    };
    for (const [p, val] of Object.entries(phraseMap)) {
      if (str.includes(p)) str = str.replace(new RegExp(p, 'g'), val);
    }

    str = str.replace(/টাকা|টাকার|টি|টা|কেজি|গ্রাম|লিটার|পিস|বক্স/g, ' ');
    const numMatch = str.match(/\d+(\.\d+)?/);
    return numMatch ? numMatch[0] : str.replace(/[^0-9.]/g, '');
  }

  return str.replace(/লেখো|করো|দাও|নাম|হলো|ভাই/g, '').trim();
}

export default function VoiceInputField({
  label,
  value,
  onChangeText,
  placeholder,
  isNumeric = false,
  keyboardType = 'default',
  multiline = false,
  style,
  inputStyle,
  required = false,
  promptText
}: VoiceInputFieldProps) {
  const { theme, themeMode, triggerHaptic } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [modalVoiceInput, setModalVoiceInput] = useState('');

  const quickPresets = isNumeric
    ? ['৫০', '১০০', '১৫০', '২০০', '২৫০', '৫০০', '১০০০', '২০০০', '৫০০০']
    : ['মোঃ রহিম', 'আব্দুল করিম', 'নাপা এক্সট্রা', 'সয়াবিন তেল', 'মসুর ডাল', 'চিনি'];

  const handleOpenVoice = () => {
    triggerHaptic('medium');
    playNativeChime('beep');
    setShowVoiceModal(true);
    const speechPrompt = promptText || (label ? `${label} মুখে বলুন` : 'মুখে বলুন');
    speakNativeText(speechPrompt);
  };

  const handleApplyVoice = (rawSpeech: string) => {
    const parsed = parseSpokenBanglaValue(rawSpeech, isNumeric);
    if (!parsed) return;
    triggerHaptic('success');
    playNativeChime('cash');
    onChangeText(parsed);
    setShowVoiceModal(false);
    setModalVoiceInput('');
    speakNativeText(`${parsed} সেট হয়েছে`);
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: isDark ? '#cbd5e1' : '#475569' }]}>
            {label} {required ? <Text style={{ color: '#ef4444' }}>*</Text> : ''}
          </Text>
        </View>
      ) : null}

      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          borderColor: isDark ? '#334155' : '#cbd5e1'
        }
      ]}>
        <TextInput
          style={[
            styles.textInput,
            { color: isDark ? '#f8fafc' : '#0f172a' },
            multiline && { height: 64, textAlignVertical: 'top' },
            inputStyle
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType={keyboardType}
          multiline={multiline}
        />

        {/* 🎙️ In-Field Mic Button */}
        <TouchableOpacity
          style={[styles.micBtn, { backgroundColor: isDark ? '#1e293b' : '#ecfdf5' }]}
          onPress={handleOpenVoice}
          activeOpacity={0.7}
        >
          <Text style={styles.micIcon}>🎙️</Text>
        </TouchableOpacity>
      </View>

      {/* 🎙️ Voice Field Modal HUD */}
      <Modal visible={showVoiceModal} animationType="fade" transparent onRequestClose={() => setShowVoiceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: primaryColor }]}>
                <Text style={styles.modalHeaderIcon}>🎙️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {label ? `${label} ভয়েস ইনপুট` : 'ভয়েস ইনপুট'}
                </Text>
                <Text style={styles.modalSub}>মুখে বলুন অথবা নিচের সাজেশনে চাপুন</Text>
              </View>
              <TouchableOpacity onPress={() => setShowVoiceModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.voiceInputBox, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}>
              <TextInput
                style={[styles.voiceModalInput, { color: isDark ? '#f8fafc' : '#0f172a' }]}
                placeholder={isNumeric ? "যেমন: ৫০০ টাকা..." : "যেমন: মোঃ রহিম..."}
                placeholderTextColor="#94a3b8"
                value={modalVoiceInput}
                onChangeText={setModalVoiceInput}
                autoFocus
                onSubmitEditing={() => handleApplyVoice(modalVoiceInput)}
              />
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: primaryColor }]}
                onPress={() => handleApplyVoice(modalVoiceInput)}
              >
                <Text style={styles.applyBtnText}>সেট করুন ▶</Text>
              </TouchableOpacity>
            </View>

            {/* Quick 1-tap chip presets */}
            <Text style={[styles.presetLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              ⚡ দ্রুত সিলেক্ট করুন:
            </Text>
            <View style={styles.presetGrid}>
              {quickPresets.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.presetChip, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}
                  onPress={() => handleApplyVoice(p)}
                >
                  <Text style={[styles.presetChipText, { color: isDark ? '#f8fafc' : '#1e293b' }]}>
                    🎙️ {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 44
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 8
  },
  micBtn: {
    padding: 6,
    borderRadius: 8,
    marginLeft: 6
  },
  micIcon: {
    fontSize: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    borderRadius: 20,
    padding: 18,
    elevation: 6
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalHeaderIcon: {
    fontSize: 18
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800'
  },
  modalSub: {
    fontSize: 11,
    color: '#64748b'
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 'bold'
  },
  voiceInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14
  },
  voiceModalInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700'
  },
  applyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  applyBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  presetChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700'
  }
});
