import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { INDUSTRY_CATEGORIES } from '../src/lib/industryConfig';
import { playNativeChime } from '../src/lib/offlineAudioEngine';

export default function SettingsScreen() {
  const { tenant, theme, setIndustryId, isSoundboxEnabled, toggleSoundbox } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 🏪 Shop Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>দোকানের প্রোফাইল</Text>
        <Text style={styles.fieldLabel}>দোকানের নাম</Text>
        <Text style={styles.fieldVal}>{tenant.shopName}</Text>

        <Text style={styles.fieldLabel}>মালিকের নাম</Text>
        <Text style={styles.fieldVal}>{tenant.ownerName}</Text>

        <Text style={styles.fieldLabel}>মোবাইল নম্বর</Text>
        <Text style={styles.fieldVal}>{tenant.phone}</Text>
      </View>

      {/* 🏷️ Industry Category Picker */}
      <Text style={styles.sectionTitle}>দোকানের ক্যাটাগরি ও থিম পরিবর্তন</Text>
      <View style={styles.grid}>
        {Object.values(INDUSTRY_CATEGORIES).map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.catCard,
              tenant.industryId === cat.id && { borderColor: cat.primaryColor, borderWidth: 2, backgroundColor: '#f0fdf4' }
            ]}
            onPress={() => {
              playNativeChime('beep');
              setIndustryId(cat.id);
            }}
          >
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={styles.catName}>{cat.name}</Text>
            {tenant.industryId === cat.id && (
              <Text style={[styles.activeBadge, { color: cat.primaryColor }]}>সক্রিয় ✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* 🔊 Soundbox Switch */}
      <TouchableOpacity style={styles.card} onPress={toggleSoundbox}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>ডিজিটাল সাউন্ডবক্স</Text>
            <Text style={styles.subText}>বিক্রি বা জমা হলে বাংলায় কথা বলবে</Text>
          </View>
          <Text style={[styles.badge, { color: isSoundboxEnabled ? '#059669' : '#64748b' }]}>
            {isSoundboxEnabled ? 'চালু (ON)' : 'বন্ধ (OFF)'}
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8
  },
  fieldLabel: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 8
  },
  fieldVal: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '800',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 10
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16
  },
  catCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
    alignItems: 'center'
  },
  catIcon: {
    fontSize: 28,
    marginBottom: 6
  },
  catName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center'
  },
  activeBadge: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  subText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2
  },
  badge: {
    fontSize: 13,
    fontWeight: '800'
  }
});
