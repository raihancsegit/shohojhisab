import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';

export default function MarketingScreen() {
  const { tenant, theme, triggerHaptic, formatPrice, speakAnnouncement } = useAuth();
  const vault = getLocalVaultData();
  const [template, setTemplate] = useState<'due_reminder' | 'eid_offer' | 'friday_bazaar'>('due_reminder');
  const [notice, setNotice] = useState('');

  const dueCustomers = (vault.customers || []).filter(c => c.due > 0);
  const targetCustomers = template === 'due_reminder' ? dueCustomers : (vault.customers || []);

  const getMessagePreview = (name: string, due: number) => {
    const shopName = tenant.shopName || 'আমাদের দোকানে';
    if (template === 'due_reminder') {
      return `আসসালামু আলাইকুম ${name}, ${shopName}-এ আপনার বর্তমান বাকি ${formatPrice(due)}। দ্রুত পরিশোধের অনুরোধ করা হলো। ধন্যবাদ!`;
    }
    if (template === 'eid_offer') {
      return `ঈদ মোবারক ${name}! ${shopName}-এ ঈদের বিশেষ ছাড়ে সকল পণ্যে পাচ্ছেন আকর্ষণীয় ক্যাশব্যাক ও বিশেষ মূল্যছাড়। আজই আসুন!`;
    }
    return `সম্মানিত ${name}, আগামীকাল জুমার দিনের সাপ্তাহিক হাটে ${shopName}-এ স্পেশাল অফারে বিশেষ মূল্যছাড় চলছে!`;
  };

  const handleSendWhatsApp = (phone: string, name: string, due: number) => {
    triggerHaptic('light');
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '88' + clean;
    const text = encodeURIComponent(getMessagePreview(name, due));
    Linking.openURL(`https://wa.me/${clean}?text=${text}`);
  };

  const handleSendSMS = (phone: string, name: string, due: number) => {
    triggerHaptic('light');
    const text = encodeURIComponent(getMessagePreview(name, due));
    Linking.openURL(`sms:${phone}?body=${text}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '📢 এসএমএস ও বাকি তাগাদা',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>এসএমএস ও হোয়াটসঅ্যাপ মার্কেটিং</Text>
        <Text style={styles.bannerSub}>১-ক্লিকে গ্রাহকের মোবাইলে বকেয়া তাগাদা ও অফার পাঠান</Text>
      </View>

      {/* Template Selector */}
      <Text style={styles.sectionTitle}>মেসেজ টেমপ্লেট নির্বাচন করুন</Text>
      <View style={styles.templateRow}>
        <TouchableOpacity
          style={[styles.templateBtn, template === 'due_reminder' && styles.templateBtnActive]}
          onPress={() => setTemplate('due_reminder')}
        >
          <Text style={[styles.templateBtnText, template === 'due_reminder' && styles.templateBtnTextActive]}>
            🔴 বাকি আদায়ের তাগাদা
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.templateBtn, template === 'eid_offer' && styles.templateBtnActive]}
          onPress={() => setTemplate('eid_offer')}
        >
          <Text style={[styles.templateBtnText, template === 'eid_offer' && styles.templateBtnTextActive]}>
            🎉 বিশেষ ছাড়ের অফার
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.templateBtn, template === 'friday_bazaar' && styles.templateBtnActive]}
          onPress={() => setTemplate('friday_bazaar')}
        >
          <Text style={[styles.templateBtnText, template === 'friday_bazaar' && styles.templateBtnTextActive]}>
            🛍️ সাপ্তাহিক হাট অফার
          </Text>
        </TouchableOpacity>
      </View>

      {/* Message Preview Box */}
      <View style={styles.previewBox}>
        <Text style={styles.previewLabel}>নমুনা প্রিভিউ:</Text>
        <Text style={styles.previewText}>
          "{getMessagePreview('রহিম মিয়া', 1500)}"
        </Text>
      </View>

      {/* Recipients List */}
      <Text style={styles.sectionTitle}>
        প্রাপক গ্রাহক তালিকা ({targetCustomers.length} জন)
      </Text>

      {targetCustomers.map(cust => (
        <View key={cust.id} style={styles.customerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.custName}>{cust.name}</Text>
            <Text style={styles.custPhone}>📱 {cust.phone}</Text>
            {cust.due > 0 && (
              <Text style={styles.custDue}>বকেয়া: {formatPrice(cust.due)}</Text>
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.waBtn}
              onPress={() => handleSendWhatsApp(cust.phone, cust.name, cust.due)}
            >
              <Text style={styles.waBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smsBtn}
              onPress={() => handleSendSMS(cust.phone, cust.name, cust.due)}
            >
              <Text style={styles.smsBtnText}>✉️ SMS</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, gap: 12 },
  banner: { backgroundColor: '#1e1b4b', padding: 18, borderRadius: 16 },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 6 },
  templateRow: { gap: 8 },
  templateBtn: { padding: 12, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e2e8f0' },
  templateBtnActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  templateBtnText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  templateBtnTextActive: { color: '#4f46e5', fontWeight: '900' },
  previewBox: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  previewLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 4 },
  previewText: { fontSize: 13, color: '#0f172a', fontStyle: 'italic', lineHeight: 18 },
  customerCard: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  custName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  custPhone: { fontSize: 11.5, color: '#64748b' },
  custDue: { fontSize: 12, color: '#dc2626', fontWeight: '800', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  waBtn: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  waBtnText: { color: '#16a34a', fontWeight: '800', fontSize: 11.5 },
  smsBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smsBtnText: { color: '#2563eb', fontWeight: '800', fontSize: 11.5 },
});
