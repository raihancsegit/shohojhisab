import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useCart } from '../../src/context/CartContext';
import {
  getLocalVaultData,
  INDUSTRY_CATALOGS,
  executePOSSale,
  ProductItem,
  CustomerItem
} from '../../src/lib/offlineDataVault';
import { parseBanglaVoiceInput } from '../../src/lib/offlineAiEngine';
import VoicePOSCalculatorModal from '../../src/components/VoicePOSCalculatorModal';

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, speakAnnouncement, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalAmount, totalCount } = useCart();
  const isDark = themeMode === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('all');
  const [voiceText, setVoiceText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'due' | 'bkash' | 'nagad'>('cash');
  const [discount, setDiscount] = useState<number>(0);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showVoiceCalculatorModal, setShowVoiceCalculatorModal] = useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any>(null);

  // Load vault products & customers for active shop
  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  const catalog = INDUSTRY_CATALOGS[tenant.industryId] || INDUSTRY_CATALOGS['cat-grocery'];
  const subcategories = catalog.subcategories;

  // Filter products by search and subcategory
  const filteredProducts = useMemo(() => {
    return vault.products.filter(p => {
      const matchesSearch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedSubCat === 'all' || p.subCategory === selectedSubCat;
      return matchesSearch && matchesCat;
    });
  }, [vault.products, searchQuery, selectedSubCat]);

  // Voice POS Parser
  const handleVoiceSubmit = () => {
    if (!voiceText.trim()) return;
    triggerHaptic('medium');
    
    // Search matching product in vault
    const match = vault.products.find(p => (p.banglaName || p.name || '').toLowerCase().includes(voiceText.trim().toLowerCase()));
    if (match) {
      addToCart({ id: match.id, name: match.name, price: match.price || match.sellingPrice || 0, unit: match.unit }, 1);
      speakAnnouncement(`${match.name} কার্টে যোগ করা হয়েছে`);
      setVoiceText('');
      return;
    }

    const res = parseBanglaVoiceInput(tenant.id, voiceText);
    refreshVault();
    speakAnnouncement(res.speech || res.reply);
    setVoiceText('');
  };

  // Complete POS Sale
  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    triggerHaptic('success');

    const finalTotal = Math.max(0, totalAmount - discount);
    const isDue = paymentMethod === 'due';
    const paid = isDue ? 0 : finalTotal;
    const due = isDue ? finalTotal : 0;

    const saleRecord = executePOSSale(tenant.id, {
      invoiceNo: `#INV-${Date.now().toString().slice(-4)}`,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'সাধারণ ক্রেতা',
      items: cart.map(c => ({
        id: c.id,
        name: c.name,
        quantity: c.quantity,
        price: c.unitPrice,
        unit: c.unit,
        total: c.totalPrice
      })),
      subtotal: totalAmount,
      discount,
      total: finalTotal,
      paidAmount: paid,
      dueAmount: due,
      paymentMethod
    });

    setLastSaleReceipt(saleRecord);
    clearCart();
    setDiscount(0);
    setSelectedCustomer(null);
    setShowCheckoutModal(false);
    setShowReceiptModal(true);
    refreshVault();

    // Bengali Voice Soundbox Announcement
    const custName = selectedCustomer ? selectedCustomer.name : 'কাস্টমার';
    const methodText = paymentMethod === 'due' ? 'বাকিতে' : paymentMethod === 'bkash' ? 'বিকাশে' : 'নগদে';
    speakAnnouncement(`${tenant.shopName}: ${custName} এর নিকট হতে ${finalTotal} টাকা ${methodText} বিক্রি সফল হয়েছে`);
  };

  const primaryColor = theme.primaryColor || '#059669';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 🟢 Top Search & Ultra Voice Command Bar */}
      <View style={[styles.topBar, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        {/* 🎙️ Dedicated Ultra Voice Memo Button */}
        <TouchableOpacity
          style={styles.ultraVoiceBtn}
          onPress={() => {
            triggerHaptic('medium');
            setShowVoiceCalculatorModal(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.ultraVoiceIcon}>🎙️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.ultraVoiceTitle}>আল্ট্রা ভয়েস মেমো (Voice POS)</Text>
            <Text style={styles.ultraVoiceSub}>হ্যান্ডস-ফ্রি মুখে বলে স্বয়ংক্রিয় মেমো তৈরি করুন</Text>
          </View>
          <View style={styles.ultraVoiceBadge}>
            <Text style={styles.ultraVoiceBadgeText}>শুরু করুন ▶</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.voiceInputRow}>
          <TextInput
            style={[styles.voiceInput, { backgroundColor: isDark ? '#1f2937' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a' }]}
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder="কুইক ভয়েস/টেক্সট (যেমন: তেল ১ লিটার)..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={handleVoiceSubmit}
          />
          <TouchableOpacity style={styles.voiceBtn} onPress={handleVoiceSubmit}>
            <Text style={styles.voiceBtnText}>যোগ +</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.searchBar, { backgroundColor: isDark ? '#1f2937' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a' }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 পণ্য বা বারকোড খুঁজুন..."
          placeholderTextColor="#94a3b8"
        />
      </View>


      {/* 🏷️ Category Filter Pills */}
      <View style={[styles.categoryScrollContainer, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {subcategories.map(cat => {
            const isSelected = selectedSubCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catPill,
                  { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' },
                  isSelected && { backgroundColor: primaryColor, borderColor: primaryColor }
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedSubCat(cat.id);
                }}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.catText,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                  isSelected && { color: '#ffffff', fontWeight: '800' }
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 📦 Product Catalog Grid */}
      <View style={styles.productSection}>
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const cartItem = cart.find(c => c.id === item.id);
            const inCartQty = cartItem ? cartItem.quantity : 0;

            return (
              <TouchableOpacity
                style={[
                  styles.productCard,
                  {
                    backgroundColor: isDark ? '#131b2e' : '#ffffff',
                    borderColor: isDark ? '#1e293b' : '#e2e8f0'
                  },
                  inCartQty > 0 && { borderColor: primaryColor, borderWidth: 2 }
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  addToCart({ id: item.id, name: item.name, price: item.price, unit: item.unit }, 1);
                }}
              >
                <View style={styles.productHeader}>
                  <Text style={styles.productIcon}>{item.icon}</Text>
                  <View style={[styles.stockBadge, item.stock < 10 && { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.stockText, item.stock < 10 && { color: '#dc2626' }]}>
                      স্টক: {item.stock} {item.unit}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.productName, { color: isDark ? '#f1f5f9' : '#1e293b' }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.productPrice, { color: primaryColor }]}>{formatPrice(item.price)}</Text>

                {/* ➕ / ➖ Action Row */}
                <View style={styles.cardActionRow}>
                  {inCartQty > 0 ? (
                    <View style={[styles.qtyControlRow, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                        onPress={() => {
                          triggerHaptic('light');
                          removeFromCart(item.id);
                        }}
                      >
                        <Text style={[styles.qtyBtnText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{inCartQty}</Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: primaryColor }]}
                        onPress={() => {
                          triggerHaptic('light');
                          addToCart({ id: item.id, name: item.name, price: item.price, unit: item.unit }, 1);
                        }}
                      >
                        <Text style={[styles.qtyBtnText, { color: '#ffffff' }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: primaryColor }]}
                      onPress={() => {
                        triggerHaptic('light');
                        addToCart({ id: item.id, name: item.name, price: item.price, unit: item.unit }, 1);
                      }}
                    >
                      <Text style={styles.addBtnText}>+ যোগ করুন</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 🛒 Bottom Cart Bar / Floating Checkout Summary */}
      {cart.length > 0 && (
        <View style={styles.bottomCartBar}>
          <View>
            <Text style={styles.cartCountText}>🛒 মেমোতে {totalCount} টি পণ্য</Text>
            <Text style={styles.cartTotalText}>{formatPrice(totalAmount)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: primaryColor }]}
            onPress={() => {
              triggerHaptic('medium');
              setShowCheckoutModal(true);
            }}
          >
            <Text style={styles.checkoutBtnText}>মেমো সম্পন্ন করুন →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 📝 Checkout Modal */}
      <Modal visible={showCheckoutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>মেমো সম্পন্ন করুন</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Cart Items List */}
              <Text style={[styles.sectionHeader, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                মেমোর মালামাল ({totalCount} টি):
              </Text>
              {cart.map(item => (
                <View key={item.id} style={[styles.cartItemRow, { borderColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cartItemName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{item.name}</Text>
                    <Text style={styles.cartItemSub}>{formatPrice(item.unitPrice)} x {item.quantity} {item.unit}</Text>
                  </View>
                  <Text style={[styles.cartItemTotal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                    {formatPrice(item.totalPrice)}
                  </Text>
                </View>
              ))}

              {/* Customer Selector */}
              <Text style={[styles.sectionHeader, { marginTop: 14, color: isDark ? '#cbd5e1' : '#334155' }]}>
                কাস্টমার নির্বাচন:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.customerChip,
                    { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' },
                    !selectedCustomer && { backgroundColor: '#e0e7ff', borderColor: '#4f46e5' }
                  ]}
                  onPress={() => setSelectedCustomer(null)}
                >
                  <Text style={[styles.chipText, !selectedCustomer && styles.chipTextActive]}>সাধারণ ক্রেতা (ক্যাশ)</Text>
                </TouchableOpacity>
                {vault.customers.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.customerChip,
                      { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' },
                      selectedCustomer?.id === c.id && { backgroundColor: '#e0e7ff', borderColor: '#4f46e5' }
                    ]}
                    onPress={() => setSelectedCustomer(c)}
                  >
                    <Text style={[styles.chipText, selectedCustomer?.id === c.id && styles.chipTextActive]}>
                      {c.name} (বাকি: {formatPrice(c.due || c.totalDue || 0)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Payment Method Selector */}
              <Text style={[styles.sectionHeader, { color: isDark ? '#cbd5e1' : '#334155' }]}>
                পেমেন্ট মাধ্যম:
              </Text>
              <View style={styles.paymentMethodRow}>
                {[
                  { id: 'cash', label: '💵 নগদ ক্যাশ' },
                  { id: 'due', label: '📒 বাকিতে' },
                  { id: 'bkash', label: '📱 bKash' },
                  { id: 'nagad', label: '🟠 Nagad' }
                ].map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.methodBtn,
                      { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' },
                      paymentMethod === m.id && { backgroundColor: '#e0e7ff', borderColor: '#4f46e5' }
                    ]}
                    onPress={() => setPaymentMethod(m.id as any)}
                  >
                    <Text style={[styles.methodText, paymentMethod === m.id && { color: '#4f46e5', fontWeight: '900' }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Summary Calculations */}
              <View style={[styles.summaryBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>মোট পণ্যের মূল্য:</Text>
                  <Text style={[styles.sumValue, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{formatPrice(totalAmount)}</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>বিশেষ ছাড় (ডিসকাউন্ট):</Text>
                  <TextInput
                    style={[styles.discountInput, { backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="৳ ০"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={discount ? String(discount) : ''}
                    onChangeText={t => setDiscount(parseFloat(t) || 0)}
                  />
                </View>
                <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: isDark ? '#1e293b' : '#e2e8f0', paddingTop: 8 }]}>
                  <Text style={[styles.sumLabel, { fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a' }]}>সর্বমোট প্রদেয়:</Text>
                  <Text style={[styles.sumValue, { color: primaryColor, fontSize: 18 }]}>
                    {formatPrice(Math.max(0, totalAmount - discount))}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: primaryColor }]} onPress={handleCompleteSale}>
              <Text style={styles.confirmBtnText}>✓ মেমো ও সাউন্ডবক্স ঘোষণা</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🧾 Thermal Receipt Modal */}
      <Modal visible={showReceiptModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff', maxHeight: '85%' }]}>
            <View style={styles.receiptBox}>
              <Text style={styles.receiptShopName}>{tenant.shopName}</Text>
              <Text style={styles.receiptSub}>স্মার্ট ক্যাশ মেমো</Text>
              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <Text style={styles.receiptText}>মেমো নং: {lastSaleReceipt?.invoiceNo}</Text>
              <Text style={styles.receiptText}>ক্রেতা: {lastSaleReceipt?.customerName}</Text>
              <Text style={styles.receiptDivider}>--------------------------------</Text>

              {lastSaleReceipt?.items?.map((it: any, idx: number) => (
                <View key={idx} style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemName}>{it.name} x {it.quantity}</Text>
                  <Text style={styles.receiptItemPrice}>{formatPrice(it.total)}</Text>
                </View>
              ))}

              <Text style={styles.receiptDivider}>--------------------------------</Text>
              <View style={styles.receiptItemRow}>
                <Text style={{ fontWeight: '800' }}>সর্বমোট পরিশোধ:</Text>
                <Text style={{ fontWeight: '900', color: primaryColor }}>{formatPrice(lastSaleReceipt?.total || 0)}</Text>
              </View>
              <Text style={styles.receiptFooter}>আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।</Text>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: primaryColor }]} onPress={() => setShowReceiptModal(false)}>
              <Text style={styles.confirmBtnText}>নতুন মেমো করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🎙️ Ultra Hands-Free Voice POS Calculator Modal */}
      {showVoiceCalculatorModal && (
        <VoicePOSCalculatorModal
          isOpen={showVoiceCalculatorModal}
          onClose={() => setShowVoiceCalculatorModal(false)}
          onCompleteSale={(saleData) => {
            setLastSaleReceipt(saleData);
            setShowReceiptModal(true);
            refreshVault();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { padding: 12, paddingTop: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  ultraVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    gap: 8,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  ultraVoiceIcon: { fontSize: 24 },
  ultraVoiceTitle: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  ultraVoiceSub: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
  ultraVoiceBadge: { backgroundColor: '#0284c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ultraVoiceBadgeText: { color: '#ffffff', fontSize: 10.5, fontWeight: '800' },
  voiceInputRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  voiceInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 40, fontSize: 12.5 },
  voiceBtn: { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  voiceBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12.5 },
  searchBar: { borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5 },
  categoryScrollContainer: { paddingVertical: 8, borderBottomWidth: 1 },
  catScroll: { paddingHorizontal: 12, gap: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
  catIcon: { fontSize: 14 },
  catText: { fontSize: 12, fontWeight: '600' },
  productSection: { flex: 1, padding: 8 },
  productList: { paddingBottom: 150 },
  productCard: { flex: 1, margin: 5, borderRadius: 14, padding: 10, borderWidth: 1, elevation: 1 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  productIcon: { fontSize: 24 },
  stockBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stockText: { fontSize: 9.5, color: '#15803d', fontWeight: '700' },
  productName: { fontSize: 12.5, fontWeight: '700', minHeight: 34, marginBottom: 2 },
  productPrice: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  cardActionRow: { marginTop: 'auto' },
  addBtn: { borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 11.5 },
  qtyControlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, padding: 2 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 15, fontWeight: '900' },
  qtyText: { fontSize: 13, fontWeight: '800' },
  bottomCartBar: { position: 'absolute', bottom: 84, left: 12, right: 12, backgroundColor: '#0f172a', borderRadius: 16, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 8, zIndex: 30 },
  cartCountText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  cartTotalText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  checkoutBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  checkoutBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900' },
  closeBtn: { fontSize: 18, color: '#64748b', fontWeight: '800' },
  modalBody: { marginBottom: 12 },
  sectionHeader: { fontSize: 12.5, fontWeight: '800', marginBottom: 6 },
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
  cartItemName: { fontSize: 12.5, fontWeight: '700' },
  cartItemSub: { fontSize: 11, color: '#64748b' },
  cartItemTotal: { fontSize: 13, fontWeight: '800' },
  customerChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginRight: 8, borderWidth: 1 },
  chipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#4f46e5', fontWeight: '800' },
  payOptionRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  payOptionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  payOptionText: { fontSize: 11, fontWeight: '700' },
  discountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  discountInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, width: 80, textAlign: 'center', fontWeight: '800' },
  billSummaryBox: { borderRadius: 12, padding: 12, marginBottom: 14 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sumLabel: { fontSize: 12, color: '#64748b' },
  sumValue: { fontSize: 12.5, fontWeight: '700' },
  confirmBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  receiptBox: { padding: 12, backgroundColor: '#ffffff', borderRadius: 8, marginBottom: 12 },
  receiptShopName: { fontSize: 16, fontWeight: '900', textAlign: 'center', color: '#0f172a' },
  receiptSub: { fontSize: 11, textAlign: 'center', color: '#64748b', marginBottom: 4 },
  receiptDivider: { textAlign: 'center', color: '#94a3b8', fontSize: 10, marginVertical: 4 },
  receiptText: { fontSize: 11, color: '#334155' },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  receiptItemName: { fontSize: 11.5, color: '#0f172a', fontWeight: '600' },
  paymentMethodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  methodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  methodText: { fontSize: 11, fontWeight: '700' },
  summaryBox: { borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1 },
  receiptItemPrice: { fontSize: 11.5, color: '#0f172a', fontWeight: '800' },
  receiptFooter: { fontSize: 10.5, color: '#64748b', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }
});

