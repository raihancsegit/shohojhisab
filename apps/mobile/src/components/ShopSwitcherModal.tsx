import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNav } from '../context/NavContext';
import { DEMO_SHOPS } from '../lib/offlineDataVault';
import { INDUSTRY_CATEGORIES } from '../lib/industryConfig';

export default function ShopSwitcherModal() {
  const { tenant, switchShop, setIndustryId, triggerHaptic } = useAuth();
  const { isShopModalOpen, closeShopModal } = useNav();

  const themes = INDUSTRY_CATEGORIES || {};

  return (
    <Modal
      visible={isShopModalOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={closeShopModal}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={closeShopModal} />

        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🏬 দোকান ও ব্যবসা নির্বাচন</Text>
              <Text style={styles.subtitle}>আপনার সক্রিয় দোকান শাখা বেছে নিন</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={closeShopModal}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>আমার দোকান শাখাসমূহ</Text>
            {(DEMO_SHOPS || []).map((shop) => {
              const isSelected = tenant?.id === shop.id;
              return (
                <TouchableOpacity
                  key={shop.id}
                  style={[
                    styles.shopItem,
                    isSelected && styles.shopItemSelected
                  ]}
                  onPress={() => {
                    switchShop(shop);
                    closeShopModal();
                  }}
                >
                  <View style={styles.shopItemLeft}>
                    <View style={styles.shopIconBox}>
                      <Text style={styles.shopIcon}>{shop.icon || '🏪'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.shopItemTitle, isSelected && styles.shopItemTitleSelected]}>
                        {shop.shopName}
                      </Text>
                      <Text style={styles.shopItemMeta}>
                        {shop.industryName} • 📱 {shop.phone}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={styles.checkPill}>
                      <Text style={styles.checkText}>সক্রিয় ✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>ব্যবসার ক্যাটাগরি (ক্যাটালগ প্রিসেট)</Text>
            <View style={styles.industryGrid}>
              {Object.entries(themes).map(([id, theme]) => {
                const isCurrent = tenant?.industryId === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.industryCard,
                      isCurrent && { borderColor: theme.primaryColor, backgroundColor: '#f0fdf4' }
                    ]}
                    onPress={() => {
                      triggerHaptic('success');
                      setIndustryId(id);
                      closeShopModal();
                    }}
                  >
                    <Text style={styles.industryIcon}>{theme.icon}</Text>
                    <Text style={[styles.industryName, isCurrent && { color: theme.primaryColor, fontWeight: 'bold' }]}>
                      {theme.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold',
  },
  body: {
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  shopItemSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  shopItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shopIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shopIcon: {
    fontSize: 20,
  },
  shopItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  shopItemTitleSelected: {
    fontWeight: '900',
    color: '#4f46e5',
  },
  shopItemMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  checkPill: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  checkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  industryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  industryCard: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  industryIcon: {
    fontSize: 20,
  },
  industryName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
});
