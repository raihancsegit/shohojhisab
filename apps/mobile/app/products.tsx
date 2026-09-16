import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';

export default function ProductsScreen() {
  const { tenant } = useAuth();
  const vault = getLocalVaultData(tenant.id);
  const products = vault.products || [];

  const [search, setSearch] = useState('');

  const filtered = products.filter(p =>
    (p.banglaName || p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="🔍 পণ্য অনুসন্ধান করুন..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView style={styles.list}>
        {filtered.map(p => (
          <View key={p.id} style={styles.card}>
            <View>
              <Text style={styles.name}>{p.banglaName || p.name}</Text>
              <Text style={styles.stock}>স্টক: {p.stock} {p.unit || 'পিস'}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.price}>৳{p.sellingPrice}</Text>
              <Text style={styles.cost}>কেনা: ৳{p.purchasePrice || 0}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16
  },
  search: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 14
  },
  list: {
    flex: 1
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  stock: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2
  },
  right: {
    alignItems: 'flex-end'
  },
  price: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669'
  },
  cost: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  }
});
