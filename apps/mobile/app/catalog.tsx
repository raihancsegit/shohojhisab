import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Linking,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';
import { playNativeChime } from '../src/lib/offlineAudioEngine';

const { width } = Dimensions.get('window');

export default function DigitalCatalogScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, triggerHaptic, formatPrice } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const vault = getLocalVaultData(tenant.id, tenant.industryId);
  const products = vault.products || [];

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  const updateCartQty = (productId: string, delta: number) => {
    triggerHaptic('light');
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalCartAmount = Object.entries(cart).reduce((acc, [pId, qty]) => {
    const prod = products.find(p => p.id === pId);
    return acc + ((prod ? (prod.price || prod.sellingPrice || 0) : 0) * qty);
  }, 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const handleSendOrderWhatsApp = () => {
    if (totalCartCount === 0 || !customerName.trim() || !customerPhone.trim()) return;

    triggerHaptic('success');
    playNativeChime('cash');

    let msg = `আসসালামু আলাইকুম ${tenant?.shopName || 'দোকান'},\n` +
      `আমি ডিজিটাল ক্যাটালগ থেকে একটি নতুন অর্ডার দিতে চাচ্ছি:\n\n` +
      `👤 কাস্টমার: ${customerName}\n` +
      `📞 মোবাইল: ${customerPhone}\n` +
      `📍 ঠিকানা: ${customerAddress || 'দোকান থেকে নিব'}\n\n` +
      `📋 অর্ডারের তালিকা:\n`;

    Object.entries(cart).forEach(([pId, qty], idx) => {
      const prod = products.find(p => p.id === pId);
      if (prod) {
        msg += `${idx + 1}. ${prod.name} (${qty} ${prod.unit || 'পিস'}) - ৳${(prod.price || 0) * qty}\n`;
      }
    });

    msg += `\n💰 সর্বমোট বিল: ৳${totalCartAmount}\n` +
      `দয়া করে অর্ডারটি কনফার্ম করুন। ধন্যবাদ!`;

    const cleanShopPhone = (tenant?.phone || '01986233234').replace(/[^0-9]/g, '');
    const url = `https://wa.me/88${cleanShopPhone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
    setShowOrderModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 🏪 Shop Header Banner */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View style={styles.shopBadge}>
          <Text style={styles.shopBadgeText}>🌐 ডিজিটাল ক্যাটালগ ও মেনু</Text>
        </View>
        <Text style={styles.shopName}>{tenant.shopName}</Text>
        <Text style={styles.shopSub}>📞 {tenant.phone} • 📍 {tenant.location || 'বাজার'}</Text>
      </View>

      {/* 🔍 Search Bar */}
      <View style={[styles.searchSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
          placeholder="🔍 ক্যাটালগ পণ্য খুঁজুন..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* 📦 Product Grid */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filtered.map(p => {
            const qty = cart[p.id] || 0;
            return (
              <View
                key={p.id}
                style={[
                  styles.card,
                  { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' },
                  qty > 0 && { borderColor: primaryColor, borderWidth: 1.5 }
                ]}
              >
                <Text style={styles.cardIcon}>{p.icon || '📦'}</Text>
                <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={[styles.cardPrice, { color: primaryColor }]}>{formatPrice(p.price || 0)}</Text>
                <Text style={styles.cardUnit}>প্রতি {p.unit || 'পিস'}</Text>

                {qty > 0 ? (
                  <View style={[styles.qtyRow, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                    <TouchableOpacity onPress={() => updateCartQty(p.id, -1)} style={styles.qtyBtn}>
                      <Text style={[styles.qtyBtnText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.qtyVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{qty}</Text>
                    <TouchableOpacity onPress={() => updateCartQty(p.id, 1)} style={[styles.qtyBtn, { backgroundColor: primaryColor }]}>
                      <Text style={[styles.qtyBtnText, { color: '#ffffff' }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: primaryColor }]}
                    onPress={() => updateCartQty(p.id, 1)}
                  >
                    <Text style={styles.addBtnText}>+ অর্ডার যোগ</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 🛒 Bottom Floating Order Bar */}
      {totalCartCount > 0 && (
        <View style={[styles.cartBar, { bottom: insets.bottom + 16 }]}>
          <View>
            <Text style={styles.cartBarCount}>🛒 {totalCartCount} টি পণ্য নির্বাচিত</Text>
            <Text style={styles.cartBarTotal}>{formatPrice(totalCartAmount)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: primaryColor }]}
            onPress={() => {
              triggerHaptic('medium');
              setShowOrderModal(true);
            }}
          >
            <Text style={styles.checkoutBtnText}>অর্ডার পাঠান ➔</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 📝 Order Modal */}
      <Modal visible={showOrderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                হোয়াটসঅ্যাপে অর্ডার পাঠান
              </Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>আপনার নাম *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: মোঃ সাব্বির আহমেদ"
              placeholderTextColor="#94a3b8"
              value={customerName}
              onChangeText={setCustomerName}
            />

            <Text style={styles.inputLabel}>মোবাইল নাম্বার *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="০১৭XXXXXXXX"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />

            <Text style={styles.inputLabel}>ডেলিভারি ঠিকানা</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="বাসা নং, রোড, এলাকা"
              placeholderTextColor="#94a3b8"
              value={customerAddress}
              onChangeText={setCustomerAddress}
            />

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#25d366' }]}
              onPress={handleSendOrderWhatsApp}
            >
              <Text style={styles.confirmBtnText}>💬 হোয়াটসঅ্যাপে অর্ডার কনফার্ম করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { padding: 16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  shopBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 6 },
  shopBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  shopName: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  shopSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 3 },
  searchSection: { padding: 10, borderBottomWidth: 1 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, height: 40, fontSize: 13, fontWeight: '600' },
  content: { padding: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: (width - 30) / 2, borderRadius: 14, padding: 12, borderWidth: 1, elevation: 1 },
  cardIcon: { fontSize: 26, marginBottom: 4 },
  cardTitle: { fontSize: 13, fontWeight: '800', minHeight: 34 },
  cardPrice: { fontSize: 14.5, fontWeight: '900', marginTop: 4 },
  cardUnit: { fontSize: 10.5, color: '#64748b', marginBottom: 8 },
  addBtn: { borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 11.5 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, padding: 2 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 14, fontWeight: '900' },
  qtyVal: { fontSize: 13, fontWeight: '800' },
  cartBar: { position: 'absolute', left: 12, right: 12, backgroundColor: '#0f172a', borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 8, zIndex: 40 },
  cartBarCount: { color: '#94a3b8', fontSize: 11.5, fontWeight: '600' },
  cartBarTotal: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  checkoutBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  checkoutBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  closeBtn: { fontSize: 16, color: '#64748b', fontWeight: 'bold' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  confirmBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  confirmBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' }
});
