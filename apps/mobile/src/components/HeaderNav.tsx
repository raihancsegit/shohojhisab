import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

export default function HeaderNav() {
  const {
    tenant,
    theme,
    themeMode,
    toggleThemeMode,
    activeRoleMode,
    isSoundboxEnabled,
    toggleSoundbox,
    triggerHaptic
  } = useAuth();

  const { openDrawer, openShopModal, openStaffModal } = useNav();
  const router = useRouter();
  const isDark = themeMode === 'dark';

  return (
    <View style={[
      styles.headerContainer,
      { backgroundColor: isDark ? '#0f172a' : (theme.primaryColor || '#059669') }
    ]}>
      <View style={styles.headerRow}>
        {/* Left: Hamburger & Shop Info */}
        <View style={styles.leftGroup}>
          {/* Hamburger Menu Button */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              triggerHaptic('light');
              openDrawer();
            }}
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>

          {/* Shop Selector */}
          <TouchableOpacity
            style={styles.shopSelector}
            onPress={() => {
              triggerHaptic('light');
              openShopModal();
            }}
          >
            <View style={styles.shopAvatar}>
              <Text style={styles.shopAvatarText}>{theme.icon || '🏪'}</Text>
            </View>
            <View style={styles.shopInfo}>
              <View style={styles.shopTitleRow}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {tenant?.shopName || 'সহজ হিসাব'}
                </Text>
                <Text style={styles.shopDownArrow}>▼</Text>
              </View>
              <View style={styles.shopMetaRow}>
                <View style={styles.greenDot} />
                <Text style={styles.industryTag}>{theme.name || 'মুদি দোকান'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Right: Controls (Role, Soundbox, Theme Toggle, Bell) */}
        <View style={styles.rightGroup}>
          {/* Staff/Owner Mode Pill */}
          <TouchableOpacity
            style={styles.rolePill}
            onPress={() => {
              triggerHaptic('light');
              openStaffModal();
            }}
          >
            <Text style={styles.roleIcon}>{activeRoleMode === 'owner' ? '👑' : '👤'}</Text>
            <Text style={styles.roleText}>{activeRoleMode === 'owner' ? 'মালিক' : 'স্টাফ'}</Text>
            <Text style={styles.roleArrow}>▼</Text>
          </TouchableOpacity>

          {/* Dark / Light Mode Toggle */}
          <TouchableOpacity
            style={[
              styles.iconBtn,
              isDark && styles.themeBtnDark
            ]}
            onPress={toggleThemeMode}
          >
            <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          {/* Soundbox Master Switch */}
          <TouchableOpacity
            style={[
              styles.iconBtn,
              isSoundboxEnabled && styles.soundboxActive
            ]}
            onPress={toggleSoundbox}
          >
            <Text style={styles.soundboxIcon}>{isSoundboxEnabled ? '🔊' : '🔈'}</Text>
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              triggerHaptic('light');
              router.push('/notifications');
            }}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hamburgerIcon: {
    fontSize: 19,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  shopSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  shopAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopAvatarText: {
    fontSize: 18,
  },
  shopInfo: {
    flex: 1,
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  shopName: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    maxWidth: 110,
  },
  shopDownArrow: {
    color: '#93c5fd',
    fontSize: 8.5,
  },
  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  industryTag: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  roleIcon: {
    fontSize: 11.5,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  roleArrow: {
    color: '#ffffff',
    fontSize: 8,
    opacity: 0.8,
  },
  themeBtnDark: {
    backgroundColor: 'rgba(253, 224, 71, 0.25)',
    borderColor: 'rgba(253, 224, 71, 0.4)',
  },
  themeIcon: {
    fontSize: 15,
  },
  soundboxActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.45)',
    borderColor: 'rgba(165, 180, 252, 0.6)',
  },
  soundboxIcon: {
    fontSize: 15,
  },
  bellIcon: {
    fontSize: 15,
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f43f5e',
  },
});
