import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { NavProvider } from '../src/context/NavContext';
import SideMenuDrawer from '../src/components/SideMenuDrawer';
import ActionSheetModal from '../src/components/ActionSheetModal';
import ShopSwitcherModal from '../src/components/ShopSwitcherModal';
import StaffShiftModal from '../src/components/StaffShiftModal';
import FloatingVoiceFab from '../src/components/FloatingVoiceFab';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <NavProvider>
          <View style={styles.container}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: '#4f46e5' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="dealers" options={{ title: '🛍️ ক্রয় (ডিলার খাতা)' }} />
              <Stack.Screen name="day-end" options={{ title: '🌙 ক্যাশ ড্রয়ার ও দিন শেষ' }} />
              <Stack.Screen name="installments" options={{ title: '📅 বাকির কিস্তি' }} />
              <Stack.Screen name="staff" options={{ title: '👥 কর্মচারী ও পারমিশন' }} />
              <Stack.Screen name="branches" options={{ title: '🏢 দোকানের শাখা' }} />
              <Stack.Screen name="expiry-tracker" options={{ title: '⏳ মেয়াদোত্তীর্ণ রাডার' }} />
              <Stack.Screen name="subscription" options={{ title: '💳 প্যাকেজ ও সাবস্ক্রিপশন' }} />
              <Stack.Screen name="support" options={{ title: '🎧 হেল্প এন্ড সাপোর্ট' }} />
              <Stack.Screen name="tutorials" options={{ title: '🎬 টিউটোরিয়াল ভিডিও' }} />
              <Stack.Screen name="voice-guide" options={{ title: '🎙️ ভয়েস নির্দেশিকা' }} />
              <Stack.Screen name="notifications" options={{ title: '🔔 বিজ্ঞপ্তি ও নোটিফিকেশন' }} />
              <Stack.Screen name="marketing" options={{ title: '📢 এসএমএস ও বাকি তাগাদা' }} />
              <Stack.Screen name="loyalty" options={{ title: '🎁 কাস্টমার লয়্যালটি পয়েন্ট' }} />
              <Stack.Screen name="barcode-generator" options={{ title: '🏷️ বারকোড জেনারেটর' }} />
              <Stack.Screen name="challan-ocr" options={{ title: '📸 চালান স্ক্যানার' }} />
              <Stack.Screen name="expenses" options={{ title: '💸 ব্যয় / দৈনিক খরচ' }} />
              <Stack.Screen name="reports" options={{ title: '📊 রিপোর্টস ও লাভ-ক্ষতি' }} />
              <Stack.Screen name="login" options={{ title: '🔐 লগইন / সাইন ইন', headerShown: false }} />
              <Stack.Screen name="catalog" options={{ title: '🌐 ডিজিটাল ক্যাটালগ ও মেনু' }} />
              <Stack.Screen name="ai-assistant" options={{ title: '🤖 এআই ডিজিটাল সহকারী' }} />
              <Stack.Screen name="products" options={{ title: '📦 পণ্য তালিকা ও ক্যাটালগ' }} />
              <Stack.Screen name="settings" options={{ title: '⚙️ দোকানের সেটিংস' }} />
            </Stack>



            {/* Global Modals & Navigation Overlays */}
            <SideMenuDrawer />
            <ActionSheetModal />
            <ShopSwitcherModal />
            <StaffShiftModal />
            <FloatingVoiceFab />
          </View>
        </NavProvider>
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  }
});
