import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function TabLayout() {
  const { theme } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primaryColor || '#059669',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        },
        headerStyle: {
          backgroundColor: theme.primaryColor || '#059669'
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 17
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ড্যাশবোর্ড',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'POS বিক্রি',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🛒</Text>
        }}
      />
      <Tabs.Screen
        name="khata"
        options={{
          title: 'বাকির খাতা',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📖</Text>
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'স্টক',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📦</Text>
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'অন্যান্য',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text>
        }}
      />
    </Tabs>
  );
}
