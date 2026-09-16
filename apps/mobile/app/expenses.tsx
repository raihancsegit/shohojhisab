import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot } from '../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';

export default function ExpensesScreen() {
  const { tenant, speakAnnouncement } = useAuth();
  const vault = getLocalVaultData(tenant.id);
  const expenses = vault.expenses || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('দোকান খরচ');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = expenses.filter((e: any) => (e.date || '').startsWith(todayStr));
  const totalToday = todayExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const handleAddExpense = () => {
    const num = Number(amount);
    if (!title.trim() || isNaN(num) || num <= 0) {
      Alert.alert('সতর্কতা', 'খরচের বিবরণ ও সঠিক টাকার পরিমাণ দিন!');
      return;
    }

    const newExp = {
      id: `exp-off-${Date.now()}`,
      title: title.trim(),
      amount: num,
      category,
      date: todayStr,
      createdAt: new Date().toISOString()
    };

    saveLocalVaultSnapshot(tenant.id, {
      expenses: [newExp, ...expenses]
    });

    playNativeChime('cash');
    speakAnnouncement(`${newExp.title} ৳${num} টাকা খরচ লেখা হয়েছে`);
    setShowAddModal(false);
    setTitle('');
    setAmount('');
  };

  return (
    <View style={styles.container}>
      {/* 📊 Daily Expense Header */}
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerLabel}>আজকের মোট খরচ</Text>
          <Text style={styles.headerValue}>৳{totalToday.toLocaleString('en-US')}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>+ নতুন খরচ</Text>
        </TouchableOpacity>
      </View>

      {/* 📋 Expense History */}
      <Text style={styles.sectionTitle}>আজকের খরচের তালিকা</Text>
      <ScrollView style={styles.list}>
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☕</Text>
            <Text style={styles.emptyText}>আজ কোনো খরচ লেখা হয়নি</Text>
          </View>
        ) : (
          expenses.map(e => (
            <View key={e.id} style={styles.expCard}>
              <View>
                <Text style={styles.expTitle}>{e.title}</Text>
                <Text style={styles.expDate}>{e.date || 'আজ'}</Text>
              </View>
              <Text style={styles.expAmount}>- ৳{e.amount}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* ➕ Add Expense Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>নতুন খরচ লিপিবদ্ধ করুন</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="খরচের বিবরণ (যেমন: চা নাস্তা, বিদ্যুৎ বিল)..."
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="টাকার পরিমাণ (৳)..."
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddExpense}>
                <Text style={styles.modalSaveText}>সংরক্ষণ করুন ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16
  },
  headerCard: {
    backgroundColor: '#ea580c',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700'
  },
  headerValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2
  },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12.5
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 10
  },
  list: {
    flex: 1
  },
  expCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  expTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  expDate: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 2
  },
  expAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#dc2626'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    marginBottom: 12
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
  },
  modalCancel: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalCancelText: {
    color: '#64748b',
    fontWeight: '700'
  },
  modalSave: {
    flex: 1,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '800'
  }
});
