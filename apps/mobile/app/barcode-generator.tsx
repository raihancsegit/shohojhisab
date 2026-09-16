import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';

export default function BarcodeGeneratorScreen() {
  const { theme, triggerHaptic, speakAnnouncement, formatPrice } = useAuth();
  const vault = getLocalVaultData();
  const [selectedProduct, setSelectedProduct] = useState(vault.products[0] || null);
  const [copies, setCopies] = useState('10');
  const [barcodeText, setBarcodeText] = useState(selectedProduct?.barcode || '890123456789');

  const handlePrint = () => {
    triggerHaptic('success');
    speakAnnouncement(`${selectedProduct?.name || 'পণ্য'} এর ${copies} টি বারকোড লেবেল প্রিন্ট পাঠানো হয়েছে`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '🏷️ বারকোড জেনারেটর ও প্রিন্টার',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>প্রোডাক্ট বারকোড লেবেল প্রিন্টার</Text>
        <Text style={styles.bannerSub}>যেকোনো পণ্যের জন্য থার্মাল স্টিকার বা A4 শিট প্রিন্ট করুন</Text>
      </View>

      {/* Select Product */}
      <Text style={styles.sectionTitle}>পণ্য নির্বাচন করুন</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
        {vault.products.slice(0, 10).map(p => {
          const isSelected = selectedProduct?.id === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.productPill, isSelected && styles.productPillSelected]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedProduct(p);
                setBarcodeText(p.barcode || `890${Math.floor(100000000 + Math.random() * 900000000)}`);
              }}
            >
              <Text style={[styles.productPillText, isSelected && styles.productPillTextSelected]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Barcode Preview Sticker Card */}
      <View style={styles.stickerCard}>
        <Text style={styles.stickerShopTitle}>{vault.shopName || 'আমার ডিজিটাল দোকান'}</Text>
        <Text style={styles.stickerProductName}>{selectedProduct?.name}</Text>
        <Text style={styles.stickerPrice}>{formatPrice(selectedProduct?.price || 0)}</Text>

        {/* Visual Simulated Barcode Lines */}
        <View style={styles.barcodeVisual}>
          <View style={styles.barcodeLines}>
            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2].map((w, i) => (
              <View
                key={i}
                style={{
                  width: w * 2,
                  height: 48,
                  backgroundColor: '#000000',
                  marginHorizontal: 1
                }}
              />
            ))}
          </View>
          <Text style={styles.barcodeCode}>{barcodeText}</Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsCard}>
        <Text style={styles.settingLabel}>প্রিন্ট কপি সংখ্যা:</Text>
        <TextInput
          style={styles.input}
          value={copies}
          onChangeText={setCopies}
          keyboardType="numeric"
          placeholder="যেমন: ১০"
        />

        <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
          <Text style={styles.printBtnText}>🖨️ {copies} টি লেবেল স্টিকার প্রিন্ট করুন</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, gap: 12 },
  banner: { backgroundColor: '#1e1b4b', padding: 18, borderRadius: 16 },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 4 },
  productScroll: { flexDirection: 'row', paddingVertical: 4 },
  productPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8 },
  productPillSelected: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  productPillText: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  productPillTextSelected: { color: '#4f46e5', fontWeight: '900' },
  stickerCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', alignItems: 'center' },
  stickerShopTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  stickerProductName: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginVertical: 4, textAlign: 'center' },
  stickerPrice: { fontSize: 18, fontWeight: '900', color: '#16a34a', marginBottom: 12 },
  barcodeVisual: { alignItems: 'center', backgroundColor: '#ffffff', padding: 8, borderRadius: 8 },
  barcodeLines: { flexDirection: 'row', alignItems: 'center', height: 48 },
  barcodeCode: { fontSize: 13, fontWeight: '700', letterSpacing: 3, color: '#0f172a', marginTop: 6 },
  settingsCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  settingLabel: { fontSize: 12.5, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  printBtn: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  printBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
});
