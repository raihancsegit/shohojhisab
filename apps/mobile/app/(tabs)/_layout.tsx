import React from 'react';
import { Tabs } from 'expo-router';
import HeaderNav from '../../src/components/HeaderNav';
import BottomTabBar from '../../src/components/BottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        header: () => <HeaderNav />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'হোম',
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'বিক্রি',
        }}
      />
      <Tabs.Screen
        name="khata"
        options={{
          title: 'খাতা',
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'স্টক',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'অন্যান্য',
        }}
      />
    </Tabs>
  );
}
