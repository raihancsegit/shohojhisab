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

export default function POSScreen() {
  const { tenant, theme, speakAnnouncement, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalAmount, totalCount } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('all');
  const [voiceText, setVoiceText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'due' | 'bkash' | 'nagad'>('cash');
  const [discount, setDiscount] = useState<number>(0);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
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
    const parsed = parseBanglaVoiceInput(voiceText, vault);

    if (parsed.intent === 'SALE' && parsed.items && parsed.items.length > 0) {
      parsed.items.forEach(it => {
        addToCart({
          id: it.productId,
          name: it.name,
          price: it.price,
          unit: it.unit
        }, it.quantity);
      });
      speakAnnouncement(`${parsed.items[0].name} যোগ করা হয়েছে`);
      setVoiceText('');
    } else {
      // Search matching product
      const match = vault.products.find(p => p.name.includes(voiceText.trim()));
      if (match) {
        addToCart({ id: match.id, name: match.name, price: match.price, unit: match.unit }, 1);
        speakAnnouncement(`${match.name} যোগ করা হয়েছে`);
        setVoiceText('');
      } else {
        Alert.alert('সহকারী', parsed.message || 'পণ্য পাওয়া যায়নি');
      }
    }
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
        id: c.product.id,
        name: c.product.name,
        quantity: c.quantity,
        price: c.product.price,
        unit: c.product.unit,
        total: c.quantity * c.product.price
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

  return (
    <View style={styles.container}>
      {/* 🟢 Top Search & Voice Command Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.primary }]}>
        <View style={styles.voiceInputRow}>
          <TextInput
            style={styles.voiceInput}
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder="মুখে বলুন বা লিখুন (যেমন: তেল ১ লিটার, চিনি ২ কেজি)..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={handleVoiceSubmit}
          />
          <TouchableOpacity style={styles.voiceBtn} onPress={handleVoiceSubmit}>
            <Text style={styles.voiceBtnText}>যোগ +</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchBar}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 পণ্য বা বারকোড খুঁজুন..."
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* 🏷️ Category Filter Pills */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {subcategories.map(cat => {
            const isSelected = selectedSubCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catPill,
                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedSubCat(cat.id);
                }}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catText, isSelected && { color: '#ffffff', fontWeight: '800' }]}>
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
          renderItem={({ item }) => {
            const cartItem = cart.find(c => c.product.id === item.id);
            const inCartQty = cartItem ? cartItem.quantity : 0;

            return (
              <TouchableOpacity
                style={[styles.productCard, inCartQty > 0 && { borderColor: theme.primary, borderWidth: 2 }]}
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

                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.productPrice, { color: theme.primary }]}>{formatPrice(item.price)}</Text>

                {/* ➕ / ➖ Action Row */}
                <View style={styles.cardActionRow}>
                  {inCartQty > 0 ? (
                    <View style={styles.qtyControlRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => {
                          triggerHaptic('light');
                          removeFromCart(item.id);
                        }}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{inCartQty}</Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: theme.primary }]}
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
                      style={[styles.addBtn, { backgroundColor: theme.primary }]}
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
            style={[styles.checkoutBtn, { backgroundColor: theme.primary }]}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>মেমো সম্পন্ন করুন</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Cart Items List */}
              <Text style={styles.sectionHeader}>মেমোর মালামাল ({totalCount} টি):</Text>
              {cart.map(item => (
                <View key={item.product.id} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemSub}>{formatPrice(item.product.price)} x {item.quantity} {item.product.unit}</Text>
                  </View>
                  <Text style={styles.cartItemTotal}>{formatPrice(item.quantity * item.product.price)}</Text>
                </View>
              ))}

              {/* Customer Selector */}
              <Text style={[styles.sectionHeader, { marginTop: 14 }]}>কাস্টমার নির্বাচন:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.customerChip, !selectedCustomer && styles.customerChipActive]}
                  onPress={() => setSelectedCustomer(null)}
                >
                  <Text style={[styles.chipText, !selectedCustomer && styles.chipTextActive]}>সাধারণ ক্রেতা (ক্যাশ)</Text>
                </TouchableOpacity>
                {vault.customers.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.customerChip, selectedCustomer?.id === c.id && styles.customerChipActive]}
                    onPress={() => setSelectedCustomer(c)}
                  >
                    <Text style={[styles.chipText, selectedCustomer?.id === c.id && styles.chipTextActive]}>
                      {c.name} (বাকি: {formatPrice(c.totalDue)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Payment Method */}
              <Text style={styles.sectionHeader}>পেমেন্ট মেথড:</Text>
              <View style={styles.paymentMethodRow}>
                {[
                  { id: 'cash', label: '💵 নগদ' },
                  { id: 'due', label: '📒 বাকি' },
                  { id: 'bkash', label: '📱 বিকাশ' },
                  { id: 'nagad', label: '💳 নগদ' }
                ].map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.methodBtn, paymentMethod === m.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => setPaymentMethod(m.id as any)}
                  >
                    <Text style={[styles.methodText, paymentMethod === m.id && { color: '#ffffff', fontWeight: '800' }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Summary Numbers */}
              <View style={styles.summaryBox}>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>মোট বিল:</Text>
                  <Text style={styles.sumValue}>{formatPrice(totalAmount)}</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>সর্বমোট প্রদেয়:</Text>
                  <Text style={[styles.sumValue, { color: theme.primary, fontSize: 18 }]}>
                    {formatPrice(Math.max(0, totalAmount - discount))}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={handleCompleteSale}>
              <Text style={styles.confirmBtnText}>✓ মেমো ও সাউন্ডবক্স ঘোষণা</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🧾 Thermal Receipt Modal */}
      <Modal visible={showReceiptModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
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
                <Text style={{ fontWeight: '900', color: theme.primary }}>{formatPrice(lastSaleReceipt?.total || 0)}</Text>
              </View>
              <Text style={styles.receiptFooter}>আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।</Text>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={() => setShowReceiptModal(false)}>
              <Text style={styles.confirmBtnText}>নতুন মেমো করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: { padding: 14, paddingTop: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  voiceInputRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  voiceInput: { flex: 1, backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, color: '#0f172a' },
  voiceBtn: { backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  voiceBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  searchBar: { backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 13, color: '#0f172a' },
  categoryScrollContainer: { backgroundColor: '#ffffff', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  catScroll: { paddingHorizontal: 12, gap: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  catIcon: { fontSize: 14 },
  catText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  productSection: { flex: 1, padding: 8 },
  productList: { paddingBottom: 90 },
  productCard: { flex: 1, margin: 5, backgroundColor: '#ffffff', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  productIcon: { fontSize: 24 },
  stockBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stockText: { fontSize: 9.5, color: '#15803d', fontWeight: '700' },
  productName: { fontSize: 12.5, fontWeight: '700', color: '#1e293b', minHeight: 34, marginBottom: 2 },
  productPrice: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  cardActionRow: { marginTop: 'auto' },
  addBtn: { borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 11.5 },
  qtyControlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  qtyText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  bottomCartBar: { position: 'absolute', bottom: 10, left: 12, right: 12, backgroundColor: '#0f172a', borderRadius: 16, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 5 },
  cartCountText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  cartTotalText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  checkoutBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  checkoutBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  closeBtn: { fontSize: 18, color: '#64748b', fontWeight: '800' },
  modalBody: { marginBottom: 12 },
  sectionHeader: { fontSize: 12.5, fontWeight: '800', color: '#334155', marginBottom: 6 },
  cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  cartItemName: { fontSize: 12.5, fontWeight: '700', color: '#0f172a' },
  cartItemSub: { fontSize: 11, color: '#64748b' },
  cartItemTotal: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  customerChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  customerChipActive: { backgroundColor: '#e0e7ff', borderColor: '#4f46e5' },
  chipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#4f46e5', fontWeight: '800' },
  paymentMethodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  methodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  methodText: { fontSize: 11.5, fontWeight: '700', color: '#334155' },
  summaryBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  sumValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  confirmBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  receiptBox: { padding: 16, backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fef3c7', marginBottom: 14 },
  receiptShopName: { fontSize: 18, fontWeight: '900', textAlign: 'center', color: '#0f172a' },
  receiptSub: { fontSize: 11, color: '#64748b', textAlign: 'center', marginBottom: 6 },
  receiptDivider: { color: '#cbd5e1', textAlign: 'center', fontSize: 10, marginVertical: 4 },
  receiptText: { fontSize: 11, color: '#334155', marginBottom: 2 },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  receiptItemName: { fontSize: 11.5, color: '#1e293b' },
  receiptItemPrice: { fontSize: 11.5, fontWeight: '700', color: '#0f172a' },
  receiptFooter: { fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 10 }
});
