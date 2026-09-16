import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { playNativeChime } from '../../src/lib/offlineAudioEngine';

export default function MoreScreen() {
  const router = useRouter();
  const { tenant, theme, isSoundboxEnabled, toggleSoundbox } = useAuth();

  const menuItems = [
    { title: 'দোকান খরচ', desc: 'দৈনিক চা, নাস্তা ও বিদ্যুৎ বিল', icon: '☕', route: '/expenses', color: '#ea580c' },
    { title: 'বিক্রি ও লাভ রিপোর্ট', desc: 'দৈনিক ও মাসিক আর্থিক হিসাব', icon: '📊', route: '/reports', color: '#059669' },
    { title: 'পণ্য ক্যাটালগ', desc: 'পণ্য এডিট ও নতুন বারকোড', icon: '🏷️', route: '/products', color: '#2563eb' },
    { title: 'দোকান সেটিংস', desc: 'দোকানের নাম, প্রিন্টার ও থিম', icon: '⚙️', route: '/settings', color: '#7c3aed' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 🏪 Profile Summary */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{theme.icon}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.shopName}>{tenant.shopName}</Text>
          <Text style={styles.ownerText}>{tenant.ownerName} ({theme.name})</Text>
        </View>
      </View>

      {/* 🔊 Soundbox Master Switch */}
      <TouchableOpacity style={styles.soundboxCard} onPress={toggleSoundbox}>
        <View style={styles.soundboxLeft}>
          <Text style={styles.soundboxIcon}>{isSoundboxEnabled ? '🔊' : '🔇'}</Text>
          <View>
            <Text style={styles.soundboxTitle}>ডিজিটাল সাউন্ডবক্স</Text>
            <Text style={styles.soundboxSub}>
              {isSoundboxEnabled ? 'সক্রিয় (প্রতি বিক্রিতে বাংলায় টাকা বলবে)' : 'বন্ধ রয়েছে'}
            </Text>
          </View>
        </View>
        <Text style={[styles.switchBadge, { color: isSoundboxEnabled ? '#059669' : '#64748b' }]}>
          {isSoundboxEnabled ? 'ON' : 'OFF'}
        </Text>
      </TouchableOpacity>

      {/* 📋 Menu Grid */}
      <Text style={styles.sectionHeader}>সকল ফিচার ও মডিউল</Text>
      {menuItems.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.menuRow}
          onPress={() => {
            playNativeChime('beep');
            router.push(item.route as any);
          }}
        >
          <View style={[styles.iconBox, { backgroundColor: item.color }]}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuDesc}>{item.desc}</Text>
          </View>
          <Text style={styles.chevron}>➔</Text>
        </TouchableOpacity>
      ))}
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
    paddingBottom: 110
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 24
  },
  profileInfo: {
    flex: 1
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a'
  },
  ownerText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  soundboxCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#bbf7d0'
  },
  soundboxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  soundboxIcon: {
    fontSize: 26
  },
  soundboxTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a'
  },
  soundboxSub: {
    fontSize: 11.5,
    color: '#059669',
    marginTop: 2,
    fontWeight: '600'
  },
  switchBadge: {
    fontSize: 14,
    fontWeight: '900'
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 12
  },
  menuRow: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  menuIcon: {
    fontSize: 20
  },
  menuText: {
    flex: 1
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  menuDesc: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2
  },
  chevron: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '800'
  }
});
