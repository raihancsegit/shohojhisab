import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import FloatingVoiceFab from '../src/components/FloatingVoiceFab';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#059669' },
              headerTintColor: '#ffffff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="expenses" options={{ title: 'দোকান খরচ' }} />
            <Stack.Screen name="reports" options={{ title: 'বিক্রি ও লাভ রিপোর্ট' }} />
            <Stack.Screen name="products" options={{ title: 'পণ্য তালিকা' }} />
            <Stack.Screen name="settings" options={{ title: 'দোকান সেটিংস' }} />
          </Stack>
          <FloatingVoiceFab />
        </View>
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
