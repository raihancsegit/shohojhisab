import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

export default function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme, themeMode, triggerHaptic } = useAuth();
  const { openActionSheet } = useNav();
  const isDark = themeMode === 'dark';

  // Tab configurations: index, khata, [CENTER PLUS], stock, pos
  const tabs = [
    { name: 'index', label: 'হোম', icon: '🏠', routeIndex: 0 },
    { name: 'khata', label: 'খাতা', icon: '📒', routeIndex: 2 },
    { name: 'center_action', label: 'নতুন', isCenter: true },
    { name: 'stock', label: 'স্টক', icon: '📦', routeIndex: 3 },
    { name: 'pos', label: 'বিক্রি', icon: '🛒', routeIndex: 1 },
  ];

  return (
    <View style={[
      styles.tabContainer,
      {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
      }
    ]}>
      {tabs.map((tab, idx) => {
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key="center_plus"
              style={[
                styles.centerButton,
                {
                  backgroundColor: theme.primaryColor || '#4f46e5',
                  borderColor: isDark ? '#0f172a' : '#ffffff'
                }
              ]}
              onPress={() => {
                triggerHaptic('medium');
                openActionSheet();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.centerButtonText}>＋</Text>
            </TouchableOpacity>
          );
        }

        const isFocused = state.index === tab.routeIndex;

        const onPress = () => {
          triggerHaptic('light');
          const route = state.routes[tab.routeIndex!];
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const activeColor = theme.primaryColor || '#4f46e5';
        const inactiveColor = isDark ? '#94a3b8' : '#64748b';

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, isFocused && { transform: [{ scale: 1.15 }] }]}>
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? activeColor : inactiveColor },
                isFocused && styles.tabLabelFocused
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 40,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabIcon: {
    fontSize: 21,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabelFocused: {
    fontWeight: '900',
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 3.5,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  centerButtonText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '900',
    marginTop: -2,
  },
});
