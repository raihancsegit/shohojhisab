import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot } from '../src/lib/offlineDataVault';

interface ScannedChallanItem {
  name: string;
  qty: number;
  unit: string;
  costPrice: number;
  total: number;
}

const DEMO_DETECTED_ITEMS: ScannedChallanItem[] = [
  { name: 'ফ্রেশ সয়াবিন তেল ১ লিটার', qty: 24, unit: 'বোতল', costPrice: 175, total: 4200 },
  { name: 'তীর আটা ২ কেজি প্যাকেট', qty: 15, unit: 'প্যাকেট', costPrice: 115, total: 1725 },
  { name: 'মিনিকেট চাল প্রিমিয়াম ৫০ কেজি', qty: 2, unit: 'বস্তা', costPrice: 3400, total: 6800 },
  { name: 'চিনি দেশি খোলা ১ কেজি', qty: 50, unit: 'কেজি', costPrice: 125, total: 6250 }
];

export default function ChallanOcrScreen() {
  const { tenant, theme, triggerHaptic, speakAnnouncement, formatPrice } = useAuth();
  const router = useRouter();
  const vault = getLocalVaultData();
  const [isScanning, setIsScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState<ScannedChallanItem[]>([]);

  const handleSimulateScan = () => {
    triggerHaptic('medium');
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setDetectedItems(DEMO_DETECTED_ITEMS);
      triggerHaptic('success');
      speakAnnouncement(`চালান স্ক্যান সম্পন্ন! ৪টি আইটেম এবং মোট ১৮,৯৭৫ টাকা শনাক্ত হয়েছে`);
    }, 1500);
  };

  const handleImportToStock = () => {
    if (detectedItems.length === 0) return;
    triggerHaptic('success');

    // Add detected quantities to vault products or create new products
    detectedItems.forEach(item => {
      const match = vault.products.find(p => p.name.includes(item.name.split(' ')[0]));
      if (match) {
        match.stock += item.qty;
        match.costPrice = item.costPrice;
      }
    });

    saveLocalVaultSnapshot(tenant.id, vault);
    speakAnnouncement(`চালানের সমস্ত মাল সফলভাবে স্টকে যোগ করা হয়েছে`);
    router.push('/stock');
  };

  const totalInvoice = detectedItems.reduce((sum, i) => sum + i.total, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '📸 চালান স্ক্যানার (OCR)',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>📸</Text>
        <Text style={styles.bannerTitle}>স্মার্ট ক্যামেরা চালান স্ক্যানার</Text>
        <Text style={styles.bannerSub}>হাতে লেখা বা প্রিন্টেড ডিলার চালানের ছবি তুলে ১-ক্লিকে স্টকে মাল তুলুন</Text>
      </View>

      {/* Camera Capture Placeholder */}
      <View style={styles.cameraBox}>
        <Text style={styles.cameraIcon}>📷</Text>
        <Text style={styles.cameraText}>চালানের স্পষ্ট ছবি ক্যামেরায় তুলুন</Text>
        <TouchableOpacity
          style={[styles.captureBtn, isScanning && { backgroundColor: '#94a3b8' }]}
          onPress={handleSimulateScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.captureBtnText}>⚡ চালানের ছবি স্ক্যান করুন</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Detected Results */}
      {detectedItems.length > 0 && (
        <View style={styles.resultsCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>📋 শনাক্তকৃত পণ্য তালিকা ({detectedItems.length} টি)</Text>
            <Text style={styles.resultTotal}>{formatPrice(totalInvoice)}</Text>
          </View>

          {detectedItems.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>পরিমাণ: {item.qty} {item.unit} × {formatPrice(item.costPrice)}</Text>
              </View>
              <Text style={styles.itemTotal}>{formatPrice(item.total)}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.importBtn} onPress={handleImportToStock}>
            <Text style={styles.importBtnText}>📥 স্টকে মাল যোগ করুন ও চালান সেভ করুন</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, gap: 12 },
  banner: { backgroundColor: '#1e1b4b', padding: 20, borderRadius: 16, alignItems: 'center' },
  bannerEmoji: { fontSize: 32, marginBottom: 4 },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 2, textAlign: 'center' },
  cameraBox: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', alignItems: 'center' },
  cameraIcon: { fontSize: 40, marginBottom: 8 },
  cameraText: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 14 },
  captureBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  captureBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13.5 },
  resultsCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#f1f5f9', paddingBottom: 10, marginBottom: 10 },
  resultTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  resultTotal: { fontSize: 16, fontWeight: '900', color: '#16a34a' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemName: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  itemMeta: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: '#4f46e5' },
  importBtn: { marginTop: 14, backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  importBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
});
