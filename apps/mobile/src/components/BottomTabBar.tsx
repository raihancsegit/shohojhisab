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
  const { theme, triggerHaptic } = useAuth();
  const { openActionSheet } = useNav();

  // Tab configurations: index, khata, [CENTER PLUS], stock, pos
  const tabs = [
    { name: 'index', label: 'হোম', icon: '🏠', routeIndex: 0 },
    { name: 'khata', label: 'খাতা', icon: '📒', routeIndex: 2 },
    { name: 'center_action', label: 'নতুন', isCenter: true },
    { name: 'stock', label: 'স্টক', icon: '📦', routeIndex: 3 },
    { name: 'pos', label: 'বিক্রি', icon: '🛒', routeIndex: 1 },
  ];

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab, idx) => {
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key="center_plus"
              style={[
                styles.centerButton,
                { backgroundColor: theme.primaryColor || '#4f46e5' }
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

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, isFocused && { transform: [{ scale: 1.1 }] }]}>
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? (theme.primaryColor || '#4f46e5') : '#64748b' },
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
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
    paddingTop: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 40,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
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
    marginTop: -28,
    borderWidth: 3.5,
    borderColor: '#ffffff',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
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
