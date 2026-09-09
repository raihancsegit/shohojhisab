'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { getIndustryTheme, getIndustryProductPlaceholder, getIndustryBrandPlaceholder, getIndustryProductSuggestions, getIndustrySearchPlaceholder } from '../../lib/industryConfig';
import Pagination from '../../components/Pagination';
import CameraBarcodeScannerModal from '../../components/CameraBarcodeScannerModal';
import { exportToCSV, parseCSV } from '../../lib/exportUtils';
import VoiceStockInModal from '../../components/VoiceStockInModal';
import IndustryUnitSelect, { MultiUnitBreakdownPreview } from '../../components/IndustryUnitSelect';
import DataLoader from '../../components/DataLoader';
import { triggerFieldVoiceInput } from '../../lib/voiceFieldUtils';

export default function StockPage() {
  const { tenant, activeRoleMode, triggerHaptic, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id;
  const theme = getIndustryTheme(tenant?.industryId);
  const indId = tenant?.industryId || 'cat-grocery';

  const [search, setSearch] = useState('');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showVoiceStockModal, setShowVoiceStockModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Stock Inflow & Outflow History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<any | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Restock (মাল তুলুন) Modal State
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockProduct, setRestockProduct] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockUnit, setRestockUnit] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [updatePurchasePrice, setUpdatePurchasePrice] = useState(true);
  const [restockSupplier, setRestockSupplier] = useState('');
  const [restockNote, setRestockNote] = useState('');
  const [submittingRestock, setSubmittingRestock] = useState(false);

  // Full Edit Product Modal state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    banglaName: '',
    sellingPrice: '',
    purchasePrice: '',
    stock: '',
    unit: 'পিস',
    barcode: '',
    genericName: '',
    expiryDate: '',
    size: '',
    color: '',
    brand: '',
    warranty: '',
    subUnit: '',
    conversionRatio: '1'
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Quick Add Product Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    banglaName: '',
    sellingPrice: '',
    purchasePrice: '',
    stock: '50',
    unit: indId === 'cat-pharmacy' ? 'পাতা' : indId === 'cat-hardware' ? 'ফুট' : indId === 'cat-shoes' ? 'জোড়া' : indId === 'cat-restaurant' ? 'প্লেট' : indId === 'cat-tea' ? 'কাপ' : indId === 'cat-grocery' ? 'কেজি' : 'পিস',
    subUnit: '',
    conversionRatio: '1',
    barcode: '',
    genericName: '',
    expiryDate: '',
    size: '',
    color: '',
    brand: '',
    batchNumber: '',
    warranty: ''
  });

  // Auto-sync default unit when tenant industry loads
  useEffect(() => {
    const defaultUnit = indId === 'cat-pharmacy' ? 'পাতা' : indId === 'cat-hardware' ? 'ফুট' : indId === 'cat-shoes' ? 'জোড়া' : indId === 'cat-restaurant' ? 'প্লেট' : indId === 'cat-tea' ? 'কাপ' : indId === 'cat-clothing' ? 'পিস' : indId === 'cat-grocery' ? 'কেজি' : 'পিস';
    setAddForm(prev => ({
      ...prev,
      unit: prev.banglaName ? prev.unit : defaultUnit
    }));
  }, [indId]);

  const openAddModal = () => {
    const defaultUnit = indId === 'cat-pharmacy' ? 'পাতা' : indId === 'cat-hardware' ? 'ফুট' : indId === 'cat-shoes' ? 'জোড়া' : indId === 'cat-restaurant' ? 'প্লেট' : indId === 'cat-tea' ? 'কাপ' : indId === 'cat-clothing' ? 'পিস' : indId === 'cat-grocery' ? 'কেজি' : 'পিস';
    setAddForm({
      banglaName: '',
      sellingPrice: '',
      purchasePrice: '',
      stock: '50',
      unit: defaultUnit,
      subUnit: '',
      conversionRatio: '1',
      barcode: '',
      genericName: '',
      expiryDate: '',
      size: '',
      color: '',
      brand: '',
      batchNumber: '',
      warranty: ''
    });
    setShowAddModal(true);
    triggerHaptic('light');
  };

  // Open History Modal
  const openHistoryModal = async (product: any) => {
    setHistoryProduct(product);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    triggerHaptic('light');
    try {
      const res = await fetch(`/api/products/${product.id}/stock-logs`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
      setHistoryLogs([]);
    } finally {
      setLoadingHistory(false);
    }
  };
  const openStockHistory = openHistoryModal;

  // Open Restock Modal
  const openRestockModal = (product: any) => {
    setRestockProduct(product);
    setRestockQty('');
    setRestockUnit(product.unit || 'পিস');
    setRestockCost(String(product.purchasePrice || ''));
    setUpdatePurchasePrice(true);
    setRestockSupplier('');
    setRestockNote('');
    setShowRestockModal(true);
    triggerHaptic('light');
  };

  // Handle Restock Submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct || !restockQty || !currentTenantId) return;
    const qty = Number(restockQty);
    if (isNaN(qty) || qty <= 0) return;

    setSubmittingRestock(true);
    triggerHaptic('success');

    try {
      const res = await fetch('/api/stock-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          productId: restockProduct.id,
          productName: restockProduct.banglaName || restockProduct.name,
          type: 'stock_in',
          quantity: qty,
          unit: restockUnit || restockProduct.unit,
          unitPrice: Number(restockCost) || restockProduct.purchasePrice || 0,
          updatePurchasePrice: updatePurchasePrice,
          sourceRef: restockSupplier ? `সাপ্লায়ার: ${restockSupplier}` : 'নতুন মাল তোলা',
          note: restockNote || 'রিস্টক / মাল তোলা'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNotice(data.message || `✓ "${restockProduct.banglaName || restockProduct.name}"-এ +${qty} ${restockUnit} নতুন মাল তোলা হয়েছে!`);
        speakAnnouncement(`${restockProduct.banglaName || restockProduct.name} এ ${qty} ${restockUnit} মাল তোলা হয়েছে`);
        setShowRestockModal(false);
        await loadStock();
        setTimeout(() => setNotice(''), 3500);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
          alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! দয়া করে টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
        } else {
          alert(errData.error || errData.message || 'মাল তোলার সময় সমস্যা হয়েছে। দয়া করে তথ্য যাচাই করুন।');
        }
      }
    } catch (e) {
      alert('⚠️ সার্ভারে যোগাযোগ করা সম্ভব হয়নি। ব্যাকএন্ড সার্ভার (Port 4005) চালু আছে কিনা নিশ্চিত করুন।');
    } finally {
      setSubmittingRestock(false);
    }
  };

  // Inline quick editing states
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: 'sellingPrice' | 'purchasePrice' | 'stock'; val: string } | null>(null);

  const handleInlineValChange = (newVal: string) => {
    setInlineEdit(prev => prev ? { ...prev, val: newVal } : null);
  };

  // WhatsApp Order Modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderDraft, setOrderDraft] = useState('');

  // CSV Bulk Import Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const handleExportStock = () => {
    const exportData = products.map((p) => ({
      banglaName: p.banglaName || p.name || '',
      sellingPrice: p.sellingPrice || 0,
      purchasePrice: p.purchasePrice || 0,
      stock: p.stock || 0,
      unit: p.unit || 'পিস',
      barcode: p.barcode || '',
      genericName: p.genericName || '',
      brand: p.brand || '',
      expiryDate: p.expiryDate || '',
      category: p.categoryId || ''
    }));

    exportToCSV('Product_Stock_Inventory', exportData, [
      { key: 'banglaName', label: 'পণ্যের নাম' },
      { key: 'sellingPrice', label: 'বিক্রয় মূল্য (টাকা)' },
      { key: 'purchasePrice', label: 'ক্রয় মূল্য (টাকা)' },
      { key: 'stock', label: 'বর্তমান স্টক' },
      { key: 'unit', label: 'একক' },
      { key: 'barcode', label: 'বারকোড' },
      { key: 'genericName', label: 'জেনেরিক/গ্রুপ' },
      { key: 'brand', label: 'ব্র্যান্ড/কোম্পানি' },
      { key: 'expiryDate', label: 'মেয়াদ উত্তীর্ণের তারিখ' },
      { key: 'category', label: 'ক্যাটাগরি' }
    ]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const rows = parseCSV(text);
        setImportPreview(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    if (!importPreview || importPreview.length === 0 || !currentTenantId) return;
    setImporting(true);
    triggerHaptic('medium');

    let successCount = 0;
    try {
      for (const row of importPreview) {
        const name = row['পণ্যের নাম'] || row['name'] || row['banglaName'] || Object.values(row)[0];
        const sellPrice = Number(row['বিক্রয় মূল্য (টাকা)'] || row['sellingPrice'] || row['price'] || 0);
        const buyPrice = Number(row['ক্রয় মূল্য (টাকা)'] || row['purchasePrice'] || row['cost'] || Math.round(sellPrice * 0.8));
        const stockQty = Number(row['বর্তমান স্টক'] || row['stock'] || row['quantity'] || 10);
        const unit = row['একক'] || row['unit'] || 'পিস';
        const barcode = row['বারকোড'] || row['barcode'] || '894' + Math.floor(10000000 + Math.random() * 90000000);
        const genericName = row['জেনেরিক/গ্রুপ'] || row['genericName'] || '';
        const brand = row['ব্র্যান্ড/কোম্পানি'] || row['brand'] || '';

        if (name && sellPrice > 0) {
          const newProdId = 'prod-' + Date.now().toString().slice(-5) + Math.floor(Math.random() * 900);
          await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newProdId,
              tenantId: currentTenantId,
              categoryId: tenant?.industryId || 'cat-grocery',
              banglaName: name,
              name: name,
              sellingPrice: sellPrice,
              purchasePrice: buyPrice,
              stock: stockQty,
              unit,
              barcode,
              genericName: genericName || null,
              brand: brand || null,
              imageEmoji: '📦'
            })
          });
          successCount++;
        }
      }

      setNotice(`✓ মোট ${successCount}টি পণ্য সফলভাবে স্টকে ইমপোর্ট হয়েছে!`);
      speakAnnouncement(`${successCount}টি পণ্য স্টকে যুক্ত হয়েছে`);
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
      await loadStock();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.error('Import error', err);
      alert('ইমপোর্ট করার সময় সমস্যা হয়েছে');
    } finally {
      setImporting(false);
    }
  };

  const startVoiceInputForField = (setter: (val: string) => void, isNumeric = false, label?: string) => {
    triggerFieldVoiceInput({ label, isNumeric, onResult: setter });
  };

  const loadStock = async () => {
    if (!currentTenantId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadStock();

    const handleVoiceSuccess = () => {
      loadStock();
    };

    const handleVoiceTriggerAdd = () => {
      setShowAddModal(true);
      triggerHaptic('success');
    };

    window.addEventListener('voice-action-success', handleVoiceSuccess);
    window.addEventListener('voice-trigger-add-stock', handleVoiceTriggerAdd);
    return () => {
      window.removeEventListener('voice-action-success', handleVoiceSuccess);
      window.removeEventListener('voice-trigger-add-stock', handleVoiceTriggerAdd);
    };
  }, [currentTenantId]);

  const lowStockItems = products.filter(p => p.stock <= (p.lowStockThreshold || 5));

  // Quick Inline Save for Price or Stock
  const handleSaveInline = async (productId: string, field: 'sellingPrice' | 'purchasePrice' | 'stock', value: string) => {
    const numVal = Number(value);
    if (isNaN(numVal) || numVal < 0) return;
    triggerHaptic('success');

    const updatePayload: any = {};
    updatePayload[field] = numVal;

    try {
      let res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/products/${productId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });
      }
      if (res.ok) {
        setNotice(`✓ ${field === 'sellingPrice' ? 'বিক্রয় মূল্য' : field === 'purchasePrice' ? 'কেনার দাম' : 'স্টক'} সফলভাবে আপডেট হয়েছে!`);
        setInlineEdit(null);
        await loadStock();
        setTimeout(() => setNotice(''), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
          alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
        } else {
          alert(errData.error || errData.message || 'আপডেট করতে ব্যর্থ হয়েছে');
        }
      }
    } catch (e) {
      alert('⚠️ সার্ভারে যোগাযোগ করা সম্ভব হয়নি। ব্যাকএন্ড সার্ভার (Port 4005) চালু আছে কিনা নিশ্চিত করুন।');
    }
  };

  // Quick Stock Increment / Decrement Button
  const handleQuickAddStock = async (product: any, deltaQty: number) => {
    triggerHaptic('medium');
    const newStock = Math.max(0, Number(product.stock || 0) + deltaQty);
    try {
      let res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/products/${product.id}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: newStock })
        });
      }
      if (res.ok) {
        const sign = deltaQty > 0 ? `+${deltaQty}` : `${deltaQty}`;
        setNotice(`✓ ${product.banglaName || product.name}-এ ${sign} ${product.unit} স্টক আপডেট হয়েছে (মোট: ${newStock})`);
        speakAnnouncement(`${product.banglaName || product.name} এ ${sign} ${product.unit} স্টক আপডেট হয়েছে`);
        await loadStock();
        setTimeout(() => setNotice(''), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
          alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
        } else {
          alert(errData.error || errData.message || 'স্টক আপডেট ব্যর্থ হয়েছে');
        }
      }
    } catch (e) {
      alert('⚠️ সার্ভারে যোগাযোগ করা সম্ভব হয়নি। ব্যাকএন্ড সার্ভার (Port 4005) চালু আছে কিনা নিশ্চিত করুন।');
    }
  };

  // Open Full Edit Modal
  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setEditForm({
      banglaName: p.banglaName || p.name || '',
      sellingPrice: String(p.sellingPrice || ''),
      purchasePrice: String(p.purchasePrice || ''),
      stock: String(p.stock || '0'),
      unit: p.unit || 'পিস',
      subUnit: p.subUnit || '',
      conversionRatio: String(p.conversionRatio || '1'),
      barcode: p.barcode || '',
      genericName: p.genericName || '',
      expiryDate: p.expiryDate || '',
      size: p.size || '',
      color: p.color || '',
      brand: p.brand || '',
      warranty: p.warranty || ''
    });
    triggerHaptic('light');
  };

  // Handle Full Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    triggerHaptic('success');

    try {
      const updatePayload = {
        banglaName: editForm.banglaName,
        name: editForm.banglaName,
        sellingPrice: Number(editForm.sellingPrice) || 0,
        purchasePrice: Number(editForm.purchasePrice) || 0,
        stock: Number(editForm.stock) || 0,
        unit: editForm.unit,
        subUnit: editForm.subUnit.trim() || null,
        conversionRatio: Number(editForm.conversionRatio) || 1,
        barcode: editForm.barcode,
        genericName: editForm.genericName || null,
        expiryDate: editForm.expiryDate || null,
        size: editForm.size || null,
        color: editForm.color || null,
        brand: editForm.brand || null,
        warranty: editForm.warranty || null
      };

      let res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/products/${editingProduct.id}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });
      }

      if (res.ok) {
        setNotice(`✓ "${editForm.banglaName}" পণ্যের তথ্য ও দাম সফলভাবে সংরক্ষিত হয়েছে!`);
        setEditingProduct(null);
        await loadStock();
        setTimeout(() => setNotice(''), 3500);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
          alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
        } else {
          alert(errData.error || errData.message || 'পণ্য সংরক্ষণ করতে ব্যর্থ হয়েছে');
        }
      }
    } catch (e) {
      alert('⚠️ সার্ভারে সমস্যা হয়েছে। ব্যাকএন্ড সার্ভার (Port 4005) চালু আছে কিনা নিশ্চিত করুন।');
    }
  };

  // Handle Add Product Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.banglaName || !addForm.sellingPrice || !currentTenantId) return;
    triggerHaptic('success');

    const newProdId = 'prod-' + Date.now().toString().slice(-6);
    const barcode = addForm.barcode || '894' + Math.floor(10000000 + Math.random() * 90000000);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newProdId,
          tenantId: currentTenantId,
          categoryId: tenant?.industryId || 'cat-grocery',
          banglaName: addForm.banglaName,
          name: addForm.banglaName,
          sellingPrice: Number(addForm.sellingPrice) || 0,
          purchasePrice: Number(addForm.purchasePrice) || Math.round((Number(addForm.sellingPrice) || 0) * 0.8),
          stock: Number(addForm.stock) || 0,
          unit: addForm.unit,
          subUnit: addForm.subUnit.trim() || null,
          conversionRatio: Number(addForm.conversionRatio) || 1,
          barcode,
          genericName: addForm.genericName || null,
          expiryDate: addForm.expiryDate || null,
          size: addForm.size || null,
          color: addForm.color || null,
          brand: addForm.brand || null,
          batchNumber: addForm.batchNumber || null,
          warranty: addForm.warranty || null,
          imageEmoji: '📦'
        })
      });

      if (res.ok) {
        setNotice(`✓ নতুন পণ্য "${addForm.banglaName}" সফলভাবে তালিকায় যুক্ত হয়েছে!`);
        speakAnnouncement(`নতুন পণ্য ${addForm.banglaName} ${addForm.sellingPrice} টাকা স্টকে যুক্ত হয়েছে`);
        setShowAddModal(false);
        setAddForm({
          banglaName: '',
          sellingPrice: '',
          purchasePrice: '',
          stock: '50',
          unit: indId === 'cat-pharmacy' ? 'পাতা' : indId === 'cat-hardware' ? 'ফুট' : indId === 'cat-shoes' ? 'জোড়া' : indId === 'cat-restaurant' ? 'প্লেট' : indId === 'cat-tea' ? 'কাপ' : indId === 'cat-grocery' ? 'কেজি' : 'পিস',
          subUnit: '',
          conversionRatio: '1',
          barcode: '',
          genericName: '',
          expiryDate: '',
          size: '',
          color: '',
          brand: '',
          batchNumber: '',
          warranty: ''
        });
        await loadStock();
        setTimeout(() => setNotice(''), 3500);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
          alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
        } else {
          alert(errData.error || errData.message || 'নতুন পণ্য যুক্ত করতে সমস্যা হয়েছে');
        }
      }
    } catch (e) {
      alert('⚠️ সার্ভারে যোগাযোগ করা সম্ভব হয়নি। ব্যাকএন্ড সার্ভার (Port 4005) চালু আছে কিনা নিশ্চিত করুন।');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (p: any) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${p.banglaName || p.name}" পণ্যটি তালিকা থেকে ডিলিট করতে চান?`)) return;
    triggerHaptic('warning');

    try {
      let res = await fetch(`/api/products/${p.id}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/products/${p.id}/delete`, {
          method: 'POST'
        });
      }
      if (res.ok) {
        setNotice(`✓ পণ্য "${p.banglaName || p.name}" মুছে ফেলা হয়েছে!`);
        await loadStock();
        setTimeout(() => setNotice(''), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
          alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
        } else {
          alert(errData.error || errData.message || 'পণ্য ডিলিট করতে ব্যর্থ হয়েছে');
        }
      }
    } catch (e) {
      alert('⚠️ সার্ভারে যোগাযোগ করা সম্ভব হয়নি। ব্যাকএন্ড সার্ভার (Port 4005) চালু আছে কিনা নিশ্চিত করুন।');
    }
  };

  const generateReorderSheet = () => {
    triggerHaptic('medium');
    let sheet = `আসসালামু আলাইকুম,\n${tenant?.shopName || 'দোকান'} থেকে নতুন পণ্যের জরুরি অর্ডার:\n\n`;
    lowStockItems.forEach((p, idx) => {
      sheet += `${idx + 1}. ${p.banglaName || p.name} - (বর্তমান স্টক: ${p.stock} ${p.unit})\n`;
    });
    sheet += `\nঅনুরোধ রইল দ্রুত চালান পাঠিয়ে দিন। ধন্যবাদ!\n${tenant?.ownerName || ''} (${tenant?.phone || ''})`;
    setOrderDraft(sheet);
    setShowOrderModal(true);
  };

  const sendToWhatsApp = () => {
    triggerHaptic('success');
    const textMsg = encodeURIComponent(orderDraft);
    window.open(`https://wa.me/?text=${textMsg}`, '_blank');
  };

  // Reset page to 1 if search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const filtered = products.filter(p => {
    const isLow = p.stock <= (p.lowStockThreshold || 5);
    const q = search.toLowerCase();
    const matchSearch = (p.banglaName && p.banglaName.toLowerCase().includes(q)) || 
                        (p.name && p.name.toLowerCase().includes(q)) ||
                        (p.barcode && p.barcode.includes(q)) ||
                        (p.genericName && p.genericName.toLowerCase().includes(q));
    const matchFilter = filter === 'all' || (filter === 'low' && isLow);
    return matchSearch && matchFilter;
  });

  const totalStockCount = filtered.length;
  const paginatedProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-container" style={{ paddingBottom: '80px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '900', color: '#0f172a', margin: '0 0 2px' }}>
            📦 পণ্য তালিকা ও লাইভ স্টক
          </h1>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            {tenant?.shopName} • মোট {products.length}টি পণ্য
          </span>
        </div>

        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={openAddModal}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '9px',
              fontWeight: '800',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}
          >
            <span>➕</span> নতুন পণ্য
          </button>

          <button
            onClick={() => { setShowVoiceStockModal(true); triggerHaptic('medium'); }}
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#fff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '9px',
              fontWeight: '800',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
            }}
          >
            <span>🎙️</span> ভয়েস স্টক
          </button>

          <button
            onClick={handleExportStock}
            style={{
              background: '#047857',
              color: '#fff',
              border: 'none',
              padding: '6px 9px',
              borderRadius: '9px',
              fontWeight: '800',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <span>📥</span> CSV
          </button>

          <button
            onClick={() => { setShowImportModal(true); triggerHaptic('light'); }}
            style={{
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              padding: '6px 9px',
              borderRadius: '9px',
              fontWeight: '800',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <span>📤</span> ইমপোর্ট
          </button>

          {/* View Mode Switcher (List vs Grid) */}
          <div style={{ display: 'flex', gap: '2px', background: '#e2e8f0', padding: '2px', borderRadius: '9px' }}>
            <button
              onClick={() => { setViewMode('list'); triggerHaptic('light'); }}
              style={{
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f172a' : '#64748b',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '7px',
                fontWeight: '800',
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
              }}
              title="লিস্ট ভিউ"
            >
              📋
            </button>
            <button
              onClick={() => { setViewMode('grid'); triggerHaptic('light'); }}
              style={{
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#0f172a' : '#64748b',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '7px',
                fontWeight: '800',
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: viewMode === 'grid' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
              }}
              title="কার্ড ভিউ"
            >
              🗂️
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', color: '#065f46', padding: '8px 12px', borderRadius: '10px', marginBottom: '12px', fontSize: '12px', fontWeight: '800' }}>
          {notice}
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
          <input
            type="text"
            placeholder={getIndustrySearchPlaceholder(indId)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 40px 8px 12px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '12.5px',
              outline: 'none',
              background: '#fff',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => { setShowCameraScanner(true); triggerHaptic('medium'); }}
              style={{
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '6px',
                padding: '3px 6px',
                color: '#4f46e5',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'grid',
                placeItems: 'center'
              }}
              title="ক্যামেরা স্ক্যানার"
            >
              📷
            </button>
            <button
              type="button"
              onClick={() => startVoiceInputForField(setSearch, false, 'পণ্য খুঁজুন')}
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                padding: '3px 6px',
                color: '#059669',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'grid',
                placeItems: 'center'
              }}
              title="মুখে বলে খুঁজুন"
            >
              🎙️
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
          <button
            onClick={() => { setFilter('all'); triggerHaptic('light'); }}
            style={{ background: filter === 'all' ? '#10b981' : 'transparent', color: filter === 'all' ? '#fff' : '#475569', border: 'none', padding: '5px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '11.5px', cursor: 'pointer' }}
          >
            সব ({products.length})
          </button>
          <button
            onClick={() => { setFilter('low'); triggerHaptic('light'); }}
            style={{ background: filter === 'low' ? '#dc2626' : 'transparent', color: filter === 'low' ? '#fff' : '#dc2626', border: 'none', padding: '5px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '11.5px', cursor: 'pointer' }}
          >
            কম স্টক ({lowStockItems.length})
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && filter === 'all' && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '16px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>⚠️</span>
            <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: '700' }}>
              <strong>{lowStockItems.length}টি পণ্যের স্টক কম!</strong> দ্রুত ডিলারকে নতুন অর্ডার পাঠান।
            </span>
          </div>
          <button
            onClick={generateReorderSheet}
            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
          >
            অর্ডার ফর্দ ➔
          </button>
        </div>
      )}

      {/* VIEW 1: COMPACT LIST / TABLE VIEW (Super easy to manage 100s of products) */}
      {viewMode === 'list' && (
        loading ? (
          <DataLoader type="table" count={7} text="স্টক ও ইনভেন্টরি পণ্য লোড হচ্ছে..." />
        ) : (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '800' }}>
                  <th style={{ padding: '10px 14px' }}>📦 পণ্যের বিবরণ ও ব্র্যান্ড</th>
                  <th style={{ padding: '10px 10px' }}>💰 ক্রয় ও বিক্রয় মূল্য (লাভ)</th>
                  <th style={{ padding: '10px 10px' }}>📊 বর্তমান স্টক ও অবস্থা</th>
                  <th style={{ padding: '10px 10px' }}>⚡ দ্রুত স্টক পরিবর্তন</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>⚙️ অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p, idx) => {
                  const buyPrice = Number(p.purchasePrice) || 0;
                  const sellPrice = Number(p.sellingPrice) || 0;
                  const profit = sellPrice - buyPrice;
                  const profitMargin = sellPrice > 0 ? Math.round((profit / sellPrice) * 100) : 0;
                  const isZero = p.stock === 0;
                  const isLow = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isZero ? '#fff7ed' : idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background 0.15s'
                      }}
                    >
                      {/* Column 1: Product Name, Icon & Tags */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '22px', flexShrink: 0 }}>{p.icon || '📦'}</span>
                          <div>
                            <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block', fontWeight: '800' }}>
                              {p.banglaName || p.name}
                            </strong>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                              {p.barcode && (
                                <span style={{ fontSize: '10px', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                  #{p.barcode}
                                </span>
                              )}
                              {p.genericName && (
                                <span style={{ fontSize: '10px', color: '#4f46e5', background: '#eef2ff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700', border: '1px solid #c7d2fe' }}>
                                  🧪 {p.genericName}
                                </span>
                              )}
                              {p.brand && (
                                <span style={{ fontSize: '10px', color: '#0369a1', background: '#f0f9ff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700', border: '1px solid #bae6fd' }}>
                                  🏢 {p.brand}
                                </span>
                              )}
                              {p.size && (
                                <span style={{ fontSize: '10px', color: '#6d28d9', background: '#f5f3ff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700', border: '1px solid #ddd6fe' }}>
                                  🏷️ {p.size}
                                </span>
                              )}
                              {p.color && (
                                <span style={{ fontSize: '10px', color: '#475569', background: '#f8fafc', padding: '1px 5px', borderRadius: '4px' }}>
                                  🎨 {p.color}
                                </span>
                              )}
                              {p.expiryDate && (
                                <span style={{ fontSize: '10px', color: '#b45309', background: '#fffbeb', padding: '1px 5px', borderRadius: '4px', fontWeight: '600', border: '1px solid #fde68a' }}>
                                  ⏳ {p.expiryDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Buy / Sell Price & Profit Margin */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{ color: '#64748b' }}>ক্রয়:</span>
                            {inlineEdit && inlineEdit.id === p.id && inlineEdit.field === 'purchasePrice' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <input
                                  type="number"
                                  value={inlineEdit.val}
                                  onChange={(e) => handleInlineValChange(e.target.value)}
                                  className="num-font"
                                  autoFocus
                                  style={{ width: '52px', padding: '2px 4px', borderRadius: '4px', border: '1.5px solid #10b981', fontSize: '11.5px', outline: 'none' }}
                                />
                                <button
                                  onClick={() => handleSaveInline(p.id, 'purchasePrice', inlineEdit.val)}
                                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setInlineEdit(null)}
                                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span className="num-font" style={{ fontWeight: '700', color: '#475569' }}>
                                  ৳{p.purchasePrice || 0}
                                </span>
                                <button
                                  onClick={() => { setInlineEdit({ id: p.id, field: 'purchasePrice', val: String(p.purchasePrice || 0) }); triggerHaptic('light'); }}
                                  style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0px 3px', fontSize: '9px', cursor: 'pointer' }}
                                  title="কেনার দাম এডিট করুন"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{ color: '#059669', fontWeight: '700' }}>বিক্রয়:</span>
                            {inlineEdit && inlineEdit.id === p.id && inlineEdit.field === 'sellingPrice' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <input
                                  type="number"
                                  value={inlineEdit.val}
                                  onChange={(e) => handleInlineValChange(e.target.value)}
                                  className="num-font"
                                  autoFocus
                                  style={{ width: '52px', padding: '2px 4px', borderRadius: '4px', border: '1.5px solid #10b981', fontSize: '11.5px', outline: 'none' }}
                                />
                                <button
                                  onClick={() => handleSaveInline(p.id, 'sellingPrice', inlineEdit.val)}
                                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setInlineEdit(null)}
                                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span className="num-font" style={{ fontWeight: '900', color: '#059669', fontSize: '13px' }}>
                                  ৳{p.sellingPrice}
                                </span>
                                <button
                                  onClick={() => { setInlineEdit({ id: p.id, field: 'sellingPrice', val: String(p.sellingPrice) }); triggerHaptic('light'); }}
                                  style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '0px 3px', fontSize: '9px', cursor: 'pointer' }}
                                  title="বিক্রির দাম এডিট করুন"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Profit Pill */}
                          {profit > 0 ? (
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                              +৳{profit} ({profitMargin}%) লাভ
                            </span>
                          ) : profit === 0 ? (
                            <span style={{ fontSize: '10px', color: '#64748b', background: '#f8fafc', padding: '1px 5px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                              সমান সমান (০% লাভ)
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 5px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                              -৳{Math.abs(profit)} ক্ষতি
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Stock Quantity & Level Status */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {inlineEdit && inlineEdit.id === p.id && inlineEdit.field === 'stock' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <input
                                type="number"
                                value={inlineEdit.val}
                                onChange={(e) => handleInlineValChange(e.target.value)}
                                className="num-font"
                                autoFocus
                                style={{ width: '52px', padding: '2px 4px', borderRadius: '4px', border: '1.5px solid #10b981', fontSize: '11.5px', outline: 'none' }}
                              />
                              <button
                                onClick={() => handleSaveInline(p.id, 'stock', inlineEdit.val)}
                                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setInlineEdit(null)}
                                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '10px', cursor: 'pointer' }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="num-font" style={{ fontSize: '14px', fontWeight: '900', color: isZero ? '#dc2626' : isLow ? '#d97706' : '#0f172a' }}>
                                  {p.stock} <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>{p.unit}</span>
                                </span>
                                <button
                                  onClick={() => { setInlineEdit({ id: p.id, field: 'stock', val: String(p.stock) }); triggerHaptic('light'); }}
                                  style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0px 3px', fontSize: '9px', cursor: 'pointer' }}
                                  title="স্টক সরাসরি সংশোধন করুন"
                                >
                                  ✏️
                                </button>
                              </div>
                              {p.subUnit && Number(p.conversionRatio) > 1 && (
                                <div style={{ fontSize: '10.5px', color: '#4338ca', fontWeight: '800', marginTop: '1px' }}>
                                  ≈ {Math.round(p.stock * Number(p.conversionRatio) * 100) / 100} {p.subUnit}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Stock Status Badge */}
                          {isZero ? (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                              🚨 স্টক শেষ
                            </span>
                          ) : isLow ? (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                              ⚠️ কম স্টক
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                              ✓ পর্যাপ্ত স্টক
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Quick Stock Increment / Decrement */}
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            onClick={() => handleQuickAddStock(p, -1)}
                            disabled={p.stock <= 0}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', cursor: p.stock <= 0 ? 'not-allowed' : 'pointer' }}
                            title="১ পিস কমান"
                          >
                            -১
                          </button>
                          <button
                            onClick={() => handleQuickAddStock(p, 1)}
                            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                            title="+১ পিস যোগ করুন"
                          >
                            +১
                          </button>
                          <button
                            onClick={() => handleQuickAddStock(p, 10)}
                            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                            title="+১০ পিস যোগ করুন"
                          >
                            +১০
                          </button>
                          <button
                            onClick={() => handleQuickAddStock(p, 50)}
                            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                            title="+৫০ পিস যোগ করুন"
                          >
                            +৫০
                          </button>
                        </div>
                      </td>

                      {/* Column 5: Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => openRestockModal(p)}
                            style={{
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="নতুন মাল স্টকে তুলুন"
                          >
                            <span>➕</span> মাল তুলুন
                          </button>
                          <button
                            onClick={() => openHistoryModal(p)}
                            style={{
                              background: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              padding: '4px 7px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="স্টক ইন ও বিক্রির হিস্ট্রি অডিট দেখুন"
                          >
                            <span>📜</span> হিস্ট্রি
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span>✏️</span> এডিট
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title="পণ্যটি মুছে ফেলুন"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )
      )}

      {/* VIEW 2: CARD GRID VIEW */}
      {viewMode === 'grid' && (
        loading ? (
          <DataLoader type="skeleton-grid" count={8} text="পণ্য কার্ড লোড হচ্ছে..." />
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
          {paginatedProducts.map(p => {
            const isLow = p.stock <= (p.lowStockThreshold || 5);
            return (
              <div
                key={p.id}
                className="mobile-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px',
                  border: isLow ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                  background: isLow ? '#fffaf0' : '#ffffff',
                  borderRadius: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '26px' }}>{p.icon || '📦'}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: isLow ? '#fee2e2' : '#ecfdf5',
                      color: isLow ? '#dc2626' : '#059669'
                    }}>
                      {isLow ? '⚠️ কম স্টক' : '✓ পর্যাপ্ত'}
                    </span>
                  </div>

                  <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                    {p.banglaName || p.name}
                  </strong>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block' }}>
                    বারকোড: #{p.barcode}
                  </span>
                  {p.genericName && (
                    <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '700', display: 'block', marginTop: '2px' }}>
                      🧪 {p.genericName}
                    </span>
                  )}
                  {p.size && (
                    <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', display: 'block', marginTop: '2px' }}>
                      🏷️ সাইজ: {p.size}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>কেনার দাম</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="num-font" style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                          ৳{p.purchasePrice || 0}
                        </span>
                        <button
                          onClick={() => { setInlineEdit({ id: p.id, field: 'purchasePrice', val: String(p.purchasePrice || 0) }); triggerHaptic('light'); }}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 4px', fontSize: '9px', cursor: 'pointer' }}
                        >
                          ✏️
                        </button>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>বিক্রয় মূল্য</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>
                          ৳{p.sellingPrice}
                        </span>
                        <button
                          onClick={() => { setInlineEdit({ id: p.id, field: 'sellingPrice', val: String(p.sellingPrice) }); triggerHaptic('light'); }}
                          style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                        >
                          ✏️ দর
                        </button>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>বর্তমান স্টক</span>
                      <span className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: isLow ? '#dc2626' : '#0f172a' }}>
                        {p.stock} <span style={{ fontSize: '11px', fontWeight: '600' }}>{p.unit}</span>
                      </span>
                      {p.subUnit && Number(p.conversionRatio) > 1 && (
                        <span style={{ display: 'block', fontSize: '10px', color: '#4338ca', fontWeight: '800' }}>
                          ≈ {Math.round(p.stock * Number(p.conversionRatio) * 100) / 100} {p.subUnit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline quick edit input in card */}
                  {inlineEdit && inlineEdit.id === p.id && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                      <input
                        type="number"
                        value={inlineEdit.val}
                        onChange={(e) => handleInlineValChange(e.target.value)}
                        className="num-font"
                        autoFocus
                        style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1.5px solid #10b981', fontSize: '13px', outline: 'none' }}
                      />
                      <button
                        onClick={() => inlineEdit && handleSaveInline(p.id, inlineEdit.field, inlineEdit.val)}
                        style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 10px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setInlineEdit(null)}
                        style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Quick Add Stock +10 / +50 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleQuickAddStock(p, 10)}
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        +১০
                      </button>
                      <button
                        onClick={() => handleQuickAddStock(p, 50)}
                        style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 6px', borderRadius: '6px', fontSize: '10.5px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        +৫০
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openRestockModal(p)}
                        style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '4px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                        title="নতুন মাল স্টকে তুলুন"
                      >
                        ➕ মাল তুলুন
                      </button>
                      <button
                        onClick={() => openHistoryModal(p)}
                        style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        title="স্টক ইন ও বিক্রির হিস্ট্রি অডিট দেখুন"
                      >
                        📜 হিস্ট্রি
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        ✏️ এডিট
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 6px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* Pagination Component */}
      {totalStockCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalStockCount}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            triggerHaptic('light');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
            triggerHaptic('light');
          }}
          pageSizeOptions={[15, 25, 50, 100]}
          itemLabel="পণ্য"
          themeColor={theme.primaryColor}
        />
      )}

      {/* FULL PRODUCT EDIT MODAL */}
      {editingProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            boxSizing: 'border-box'
          }}>
            {/* Sticky Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              flexShrink: 0
            }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✏️</span> <span>পণ্য তথ্য ও দাম সম্পাদনা</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box', width: '100%' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>পণ্যের নাম: *</label>
                  <input
                    type="text"
                    value={editForm.banglaName}
                    onChange={(e) => setEditForm({ ...editForm, banglaName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>কেনার দাম (৳):</label>
                    <input
                      type="number"
                      value={editForm.purchasePrice}
                      onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                      required
                      className="num-font"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>বিক্রয় মূল্য (৳): *</label>
                    <input
                      type="number"
                      value={editForm.sellingPrice}
                      onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                      required
                      className="num-font"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>বর্তমান স্টক:</label>
                    <input
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                      required
                      className="num-font"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>পরিমাপের একক:</label>
                    <IndustryUnitSelect
                      value={editForm.unit}
                      onChange={(val) => setEditForm({ ...editForm, unit: val })}
                      industryId={indId}
                    />
                  </div>
                </div>

                {/* ⚖️ মাল্টি-ইউনিট / সাব-একক কনফিগারেশন (যেমন: ১ বস্তা = ৫০ কেজি, ১ কার্টন = ২৪ পিস) */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1.5px dashed #cbd5e1', display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>⚖️ খুচরা / সাব-একক রূপান্তর (ঐচ্ছিক):</span>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>যেমন: বস্তা বনাম কেজি</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>সাব-একক নাম:</label>
                      <input
                        type="text"
                        placeholder="যেমন: কেজি, গ্রাম, পিস"
                        value={editForm.subUnit}
                        onChange={(e) => setEditForm({ ...editForm, subUnit: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>১ {editForm.unit || 'মূল এককে'} কত {editForm.subUnit || 'সাব-একক'}?</label>
                      <input
                        type="number"
                        placeholder="যেমন: 50"
                        value={editForm.conversionRatio}
                        onChange={(e) => setEditForm({ ...editForm, conversionRatio: e.target.value })}
                        className="num-font"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  {editForm.subUnit && Number(editForm.conversionRatio) > 1 && (
                    <div style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>
                      ✓ মেমোতে ১ {editForm.subUnit} বিক্রির সময় স্বয়ংক্রিয়ভাবে {Math.round((Number(editForm.sellingPrice || 0) / Number(editForm.conversionRatio)) * 100) / 100} টাকা দর হবে এবং স্টক থেকে ১/{editForm.conversionRatio} {editForm.unit} কমবে।
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>বারকোড নম্বর:</label>
                  <input
                    type="text"
                    value={editForm.barcode}
                    onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* 💊 PHARMACY SPECIAL FIELDS */}
                {indId === 'cat-pharmacy' && (
                  <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', border: '1px solid #a7f3d0', display: 'grid', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#065f46' }}>💊 ফার্মেসির বিশেষ তথ্য:</span>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>জেনেরিক নাম / ফর্মুলা:</label>
                      <input
                        type="text"
                        placeholder="যেমন: Paracetamol 500mg"
                        value={editForm.genericName}
                        onChange={(e) => setEditForm({ ...editForm, genericName: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>মেয়াদোত্তীর্ণের তারিখ:</label>
                        <input
                          type="date"
                          value={editForm.expiryDate}
                          onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>ফার্মা কোম্পানি:</label>
                        <input
                          type="text"
                          placeholder={getIndustryBrandPlaceholder(indId)}
                          value={editForm.brand}
                          onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 👗 CLOTHING & SHOES SPECIAL FIELDS */}
                {(indId === 'cat-clothing' || indId === 'cat-shoes') && (
                  <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px', border: '1px solid #ddd6fe', display: 'grid', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#6d28d9' }}>
                      {indId === 'cat-shoes' ? '👞 জুতার সাইজ ও কালার:' : '👗 পোশাকের সাইজ ও কালার:'}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#5b21b6', marginBottom: '3px' }}>সাইজ:</label>
                        <input
                          type="text"
                          placeholder={indId === 'cat-shoes' ? 'যেমন: 40, 41, 42' : 'যেমন: M, L, XL, 32'}
                          value={editForm.size}
                          onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#5b21b6', marginBottom: '3px' }}>রং / কালার:</label>
                        <input
                          type="text"
                          placeholder="যেমন: কালো, নীল, সাদা"
                          value={editForm.color}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 📱 MOBILE SPECIAL FIELDS */}
                {indId === 'cat-mobile' && (
                  <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', border: '1px solid #bae6fd', display: 'grid', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1' }}>📱 মোবাইল ব্র্যান্ড ও ওয়ারেন্টি:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0284c7', marginBottom: '3px' }}>ব্র্যান্ড:</label>
                        <input
                          type="text"
                          placeholder="যেমন: Samsung / Xiaomi"
                          value={editForm.brand}
                          onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0284c7', marginBottom: '3px' }}>ওয়ারেন্টি মেয়াদ:</label>
                        <input
                          type="text"
                          placeholder="যেমন: ১ বছর অফিসিয়াল"
                          value={editForm.warranty}
                          onChange={(e) => setEditForm({ ...editForm, warranty: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', gap: '10px', flexShrink: 0 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '13px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  ✓ পরিবর্তন সেভ করুন
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '13px 18px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD PRODUCT MODAL */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            boxSizing: 'border-box'
          }}>
            {/* Sticky Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              flexShrink: 0
            }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>➕</span> <span>নতুন পণ্য যুক্ত করুন</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box', width: '100%' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: '800', color: '#475569' }}>পণ্যের নাম: *</label>
                    <button
                      type="button"
                      onClick={() => startVoiceInputForField((v) => setAddForm(prev => ({ ...prev, banglaName: v })), false, 'পণ্যের নাম')}
                      style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: '#dc2626', cursor: 'pointer', fontWeight: '800' }}
                    >
                      🎙️ মুখে বলুন
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={getIndustryProductPlaceholder(indId)}
                    value={addForm.banglaName}
                    onChange={(e) => setAddForm({ ...addForm, banglaName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />

                  {/* 💡 Quick Category Sample Suggestions Chips */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginTop: '6px' }} className="no-scrollbar">
                    {getIndustryProductSuggestions(indId).slice(0, 5).map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAddForm(prev => ({
                            ...prev,
                            banglaName: sug.name,
                            sellingPrice: String(sug.price),
                            purchasePrice: sug.costPrice ? String(sug.costPrice) : prev.purchasePrice,
                            unit: sug.unit || prev.unit,
                            genericName: sug.generic || prev.genericName,
                            brand: sug.brand || prev.brand,
                            size: sug.size || prev.size
                          }));
                          triggerHaptic('light');
                        }}
                        style={{
                          flexShrink: 0,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#334155',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        title={`${sug.name} - দর: ৳${sug.price}`}
                      >
                        {sug.icon} {sug.name.split(' ')[0]} {sug.name.split(' ')[1] || ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>বিক্রয় মূল্য: *</label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField((v) => setAddForm(prev => ({ ...prev, sellingPrice: v })), true, 'বিক্রয় মূল্য (টাকা)')}
                        style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '1px 6px', fontSize: '10.5px', color: '#059669', cursor: 'pointer', fontWeight: '800' }}
                      >
                        🎙️
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder="৳ বিক্রয় মূল্য"
                      value={addForm.sellingPrice}
                      onChange={(e) => setAddForm({ ...addForm, sellingPrice: e.target.value })}
                      required
                      className="num-font"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>কেনার দাম:</label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField((v) => setAddForm(prev => ({ ...prev, purchasePrice: v })), true, 'কেনার দাম (টাকা)')}
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '1px 6px', fontSize: '10.5px', color: '#2563eb', cursor: 'pointer', fontWeight: '800' }}
                      >
                        🎙️
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder="৳ কেনার দাম"
                      value={addForm.purchasePrice}
                      onChange={(e) => setAddForm({ ...addForm, purchasePrice: e.target.value })}
                      className="num-font"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>প্রাথমিক স্টক:</label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField((v) => setAddForm(prev => ({ ...prev, stock: v })), true, 'প্রাথমিক স্টক (সংখ্যা)')}
                        style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '1px 6px', fontSize: '10.5px', color: '#ca8a04', cursor: 'pointer', fontWeight: '800' }}
                      >
                        🎙️
                      </button>
                    </div>
                    <input
                      type="number"
                      value={addForm.stock}
                      onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                      required
                      className="num-font"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>পরিমাপের একক:</label>
                    <IndustryUnitSelect
                      value={addForm.unit}
                      onChange={(val) => setAddForm({ ...addForm, unit: val })}
                      industryId={indId}
                    />
                  </div>
                </div>

                {/* ⚖️ মাল্টি-ইউনিট / সাব-একক কনফিগারেশন (যেমন: ১ বস্তা = ৫০ কেজি, ১ কার্টন = ২৪ পিস) */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1.5px dashed #cbd5e1', display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>⚖️ খুচরা / সাব-একক রূপান্তর (ঐচ্ছিক):</span>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>যেমন: বস্তা বনাম কেজি</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>সাব-একক নাম:</label>
                      <input
                        type="text"
                        placeholder="যেমন: কেজি, গ্রাম, পিস"
                        value={addForm.subUnit}
                        onChange={(e) => setAddForm({ ...addForm, subUnit: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>১ {addForm.unit || 'মূল এককে'} কত {addForm.subUnit || 'সাব-একক'}?</label>
                      <input
                        type="number"
                        placeholder="যেমন: 50"
                        value={addForm.conversionRatio}
                        onChange={(e) => setAddForm({ ...addForm, conversionRatio: e.target.value })}
                        className="num-font"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  {addForm.subUnit && Number(addForm.conversionRatio) > 1 && (
                    <div style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>
                      ✓ মেমোতে ১ {addForm.subUnit} বিক্রির সময় স্বয়ংক্রিয়ভাবে {Math.round((Number(addForm.sellingPrice || 0) / Number(addForm.conversionRatio)) * 100) / 100} টাকা দর হবে এবং স্টক থেকে ১/{addForm.conversionRatio} {addForm.unit} কমবে।
                    </div>
                  )}
                </div>

                {/* 🧮 Multi-Unit Sub-Unit Price Breakdown & Converter */}
                <MultiUnitBreakdownPreview
                  unit={addForm.unit}
                  price={Number(addForm.sellingPrice) || 0}
                  onApplyUnitPrice={(unitPrice) => setAddForm(prev => ({ ...prev, sellingPrice: String(unitPrice) }))}
                />

                {/* 💊 PHARMACY SPECIAL FIELDS */}
                {indId === 'cat-pharmacy' && (
                  <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', border: '1px solid #a7f3d0', display: 'grid', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#065f46' }}>💊 ফার্মেসির বিশেষ তথ্য:</span>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>জেনেরিক নাম / ফর্মুলা:</label>
                      <input
                        type="text"
                        placeholder="যেমন: Paracetamol 500mg"
                        value={addForm.genericName}
                        onChange={(e) => setAddForm({ ...addForm, genericName: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>মেয়াদোত্তীর্ণের তারিখ:</label>
                        <input
                          type="date"
                          value={addForm.expiryDate}
                          onChange={(e) => setAddForm({ ...addForm, expiryDate: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>ফার্মা কোম্পানি:</label>
                        <input
                          type="text"
                          placeholder={getIndustryBrandPlaceholder(indId)}
                          value={addForm.brand}
                          onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 👗 CLOTHING & SHOES SPECIAL FIELDS */}
                {(indId === 'cat-clothing' || indId === 'cat-shoes') && (
                  <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px', border: '1px solid #ddd6fe', display: 'grid', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#6d28d9' }}>
                      {indId === 'cat-shoes' ? '👞 জুতার সাইজ ও ব্র্যান্ড:' : '👗 পোশাকের সাইজ ও কালার:'}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#5b21b6', marginBottom: '3px' }}>সাইজ:</label>
                        <input
                          type="text"
                          placeholder={indId === 'cat-shoes' ? 'যেমন: 40, 41, 42' : 'যেমন: M, L, XL, 32'}
                          value={addForm.size}
                          onChange={(e) => setAddForm({ ...addForm, size: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#5b21b6', marginBottom: '3px' }}>রং / কালার:</label>
                        <input
                          type="text"
                          placeholder="যেমন: কালো, নীল, সাদা"
                          value={addForm.color}
                          onChange={(e) => setAddForm({ ...addForm, color: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 📱 MOBILE SPECIAL FIELDS */}
                {indId === 'cat-mobile' && (
                  <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', border: '1px solid #bae6fd', display: 'grid', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1' }}>📱 মোবাইল ব্র্যান্ড ও ওয়ারেন্টি:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0284c7', marginBottom: '3px' }}>ব্র্যান্ড:</label>
                        <input
                          type="text"
                          placeholder="যেমন: Samsung / Xiaomi"
                          value={addForm.brand}
                          onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0284c7', marginBottom: '3px' }}>ওয়ারেন্টি মেয়াদ:</label>
                        <input
                          type="text"
                          placeholder="যেমন: ১ বছর অফিসিয়াল"
                          value={addForm.warranty}
                          onChange={(e) => setAddForm({ ...addForm, warranty: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#ffffff', flexShrink: 0 }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '13px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  ✓ পণ্য যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Reorder Sheet Modal */}
      {showOrderModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                📋 ডিলার WhatsApp অর্ডার ফর্দ
              </h3>
              <button onClick={() => setShowOrderModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 12px' }}>
              নিচের ফর্দটি আপনার প্রয়োজনমতো সম্পাদনা করে ডিলারের হোয়াটসঅ্যাপে পাঠাতে পারবেন:
            </p>

            <textarea
              value={orderDraft}
              onChange={(e) => setOrderDraft(e.target.value)}
              rows={8}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '14px',
                lineHeight: 1.5
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={sendToWhatsApp}
                style={{
                  flex: 1,
                  background: '#25d366',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>💬</span> WhatsApp-এ পাঠান
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(orderDraft);
                  alert('ফর্দ কপি করা হয়েছে!');
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                কপি
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraScanner && (
        <CameraBarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScanSuccess={(barcode) => {
            setSearch(barcode);
            speakAnnouncement(`বারকোড ${barcode} স্ক্যান হয়েছে`);
            triggerHaptic('success');
            setShowCameraScanner(false);
          }}
        />
      )}

      {/* 📤 Bulk CSV / Excel Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📤</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  বাল্ক প্রোডাক্ট ইমপোর্ট (CSV / Excel)
                </h3>
              </div>
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, lineHeight: 1.5 }}>
              আপনার এক্সেল বা CSV ফাইল আপলোড করুন। ফাইলটিতে কমপক্ষে <strong>পণ্যের নাম</strong> এবং <strong>বিক্রয় মূল্য</strong> কলাম থাকতে হবে।
            </p>

            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '24px 16px',
              textAlign: 'center',
              background: '#f8fafc',
              marginBottom: '16px',
              cursor: 'pointer'
            }}>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0284c7' }}>
                  {importFile ? importFile.name : 'CSV ফাইল নির্বাচন করতে ক্লিক করুন'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  সাপোর্টেড ফরম্যাট: .csv (UTF-8)
                </div>
              </label>
            </div>

            {importPreview.length > 0 && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '800', color: '#065f46', fontSize: '13px' }}>
                  ✓ {importPreview.length}টি পণ্য ফাইলে পাওয়া গেছে!
                </div>
                <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                  প্রথম পণ্য: {importPreview[0]['পণ্যের নাম'] || importPreview[0]['name'] || Object.values(importPreview[0])[0]}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview([]); }}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={importPreview.length === 0 || importing}
                style={{
                  flex: 2,
                  background: importPreview.length === 0 || importing ? '#94a3b8' : '#0284c7',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  color: '#ffffff',
                  cursor: importPreview.length === 0 || importing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {importing ? 'ইমপোর্ট হচ্ছে...' : `📥 ${importPreview.length}টি পণ্য স্টকে যুক্ত করুন`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ Voice Stock-In & Price Update Modal */}
      {showVoiceStockModal && (
        <VoiceStockInModal
          isOpen={showVoiceStockModal}
          onClose={() => setShowVoiceStockModal(false)}
          products={products}
          onStockUpdated={loadStock}
        />
      )}

      {/* ➕ মাল তুলুন (Restock Modal) */}
      {showRestockModal && restockProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                  ➕ নতুন মাল তুলুন (Restock)
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {restockProduct.banglaName || restockProduct.name} • বর্তমান মজুদ: {restockProduct.stock} {restockProduct.unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    কত মাল তুলছেন? *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="যেমন: 2 বা 50"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="num-font"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    একক
                  </label>
                  <select
                    value={restockUnit}
                    onChange={(e) => setRestockUnit(e.target.value)}
                    style={{ width: '100%', padding: '10px 8px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value={restockProduct.unit}>{restockProduct.unit}</option>
                    {restockProduct.subUnit && (
                      <option value={restockProduct.subUnit}>{restockProduct.subUnit}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  কেনার রেট / একক মূল্য (৳)
                </label>
                <input
                  type="number"
                  placeholder="৳ কেনার দাম"
                  value={restockCost}
                  onChange={(e) => setRestockCost(e.target.value)}
                  className="num-font"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
                {Number(restockCost) > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669', fontWeight: '700', marginTop: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={updatePurchasePrice}
                      onChange={(e) => setUpdatePurchasePrice(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    পণ্যের ক্রয়মূল্য (কেনার দর) ৳{restockCost}-এ আপডেট করুন
                  </label>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  মহাজন / সাপ্লায়ারের নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: হাজী ট্রেডার্স / মেসার্স কালাম ব্রাদার্স"
                  value={restockSupplier}
                  onChange={(e) => setRestockSupplier(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  নোট বা বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: নতুন বস্তা লট নং ১২"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {restockQty && restockProduct.subUnit && restockUnit === restockProduct.subUnit && Number(restockProduct.conversionRatio) > 1 && (
                <div style={{ background: '#ecfdf5', padding: '8px 12px', borderRadius: '10px', fontSize: '11.5px', color: '#047857', border: '1px solid #a7f3d0' }}>
                  💡 {restockQty} {restockUnit} মূল স্টক এককে রূপান্তর হয়ে +{(Number(restockQty) / Number(restockProduct.conversionRatio)).toFixed(2)} {restockProduct.unit} হিসেবে স্টকে যুক্ত হবে।
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submittingRestock || !restockQty}
                  style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                >
                  {submittingRestock ? 'মাল উঠছে...' : '✓ মাল স্টকে জমা করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📜 স্টক ইন ও বিক্রির হিস্ট্রি অডিট রিপোর্ট (Stock In/Out Timeline Modal) */}
      {showHistoryModal && historyProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📜</span> <span>স্টক ইন ও বিক্রি হিস্ট্রি অডিট</span>
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {historyProduct.banglaName || historyProduct.name} • বর্তমান মজুদ: <strong style={{ color: '#0f172a' }}>{historyProduct.stock} {historyProduct.unit}</strong>
                  {historyProduct.subUnit && Number(historyProduct.conversionRatio) > 1 && (
                    <span> ({Math.round(historyProduct.stock * historyProduct.conversionRatio)} {historyProduct.subUnit})</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {loadingHistory ? (
                <DataLoader text="স্টক ও বিক্রির ইতিহাস লোড হচ্ছে..." />
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '6px' }}>📦</span>
                  এই পণ্যের এখনো কোনো পৃথক স্টক বা বিক্রির হিস্ট্রি রেকর্ড নেই।
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {historyLogs.map((log: any) => {
                    const isInflow = log.type === 'stock_in';
                    const formattedDate = new Date(log.created_at).toLocaleDateString('bn-BD', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    }) + ' ' + new Date(log.created_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={log.id}
                        style={{
                          background: isInflow ? '#f0fdf4' : '#fff7ed',
                          border: `1px solid ${isInflow ? '#bbf7d0' : '#fed7aa'}`,
                          borderRadius: '12px',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '900',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background: isInflow ? '#dcfce7' : '#ffedd5',
                              color: isInflow ? '#15803d' : '#c2410c'
                            }}>
                              {isInflow ? '📥 মাল তোলা (Stock In)' : '🛒 মেমো বিক্রি (Sale)'}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {log.source_ref || (isInflow ? 'মহাজন চালান' : 'মেমো')}
                            </span>
                          </div>
                          {log.note && (
                            <span style={{ fontSize: '11px', color: '#475569', display: 'block', marginTop: '3px' }}>
                              নোট: {log.note}
                            </span>
                          )}
                          <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                            📅 {formattedDate}
                          </span>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            className="num-font"
                            style={{
                              fontSize: '15px',
                              fontWeight: '900',
                              color: isInflow ? '#166534' : '#c2410c',
                              display: 'block'
                            }}
                          >
                            {isInflow ? `+${log.quantity}` : `-${log.quantity}`} {log.unit}
                          </span>
                          {log.base_quantity && log.unit !== historyProduct.unit && (
                            <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                              (মূল স্টক: {isInflow ? '+' : '-'}{log.base_quantity} {historyProduct.unit})
                            </span>
                          )}
                          {log.unit_price > 0 && (
                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                              দর: ৳{log.unit_price}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: '800', cursor: 'pointer' }}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
