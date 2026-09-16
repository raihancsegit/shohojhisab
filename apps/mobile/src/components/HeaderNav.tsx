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

export default function HeaderNav({ title }: { title?: string }) {
  const {
    tenant,
    theme,
    activeRoleMode,
    isSoundboxEnabled,
    toggleSoundbox,
    triggerHaptic
  } = useAuth();

  const { openDrawer, openShopModal, openStaffModal } = useNav();
  const router = useRouter();

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.primaryColor || '#059669' }]}>
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

        {/* Right: Controls (Role, Soundbox, Bell) */}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hamburgerIcon: {
    fontSize: 20,
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
    gap: 4,
  },
  shopName: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '900',
    maxWidth: 130,
  },
  shopDownArrow: {
    color: '#93c5fd',
    fontSize: 9,
  },
  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  industryTag: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  roleIcon: {
    fontSize: 12,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  roleArrow: {
    color: '#ffffff',
    fontSize: 8,
    opacity: 0.7,
  },
  soundboxActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.45)',
    borderColor: 'rgba(165, 180, 252, 0.6)',
  },
  soundboxIcon: {
    fontSize: 16,
  },
  bellIcon: {
    fontSize: 16,
  },
  notifDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f43f5e',
  },
});
