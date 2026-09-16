import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  StatusBar
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

const { width } = Dimensions.get('window');

interface MenuItem {
  href: string;
  label: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
}

export default function SideMenuDrawer() {
  const { tenant, activeRoleMode, logout, triggerHaptic } = useAuth();
  const { isDrawerOpen, closeDrawer, openShopModal } = useNav();
  const router = useRouter();
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    { href: '/pos', label: 'বিক্রয় (POS কাউন্টার)', icon: '🛒', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'হট', badgeBg: '#fee2e2', badgeColor: '#dc2626' },
    { href: '/khata', label: 'বাকির হিসাব (গ্রাহক খাতা)', icon: '📒', iconBg: '#ffedd5', iconColor: '#ea580c', badge: 'জরুরি', badgeBg: '#fff7ed', badgeColor: '#ea580c' },
    { href: '/installments', label: 'বাকির কিস্তি', icon: '📅', iconBg: '#e0e7ff', iconColor: '#4338ca', badge: 'কিস্তি', badgeBg: '#e0e7ff', badgeColor: '#4338ca' },
    { href: '/dealers', label: 'ক্রয় (ডিলার চালান)', icon: '🛍️', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/expenses', label: 'ব্যয় / দৈনিক খরচ', icon: '💸', iconBg: '#fef2f2', iconColor: '#dc2626' },
    { href: '/stock', label: 'পণ্য (স্টক ইনভেন্টরি)', icon: '📦', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/day-end', label: 'ক্যাশ মিলানো ও ড্রয়ার', icon: '🌙', iconBg: '#f0fdf4', iconColor: '#16a34a' },
    { href: '/staff', label: 'কর্মচারী ও পারমিশন (Staff)', icon: '👥', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'টিম', badgeBg: '#eff6ff', badgeColor: '#2563eb' },
    { href: '/branches', label: 'দোকানের শাখা (Branches)', icon: '🏢', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/expiry-tracker', label: 'মেয়াদোত্তীর্ণ রাডার (Expiry)', icon: '⏳', iconBg: '#fee2e2', iconColor: '#b91c1c' },
    { href: '/notifications', label: 'বিজ্ঞপ্তি ও নোটিফিকেশন', icon: '🔔', iconBg: '#eff6ff', iconColor: '#2563eb' },
    { href: '/marketing', label: 'এসএমএস ও বাকি তাগাদা', icon: '📢', iconBg: '#fdf2f8', iconColor: '#db2777' },
    { href: '/loyalty', label: 'লয়্যালটি ও ক্যাশব্যাক', icon: '🎁', iconBg: '#fef3c7', iconColor: '#d97706' },
    { href: '/barcode-generator', label: 'বারকোড জেনারেটর', icon: '🏷️', iconBg: '#f1f5f9', iconColor: '#475569' },
    { href: '/challan-ocr', label: 'চালান স্ক্যানার (OCR)', icon: '📸', iconBg: '#ecfdf5', iconColor: '#059669' },
    { href: '/reports', label: 'রিপোর্টস ও লাভ-ক্ষতি', icon: '📊', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/subscription', label: 'প্যাকেজ ও সাবস্ক্রিপশন', icon: '💳', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'প্যাকেজ', badgeBg: '#fef3c7', badgeColor: '#d97706' },
    { href: '/settings', label: 'দোকানের সেটিংস', icon: '⚙️', iconBg: '#f1f5f9', iconColor: '#475569' },
    { href: '/support', label: 'হেল্প এন্ড সাপোর্ট', icon: '🎧', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/tutorials', label: 'টিউটোরিয়াল ভিডিও', icon: '🎬', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'ভিডিও', badgeBg: '#ecfdf5', badgeColor: '#059669' },
    { href: '/voice-guide', label: 'ভয়েস নির্দেশিকা (কমান্ড গাইড)', icon: '🎙️', iconBg: '#ecfdf5', iconColor: '#059669', badge: 'এআই', badgeBg: '#dcfce7', badgeColor: '#16a34a' },
  ];

  const handleNavigate = (href: string) => {
    triggerHaptic('light');
    closeDrawer();
    router.push(href as any);
  };

  return (
    <Modal
      visible={isDrawerOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={closeDrawer}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop Press to Close */}
        <Pressable style={styles.backdrop} onPress={closeDrawer} />

        {/* Drawer Content */}
        <View style={styles.drawerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={closeDrawer}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Avatar with Edit Badge */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>🏪</Text>
              </View>
              <TouchableOpacity
                style={styles.editBadge}
                onPress={() => {
                  closeDrawer();
                  router.push('/settings');
                }}
              >
                <Text style={styles.editBadgeText}>✏️</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.shopTitle} numberOfLines={1}>
              {tenant?.shopName || 'আমার ডিজিটাল দোকান'}
            </Text>
            <Text style={styles.shopPhone}>
              📱 {tenant?.phone || '০১৯৮৬২৩৩২৩৪'}
            </Text>

            {/* Shop Switcher Pill */}
            <TouchableOpacity
              style={styles.shopPill}
              onPress={() => {
                closeDrawer();
                openShopModal();
              }}
            >
              <Text style={styles.shopPillText} numberOfLines={1}>
                {tenant?.shopName || 'মূল দোকান শাখা'}
              </Text>
              <Text style={styles.shopPillArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Menu Items List */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {menuItems.map((item, idx) => {
              const isActive = pathname === item.href;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.menuItem,
                    isActive && styles.menuItemActive
                  ]}
                  onPress={() => handleNavigate(item.href)}
                >
                  <View style={styles.menuLeft}>
                    <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
                      <Text style={styles.menuIcon}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                      {item.label}
                    </Text>
                  </View>

                  <View style={styles.menuRight}>
                    {item.badge && (
                      <View style={[styles.badge, { backgroundColor: item.badgeBg || '#fee2e2' }]}>
                        <Text style={[styles.badgeText, { color: item.badgeColor || '#dc2626' }]}>
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.menuArrow}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sticky Drawer Footer */}
          <View style={styles.footer}>
            <View style={styles.packageRow}>
              <View>
                <Text style={styles.packageLabel}>বর্তমান প্যাকেজ</Text>
                <Text style={styles.packageValue}>⚡ Pro / লাইফটাইম</Text>
              </View>
              <TouchableOpacity
                style={styles.subscribeBtn}
                onPress={() => {
                  closeDrawer();
                  router.push('/subscription');
                }}
              >
                <Text style={styles.subscribeBtnText}>সাবস্ক্রাইব</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.appMetaRow}>
              <Text style={styles.appName}>ShohojHisab (সহজ হিসাব)</Text>
              <Text style={styles.appVersion}>v1.0 • অফলাইন ফার্স্ট</Text>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                closeDrawer();
                logout();
              }}
            >
              <Text style={styles.logoutBtnText}>🚪 লগআউট</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerContainer: {
    width: Math.min(width * 0.85, 320),
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 40,
  },
  header: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
    width: 52,
    height: 52,
    marginBottom: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#ffffff',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  editBadgeText: {
    fontSize: 10,
  },
  shopTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
  },
  shopPhone: {
    fontSize: 11.5,
    color: '#c7d2fe',
    fontWeight: '600',
    marginBottom: 8,
  },
  shopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  shopPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 160,
  },
  shopPillArrow: {
    color: '#ffffff',
    fontSize: 9,
    opacity: 0.8,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  menuItemActive: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  menuIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 15,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flexShrink: 1,
  },
  menuLabelActive: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  menuArrow: {
    fontSize: 16,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  packageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  packageLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  packageValue: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subscribeBtn: {
    backgroundColor: '#5b50e6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  subscribeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  appMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
  },
  appVersion: {
    fontSize: 11,
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
