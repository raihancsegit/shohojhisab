import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { playNativeChime, speakNativeText } from '../lib/offlineAudioEngine';
import { getLocalVaultData, executePOSSale } from '../lib/offlineDataVault';
import { parseVoicePOSCommand } from '../lib/voicePOSParser';

interface VoiceItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface VoicePOSCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteSale: (saleData: any) => void;
}

const { width } = Dimensions.get('window');

export default function VoicePOSCalculatorModal({
  isOpen,
  onClose,
  onCompleteSale
}: VoicePOSCalculatorModalProps) {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, triggerHaptic, refreshVault } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [items, setItems] = useState<VoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('নগদ ক্রেতা');
  const [inputText, setInputText] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState<string>('মুখে বলুন (যেমন: ২ কেজি চিনি আর ১ লিটার তেল)...');

  React.useEffect(() => {
    if (isOpen) {
      speakNativeText('আল্ট্রা ভয়েস মেমো চালু হয়েছে। মুখে বলুন বা সিলেক্ট করুন।');
    }
  }, [isOpen]);

  const vault = getLocalVaultData(tenant.id);
  const products = vault.products || [];

  const quickVoiceChips = [
    { label: '১ কেজি চিনি', cmd: '১ কেজি চিনি' },
    { label: '২ লিটার তেল', cmd: '২ লিটার তেল' },
    { label: 'নাপা ৫০ পাতা', cmd: 'নাপা ৫০ পাতা' },
    { label: '৫০ টাকার ডাল', cmd: '৫০ টাকার ডাল' },
    { label: '২০ টাকা ডিসকাউন্ট', cmd: '২০ টাকা ছাড়' },
    { label: 'কাস্টমার রহিম', cmd: 'কাস্টমার রহিম' },
  ];

  const parseVoiceInput = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    triggerHaptic('medium');
    playNativeChime('beep');
    setInputText('');

    const parseResult = parseVoicePOSCommand(text, products);

    // 1. Cash Checkout
    if (parseResult.type === 'cash_checkout') {
      if (items.length > 0) {
        handleFinalizeSale();
      } else {
        setFeedbackText('মেমোতে আগে পণ্য যোগ করুন');
        speakNativeText('মেমোতে আগে পণ্য যোগ করুন');
      }
      return;
    }

    // 2. Due / Khata Checkout
    if (parseResult.type === 'due_checkout') {
      const cust = parseResult.customerName || customerName;
      setCustomerName(cust);
      setFeedbackText(`বাকি কাস্টমার: ${cust}`);
      speakNativeText(`${cust} এর বাকি খাতায় হিসাব ধরা হয়েছে`);
      return;
    }

    // 3. Discount
    if (parseResult.type === 'discount' && parseResult.discountAmount) {
      setDiscount(parseResult.discountAmount);
      setFeedbackText(`ছাড়: ৳${parseResult.discountAmount}`);
      speakNativeText(`৳${parseResult.discountAmount} টাকা ছাড় দেওয়া হয়েছে`);
      return;
    }

    // 4. Remove Item
    if (parseResult.type === 'remove_item' && parseResult.removeItemName) {
      const nameLower = parseResult.removeItemName.toLowerCase();
      setItems(prev => prev.filter(it => !it.name.toLowerCase().includes(nameLower)));
      setFeedbackText(`বাদ দেওয়া হয়েছে: ${parseResult.removeItemName}`);
      speakNativeText(`${parseResult.removeItemName} মেমো থেকে বাদ দেওয়া হয়েছে`);
      return;
    }

    // 5. Clear Memo
    if (parseResult.type === 'clear_memo') {
      setItems([]);
      setDiscount(0);
      setFeedbackText('মেমো রিসেট করা হয়েছে');
      speakNativeText('মেমো খালি করা হয়েছে');
      return;
    }

    // 6. Add Items from stock matching
    if (parseResult.type === 'add_items' && parseResult.items && parseResult.items.length > 0) {
      const newVoiceItems: VoiceItem[] = parseResult.items.map(it => ({
        id: it.productId || `vi-${Date.now()}-${Math.random().toString().slice(-4)}`,
        name: it.banglaName || it.name,
        unit: it.unit || 'পিস',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 50,
        totalPrice: it.totalPrice || (it.unitPrice * it.quantity)
      }));

      setItems(prev => [...prev, ...newVoiceItems]);
      const itemSummary = newVoiceItems.map(i => `${i.name} ${i.quantity} ${i.unit}`).join(', ');
      setFeedbackText(`যোগ হয়েছে: ${itemSummary}`);
      speakNativeText(`${newVoiceItems.length} টি পণ্য মেমোতে যোগ করা হয়েছে`);
      return;
    }

    // Fallback single item matching
    let matchedProd = products.find(p => (p.name && text.includes(p.name)) || (p.name && p.name.includes(text.split(' ')[0])));
    let qty = 1;
    const numMatch = text.match(/(\d+)/);
    if (numMatch) {
      qty = parseInt(numMatch[1], 10);
    }

    if (matchedProd) {
      const unitPrice = matchedProd.sellingPrice || matchedProd.price || 100;
      const newItem: VoiceItem = {
        id: matchedProd.id,
        name: matchedProd.name,
        unit: matchedProd.unit || 'পিস',
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: unitPrice * qty
      };
      setItems(prev => [...prev, newItem]);
      setFeedbackText(`যোগ হয়েছে: ${newItem.name} (${newItem.quantity} ${newItem.unit})`);
      speakNativeText(`${newItem.quantity} ${newItem.unit} ${newItem.name} যোগ করা হয়েছে`);
    } else {
      const unitPrice = 100;
      const newItem: VoiceItem = {
        id: `vi-${Date.now()}`,
        name: text,
        unit: 'একক',
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: unitPrice * qty
      };
      setItems(prev => [...prev, newItem]);
      setFeedbackText(`যোগ হয়েছে: ${newItem.name}`);
      speakNativeText(`${newItem.name} মেমোতে যোগ করা হয়েছে`);
    }
  };

  const removeItem = (id: string) => {
    triggerHaptic('light');
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0);
  const totalAmount = Math.max(0, subtotal - discount);

  const handleFinalizeSale = () => {
    if (items.length === 0) {
      speakNativeText('মেমোতে কোনো পণ্য নেই!');
      return;
    }

    triggerHaptic('success');
    playNativeChime('success');

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    
    // Execute POS sale with stock deduction
    const finalizedSale = executePOSSale(tenant.id, {
      invoiceNo,
      customerName: customerName || 'নগদ ক্রেতা',
      items: items.map(it => ({
        id: it.id,
        name: it.name,
        unit: it.unit,
        quantity: it.quantity,
        price: it.unitPrice,
        total: it.totalPrice
      })),
      subtotal,
      discount,
      total: totalAmount,
      paidAmount: totalAmount,
      dueAmount: 0,
      paymentMethod: 'cash'
    });

    refreshVault();

    const announcement = `আলহামদুলিল্লাহ! ${totalAmount} টাকার মেমো সফলভাবে সম্পন্ন হয়েছে।`;
    speakNativeText(announcement);

    onCompleteSale(finalizedSale);
    onClose();
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer,
          {
            backgroundColor: isDark ? '#111827' : '#ffffff',
            paddingBottom: insets.bottom + 20
          }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.micBadge, { backgroundColor: primaryColor }]}>
                <Text style={styles.micBadgeIcon}>🎙️</Text>
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: isDark ? '#f9fafb' : '#111827' }]}>
                  আল্ট্রা ভয়েস মেমো (Voice POS)
                </Text>
                <Text style={styles.modalSubtitle}>হ্যান্ডস-ফ্রি বাংলা ভয়েস বিক্রয় কাউন্টার</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Feedback Bar */}
          <View style={[
            styles.feedbackBox,
            {
              backgroundColor: isDark ? '#1f2937' : '#f0fdf4',
              borderColor: isDark ? '#374151' : '#bbf7d0'
            }
          ]}>
            <Text style={[styles.feedbackText, { color: isDark ? '#86efac' : '#166534' }]}>
              🗣️ {feedbackText}
            </Text>
          </View>

          {/* Voice Input Field */}
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                  color: isDark ? '#f9fafb' : '#111827',
                  borderColor: isDark ? '#374151' : '#d1d5db'
                }
              ]}
              placeholder="মুখে বলুন বা লিখুন (যেমন: ২ কেজি চিনি)..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => parseVoiceInput(inputText)}
            />
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: primaryColor }]}
              onPress={() => parseVoiceInput(inputText)}
            >
              <Text style={styles.actionBtnText}>যোগ ▶</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Voice Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {quickVoiceChips.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                    borderColor: isDark ? '#374151' : '#e5e7eb'
                  }
                ]}
                onPress={() => parseVoiceInput(chip.cmd)}
              >
                <Text style={[styles.chipText, { color: isDark ? '#e5e7eb' : '#374151' }]}>
                  🎙️ {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Parsed Items List */}
          <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🛒</Text>
                <Text style={[styles.emptyText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  কোনো পণ্য এখনো যোগ করা হয়নি। উপরের ভয়েস বাটনে চাপুন অথবা মুখে বলুন।
                </Text>
              </View>
            ) : (
              items.map(it => (
                <View
                  key={it.id}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                      borderColor: isDark ? '#374151' : '#e5e7eb'
                    }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: isDark ? '#f9fafb' : '#111827' }]}>
                      {it.name}
                    </Text>
                    <Text style={styles.itemSub}>
                      ৳{it.unitPrice} × {it.quantity} {it.unit}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: primaryColor }]}>
                    ৳{it.totalPrice}
                  </Text>
                  <TouchableOpacity onPress={() => removeItem(it.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Bill Summary & Finalize Action */}
          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1f2937' : '#f8fafc' }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>কাস্টমার:</Text>
              <Text style={[styles.summaryVal, { color: isDark ? '#f9fafb' : '#111827' }]}>{customerName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>মোট মালামাল:</Text>
              <Text style={[styles.summaryVal, { color: isDark ? '#f9fafb' : '#111827' }]}>৳{subtotal}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#ef4444' }]}>ছাড় (ডিসকাউন্ট):</Text>
                <Text style={[styles.summaryVal, { color: '#ef4444' }]}>-৳{discount}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#e5e7eb', paddingTop: 6, marginTop: 4 }]}>
              <Text style={[styles.totalLabel, { color: isDark ? '#f9fafb' : '#111827' }]}>সর্বমোট প্রদেয়:</Text>
              <Text style={[styles.totalVal, { color: primaryColor }]}>৳{totalAmount}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: primaryColor },
                items.length === 0 && { opacity: 0.5 }
              ]}
              disabled={items.length === 0}
              onPress={handleFinalizeSale}
            >
              <Text style={styles.submitBtnText}>✅ মেমো সম্পন্ন ও প্রিন্ট করুন (৳{totalAmount})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: '88%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  micBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  micBadgeIcon: {
    fontSize: 18
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700'
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtnText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: 'bold'
  },
  feedbackBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '700'
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600'
  },
  actionBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13
  },
  chipRow: {
    marginBottom: 12,
    maxHeight: 38
  },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700'
  },
  itemList: {
    maxHeight: 200,
    marginBottom: 12
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '800'
  },
  itemSub: {
    fontSize: 11.5,
    color: '#6b7280',
    marginTop: 2
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '900',
    marginRight: 10
  },
  deleteBtn: {
    padding: 4
  },
  deleteBtnText: {
    fontSize: 16
  },
  summaryCard: {
    borderRadius: 14,
    padding: 12
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  summaryVal: {
    fontSize: 12.5,
    fontWeight: '700'
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '900'
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900'
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900'
  }
});
