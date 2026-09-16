import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function SubscriptionScreen() {
  const { theme, triggerHaptic, speakAnnouncement } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '💳 প্যাকেজ ও সাবস্ক্রিপশন',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* Active Package Card */}
      <View style={styles.activeCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>সক্রিয় প্যাকেজ</Text>
        </View>
        <Text style={styles.planTitle}>⚡ Pro লাইফটাইম আনলিমিটেড</Text>
        <Text style={styles.planSub}>সহজ হিসাব ফুল বিজনেস ওএস লাইফটাইম লাইসেন্স</Text>
        <View style={styles.featureList}>
          <Text style={styles.feature}>✓ ১০০% অফলাইন ও ক্যাশ ড্রয়ার মোড</Text>
          <Text style={styles.feature}>✓ স্মার্ট বাংলা ভয়েস সাউন্ডবক্স</Text>
          <Text style={styles.feature}>✓ আনলিমিটেড কাস্টমার ও বাকি খাতা</Text>
          <Text style={styles.feature}>✓ ৫টি আউটলেট ব্রাঞ্চ ও মাল্টি-স্টাফ</Text>
          <Text style={styles.feature}>✓ থার্মাল প্রিন্টার ইনভয়েস জেনারেটর</Text>
        </View>
      </View>

      {/* Pricing Cards */}
      <Text style={styles.sectionTitle}>আমাদের অন্যান্য প্ল্যানসমূহ</Text>

      <View style={styles.card}>
        <Text style={styles.cardName}>মাসিক বেসিক প্ল্যান</Text>
        <Text style={styles.cardPrice}>৳ ২৯৯ / মাস</Text>
        <Text style={styles.cardDesc}>ছোট একক দোকান ও মুদি দোকানের জন্য উপযুক্ত</Text>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            triggerHaptic('success');
            speakAnnouncement('মাসিক প্ল্যান নির্বাচন করা হয়েছে');
          }}
        >
          <Text style={styles.actionBtnText}>প্ল্যান বেছে নিন</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { borderColor: '#4f46e5', backgroundColor: '#eef2ff' }]}>
        <Text style={[styles.cardName, { color: '#4f46e5' }]}>বাৎসরিক প্রিমিয়াম (জনপ্রিয়)</Text>
        <Text style={styles.cardPrice}>৳ ২,৪৯৯ / বছর</Text>
        <Text style={styles.cardDesc}>বড় রিটেল শপ, ফার্মেসি ও হোলসেল ব্যবসার জন্য</Text>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#4f46e5' }]}
          onPress={() => {
            triggerHaptic('success');
            speakAnnouncement('বাৎসরিক প্রিমিয়াম প্ল্যান সক্রিয় হয়েছে');
          }}
        >
          <Text style={styles.actionBtnText}>সাবস্ক্রাইব করুন</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, gap: 14 },
  activeCard: { backgroundColor: '#1e1b4b', borderRadius: 20, padding: 20, position: 'relative' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#4ade80', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginBottom: 8 },
  badgeText: { color: '#0f172a', fontWeight: '900', fontSize: 11 },
  planTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  planSub: { fontSize: 12, color: '#c7d2fe', marginTop: 2, marginBottom: 14 },
  featureList: { gap: 6 },
  feature: { fontSize: 13, color: '#f1f5f9', fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginTop: 6 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#e2e8f0' },
  cardName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  cardPrice: { fontSize: 20, fontWeight: '900', color: '#16a34a', marginVertical: 4 },
  cardDesc: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  actionBtn: { backgroundColor: '#334155', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
