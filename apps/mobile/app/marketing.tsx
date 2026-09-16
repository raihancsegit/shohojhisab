import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';

export default function MarketingScreen() {
  const { tenant, theme, triggerHaptic, formatPrice, speakAnnouncement } = useAuth();
  const vault = getLocalVaultData();
  const [template, setTemplate] = useState<'due_reminder' | 'eid_offer' | 'friday_bazaar'>('due_reminder');
  const [notice, setNotice] = useState('');

  const dueCustomers = (vault.customers || []).filter(c => Number(c.totalDue || c.due || 0) > 0);
  const targetCustomers = template === 'due_reminder' ? dueCustomers : (vault.customers || []);

  const getMessagePreview = (name: string, due: number) => {
    const shopName = tenant.shopName || 'আমাদের দোকানে';
    if (template === 'due_reminder') {
      return `আসসালামু আলাইকুম ${name}, ${shopName}-এ আপনার বর্তমান বাকি ${formatPrice(due)}। দ্রুত পরিশোধের অনুরোধ করা হলো। ধন্যবাদ!`;
    }
    if (template === 'eid_offer') {
      return `ঈদ মোবারক ${name}! ${shopName}-এ ঈদের বিশেষ ছাড়ে সকল পণ্যে পাচ্ছেন আকর্ষণীয় ক্যাশব্যাক ও বিশেষ মূল্যছাড়। আজই আসুন!`;
    }
    return `শুক্রবার স্পেশাল বাজার অফার! ${shopName}-এ আজই এসে বাজার করুন ও সেরা ডিসকাউন্ট উপভোগ করুন।`;
  };

  const handleSendWhatsApp = (phone: string, name: string, due = 0) => {
    triggerHaptic('success');
    const msg = getMessagePreview(name, due);
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('হোয়াটসঅ্যাপ পাওয়া যায়নি', 'অনুগ্রহ করে ফোনে WhatsApp ইনস্টল করুন।');
    });
  };

  const handleSendSMS = (phone: string, name: string, due = 0) => {
    triggerHaptic('light');
    const msg = getMessagePreview(name, due);
    Linking.openURL(`sms:${phone}?body=${encodeURIComponent(msg)}`);
  };

  const primaryColor = theme.primaryColor || '#059669';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: 'মার্কেটিং ও মেসেজিং',
          headerStyle: { backgroundColor: primaryColor },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '900' }
        }}
      />

      {/* Header Info */}
      <View style={[styles.headerCard, { backgroundColor: primaryColor }]}>
        <Text style={styles.headerTitle}>📢 গ্রাহক অফার ও বকেয়া তাগাদা</Text>
        <Text style={styles.headerSub}>১-ট্যাপে সকল বাকি গ্রাহক অথবা সকল কাস্টমারকে এসএমএস ও হোয়াটসঅ্যাপে পাঠান</Text>
      </View>

      {/* Template Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, template === 'due_reminder' && { backgroundColor: primaryColor }]}
          onPress={() => setTemplate('due_reminder')}
        >
          <Text style={[styles.tabText, template === 'due_reminder' && styles.tabTextActive]}>
            🔔 বাকি তাগাদা ({dueCustomers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, template === 'eid_offer' && { backgroundColor: primaryColor }]}
          onPress={() => setTemplate('eid_offer')}
        >
          <Text style={[styles.tabText, template === 'eid_offer' && styles.tabTextActive]}>
            🌙 ঈদ অফার
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, template === 'friday_bazaar' && { backgroundColor: primaryColor }]}
          onPress={() => setTemplate('friday_bazaar')}
        >
          <Text style={[styles.tabText, template === 'friday_bazaar' && styles.tabTextActive]}>
            🛍️ বিশেষ ছাড়
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preview Card */}
      <View style={styles.previewBox}>
        <Text style={styles.previewLabel}>মেসেজ প্রিভিউ:</Text>
        <Text style={styles.previewText}>{getMessagePreview('গ্রাহকের নাম', 500)}</Text>
      </View>

      {/* Customers List */}
      <Text style={styles.listTitle}>
        {template === 'due_reminder' ? 'বকেয়া গ্রাহকদের তালিকা' : 'সকল গ্রাহকদের তালিকা'} ({targetCustomers.length} জন)
      </Text>

      {targetCustomers.map(cust => {
        const custDue = Number(cust.totalDue || cust.due || 0);
        return (
          <View key={cust.id} style={styles.customerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.custName}>{cust.name}</Text>
              <Text style={styles.custPhone}>📱 {cust.phone}</Text>
              {custDue > 0 && (
                <Text style={styles.custDue}>বকেয়া: {formatPrice(custDue)}</Text>
              )}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.waBtn}
                onPress={() => handleSendWhatsApp(cust.phone, cust.name, custDue)}
              >
                <Text style={styles.waBtnText}>💬 WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smsBtn}
                onPress={() => handleSendSMS(cust.phone, cust.name, custDue)}
              >
                <Text style={styles.smsBtnText}>✉️ SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, gap: 12 },
  headerCard: { padding: 16, borderRadius: 16, marginBottom: 4 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 6 },
  tabBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  tabText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  tabTextActive: { color: '#ffffff', fontWeight: '900' },
  previewBox: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  previewLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 4 },
  previewText: { fontSize: 13, color: '#0f172a', fontStyle: 'italic', lineHeight: 18 },
  listTitle: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 4 },
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
