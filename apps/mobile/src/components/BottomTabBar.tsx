import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';

export interface CustomBottomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  descriptors: Record<string, any>;
  navigation: {
    navigate: (name: string) => void;
    emit: (event: any) => any;
  };
}

export default function BottomTabBar({ state, descriptors, navigation }: CustomBottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, triggerHaptic } = useAuth();
  const { openActionSheet } = useNav();
  const isDark = themeMode === 'dark';

  // Compute safe bottom padding based on device navigation bar (hardware/soft 3-button or gesture bar)
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 14 : 20);
  const bottomPadding = bottomInset + (Platform.OS === 'android' ? 10 : 6);
  const tabHeight = 58 + bottomPadding;

  // Tab configurations: index, khata, [CENTER PLUS], stock, pos
  const tabs = [
    { name: 'index', label: 'হোম', icon: '🏠', routeIndex: 0 },
    { name: 'khata', label: 'খাতা', icon: '📒', routeIndex: 2 },
    { name: 'center_action', label: 'নতুন', isCenter: true },
    { name: 'stock', label: 'স্টক', icon: '📦', routeIndex: 3 },
    { name: 'pos', label: 'বিক্রি', icon: '🛒', routeIndex: 1 },
  ];

  const primaryColor = theme.primaryColor || '#059669';

  return (
    <View style={[
      styles.tabContainer,
      {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
        height: tabHeight,
        paddingBottom: bottomPadding,
      }
    ]}>
      {tabs.map((tab) => {
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key="center_plus"
              style={[
                styles.centerButton,
                {
                  backgroundColor: primaryColor,
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

        const activeColor = primaryColor;
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
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 16,
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
    marginTop: -34,
    borderWidth: 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  centerButtonText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '900',
    marginTop: -2,
  },
});

