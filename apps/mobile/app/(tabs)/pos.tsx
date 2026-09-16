import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import { getLocalVaultData, saveLocalVaultSnapshot } from '../../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../../src/lib/offlineAudioEngine';

export default function PosScreen() {
  const { tenant, theme, speakAnnouncement } = useAuth();
  const { cart, subtotal, discount, totalAmount, paidAmount, dueAmount, customerName, addToCart, removeFromCart, updateQuantity, setDiscount, setPaidAmount, setCustomerInfo, clearCart } = useCart();
  const vault = getLocalVaultData(tenant.id);
  const products = vault.products || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [voiceInput, setVoiceInput] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const filteredProducts = products.filter(p =>
    (p.banglaName || p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Quick Voice Memo Parser (e.g. "চিনি ১ কেজি" or "নাপা ২ পাতা")
  const handleVoiceCommandSubmit = (spoken: string) => {
    const text = spoken.trim();
    if (!text) return;

    setVoiceInput('');
    playNativeChime('beep');

    // Check item match
    let found = products.find(p => text.toLowerCase().includes((p.banglaName || p.name || '').toLowerCase()));
    if (found) {
      addToCart(found, 1);
      speakNativeText(`${found.banglaName || found.name} মেমোতে যোগ হয়েছে`);
    } else {
      speakNativeText('পণ্যটি মেমোতে যোগ করা সম্ভব হয়নি। তালিকা থেকে স্পর্শ করুন।');
    }
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      Alert.alert('সতর্কতা', 'মেমোতে কোনো পণ্য নেই!');
      return;
    }

    const saleRecord = {
      id: `sale-off-${Date.now()}`,
      tenantId: tenant.id,
      items: [...cart],
      totalAmount,
      paidAmount: paidAmount || totalAmount,
      dueAmount,
      customerName,
      createdAt: new Date().toISOString()
    };

    const currentSales = vault.sales || [];
    saveLocalVaultSnapshot(tenant.id, {
      sales: [saleRecord, ...currentSales]
    });

    playNativeChime('cash');
    speakAnnouncement(`মোট ৳${totalAmount} টাকা বিক্রি সম্পন্ন হয়েছে`);
    Alert.alert('সফল!', `✓ মেমো সফলভাবে সংরক্ষিত হয়েছে!\nমোট মূল্য: ৳${totalAmount} টাকা`);
    clearCart();
  };

  return (
    <View style={styles.container}>
      {/* 🎙️ Voice & Text Command Bar */}
      <View style={styles.voiceBar}>
        <TextInput
          style={styles.voiceInput}
          placeholder="মুখে বলুন বা লিখুন (যেমন: চিনি ১ কেজি)..."
          placeholderTextColor="#94a3b8"
          value={voiceInput}
          onChangeText={setVoiceInput}
          onSubmitEditing={() => handleVoiceCommandSubmit(voiceInput)}
        />
        <TouchableOpacity
          style={[styles.voiceBtn, { backgroundColor: theme.primaryColor }]}
          onPress={() => handleVoiceCommandSubmit(voiceInput)}
        >
          <Text style={styles.voiceBtnText}>যোগ +</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 Product Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="🔍 পণ্য বা বারকোড খুঁজুন..."
        placeholderTextColor="#94a3b8"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* 🏷️ Product Catalog Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prodScroll}>
        {filteredProducts.map((p, idx) => (
          <TouchableOpacity
            key={p.id || idx}
            style={styles.prodCard}
            onPress={() => {
              playNativeChime('beep');
              addToCart(p, 1);
            }}
          >
            <Text style={styles.prodName}>{p.banglaName || p.name}</Text>
            <Text style={styles.prodPrice}>৳{p.sellingPrice} / {p.unit || 'পিস'}</Text>
            <Text style={styles.prodStock}>স্টক: {p.stock} {p.unit || 'পিস'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 🛒 Live Cart Table */}
      <View style={styles.cartContainer}>
        <View style={styles.cartHeader}>
          <Text style={styles.cartTitle}>🛒 মেমোর মালামাল ({cart.length} টি)</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearBtnText}>সব মুছুন</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.cartList}>
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyText}>মেমো খালি! উপরের পণ্য স্পর্শ করুন বা মুখে বলুন</Text>
            </View>
          ) : (
            cart.map(item => (
              <View key={item.id} style={styles.cartRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.banglaName || item.name}</Text>
                  <Text style={styles.itemRate}>৳{item.unitPrice} × {item.quantity} {item.unit}</Text>
                </View>
                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemTotal}>৳{item.totalPrice}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* 💵 Bottom Checkout Bar */}
        <View style={styles.checkoutBar}>
          <View>
            <Text style={styles.totalLabel}>সর্বমোট মূল্য</Text>
            <Text style={styles.totalValue}>৳{totalAmount}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: cart.length > 0 ? '#10b981' : '#94a3b8' }]}
            disabled={cart.length === 0}
            onPress={handleCompleteSale}
          >
            <Text style={styles.checkoutBtnText}>✓ মেমো তৈরি ও প্রিন্ট</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 14,
    paddingBottom: 90
  },
  voiceBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
  },
  voiceInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '600'
  },
  voiceBtn: {
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  voiceBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13
  },
  searchBar: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12.5,
    marginBottom: 10
  },
  prodScroll: {
    maxHeight: 100,
    marginBottom: 12
  },
  prodCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 10,
    marginRight: 10,
    width: 125,
    justifyContent: 'center'
  },
  prodName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a'
  },
  prodPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2
  },
  prodStock: {
    fontSize: 10.5,
    color: '#64748b'
  },
  cartContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    elevation: 2
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8
  },
  cartTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a'
  },
  clearBtnText: {
    fontSize: 11.5,
    color: '#ef4444',
    fontWeight: '700'
  },
  cartList: {
    flex: 1
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center'
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b'
  },
  itemRate: {
    fontSize: 11,
    color: '#64748b'
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10
  },
  qtyBtn: {
    backgroundColor: '#f1f5f9',
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155'
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '800'
  },
  itemTotal: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0f172a'
  },
  checkoutBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#e2e8f0'
  },
  totalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700'
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669'
  },
  checkoutBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800'
  }
});
