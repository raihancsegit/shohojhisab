'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { getIndustryTheme } from '../../lib/industryConfig';
import Pagination from '../../components/Pagination';
import { exportToCSV, parseCSV } from '../../lib/exportUtils';
import VoiceKhataModal from '../../components/VoiceKhataModal';
import DataLoader from '../../components/DataLoader';
import { triggerFieldVoiceInput } from '../../lib/voiceFieldUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playDeleteSound } from '../../lib/audioFeedbackUtils';

export default function KhataPage() {
  const { tenant, activeRoleMode, triggerHaptic, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id;
  const theme = getIndustryTheme(tenant?.industryId);
  const indId = tenant?.industryId || 'cat-grocery';

  // Filter and Search
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'due' | 'zero'>('all');
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');

  // Delete Customer state
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Direct Customer Voice Entry state (In-Card & In-Ledger)
  const [voiceCustomerModal, setVoiceCustomerModal] = useState<any | null>(null);
  const [voiceCustomerListening, setVoiceCustomerListening] = useState(false);
  const [voiceCustomerTranscript, setVoiceCustomerTranscript] = useState('');
  const [voiceCustomerSubmitting, setVoiceCustomerSubmitting] = useState(false);
  const [voiceCustomerStatus, setVoiceCustomerStatus] = useState('');
  const [voiceRecognitionInstance, setVoiceRecognitionInstance] = useState<any>(null);

  // Quick Add Due Modal state with Stock Product Integration
  const [showAddDueModal, setShowAddDueModal] = useState<any>(null);
  const [dueMode, setDueMode] = useState<'stock' | 'custom'>('stock');
  const [productSearch, setProductSearch] = useState('');
  const [selectedDueProducts, setSelectedDueProducts] = useState<Array<{
    productId?: string;
    name: string;
    quantity: number;
    price: number;
    unit?: string;
    stock?: number;
    icon?: string;
  }>>([]);
  const [addDueAmount, setAddDueAmount] = useState('');
  const [addDueItems, setAddDueItems] = useState('');
  const [addDueSubmitting, setAddDueSubmitting] = useState(false);

  // Detailed Due Ledger History Modal state
  const [selectedLedger, setSelectedLedger] = useState<any | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [cardHistoryData, setCardHistoryData] = useState<Record<string, any>>({});
  const [cardHistoryOpen, setCardHistoryOpen] = useState<Record<string, boolean>>({});

  // Dedicated Voice Khata Modal State
  const [showVoiceKhataModal, setShowVoiceKhataModal] = useState(false);

  // Promise to Pay Date Modal
  const [showPromiseModal, setShowPromiseModal] = useState<any | null>(null);
  const [promiseDateInput, setPromiseDateInput] = useState('');
  const [promiseNotesInput, setPromiseNotesInput] = useState('');

  // Add Customer Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialDue, setInitialDue] = useState('0');
  const [creditLimit, setCreditLimit] = useState('5000');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    if (!currentTenantId) return;
    try {
      const res = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (res.ok) {
        const list = await res.json();
        setProducts(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('Failed to load products', e);
    }
  };

  const addProductToDue = (prod: any) => {
    triggerHaptic('light');
    setSelectedDueProducts(prev => {
      const existing = prev.find(i => (i.productId && i.productId === prod.id) || i.name === (prod.banglaName || prod.name));
      let updated;
      if (existing) {
        updated = prev.map(i => ((i.productId && i.productId === prod.id) || i.name === (prod.banglaName || prod.name))
          ? { ...i, quantity: Math.round((i.quantity + 1) * 100) / 100 }
          : i
        );
      } else {
        updated = [...prev, {
          productId: prod.id,
          name: prod.banglaName || prod.name,
          quantity: 1,
          price: Number(prod.sellingPrice || prod.selling_price) || 0,
          unit: prod.unit || 'পিস',
          stock: Number(prod.stock) || 0,
          icon: prod.icon || '📦'
        }];
      }
      const total = updated.reduce((s, it) => s + (it.quantity * it.price), 0);
      setAddDueAmount(total > 0 ? total.toString() : '');
      setAddDueItems(updated.map(i => `${i.name} (${i.quantity} ${i.unit || ''})`).join(', '));
      return updated;
    });
  };

  const updateDueItemQty = (index: number, delta: number) => {
    triggerHaptic('light');
    setSelectedDueProducts(prev => {
      const item = prev[index];
      if (!item) return prev;
      let step = delta;
      if (item.quantity <= 1 && Math.abs(delta) === 1) {
        step = delta > 0 ? 0.25 : -0.25;
      }
      const newQty = Math.max(0.05, Math.round((item.quantity + step) * 1000) / 1000);
      const updated = [...prev];
      updated[index] = { ...item, quantity: newQty };
      const total = updated.reduce((s, it) => s + (it.quantity * it.price), 0);
      setAddDueAmount(total > 0 ? total.toString() : '');
      setAddDueItems(updated.map(i => `${i.name} (${i.quantity} ${i.unit || ''})`).join(', '));
      return updated;
    });
  };

  const removeDueItem = (index: number) => {
    triggerHaptic('light');
    setSelectedDueProducts(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const total = updated.reduce((s, it) => s + (it.quantity * it.price), 0);
      setAddDueAmount(total > 0 ? total.toString() : '');
      setAddDueItems(updated.map(i => `${i.name} (${i.quantity} ${i.unit || ''})`).join(', '));
      return updated;
    });
  };

  const handleAddDueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddDueModal?.id || !addDueAmount) return;
    setAddDueSubmitting(true);
    try {
      const summary = addDueItems || (selectedDueProducts.length > 0 ? selectedDueProducts.map(i => `${i.name} (${i.quantity} ${i.unit || ''})`).join(', ') : 'বাকি পণ্য সামগ্রী');
      const itemsPayload = selectedDueProducts.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        unit: i.unit
      }));

      const res = await fetch('/api/customers/add-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: showAddDueModal.id,
          amount: Number(addDueAmount) || 0,
          itemsSummary: summary,
          items: itemsPayload
        })
      });
      if (res.ok) {
        await Promise.all([loadCustomers(), loadProducts()]);
        speakAnnouncement(`${showAddDueModal.name} এর খাতায় ৳${addDueAmount} টাকা বাকি যোগ ও স্টক মাইনাস হয়েছে।`);
        triggerHaptic('success');
        setNotice(`✓ "${showAddDueModal.name}" এর খাতায় ৳${addDueAmount} টাকা বাকি যোগ হয়েছে (স্টক আপডেট সম্পন্ন)!`);
        setShowAddDueModal(null);
        setAddDueAmount('');
        setAddDueItems('');
        setSelectedDueProducts([]);
        setProductSearch('');
        setTimeout(() => setNotice(''), 4000);
      } else {
        const err = await res.json();
        alert(err.error || 'বাকি যোগ করতে সমস্যা হয়েছে');
      }
    } catch (e: any) {
      console.error('Failed to add due', e);
      alert('বাকি যোগ করতে সমস্যা হয়েছে: ' + (e?.message || 'Error'));
    } finally {
      setAddDueSubmitting(false);
    }
  };

  const loadCustomerLedger = async (customer: any) => {
    if (!customer?.id) return;
    setLedgerLoading(true);
    setSelectedLedger({ customer, ledger: [] });
    try {
      const res = await fetch(`/api/customers/${customer.id}/ledger`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLedger(data);
      }
    } catch (e) {
      console.error('Failed to load customer ledger', e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const toggleInCardHistory = async (customer: any) => {
    const custId = customer.id;
    triggerHaptic('light');
    if (cardHistoryOpen[custId]) {
      setCardHistoryOpen(prev => ({ ...prev, [custId]: false }));
      return;
    }

    setCardHistoryOpen(prev => ({ ...prev, [custId]: true }));
    if (!cardHistoryData[custId]) {
      try {
        const res = await fetch(`/api/customers/${custId}/ledger`);
        if (res.ok) {
          const data = await res.json();
          setCardHistoryData(prev => ({ ...prev, [custId]: data.ledger || [] }));
        }
      } catch (e) {}
    }
  };

  // Group ledger entries by Date (e.g. ৭ সেপ্টেম্বর ২০২৬, ৪ সেপ্টেম্বর ২০২৬)
  const groupLedgerByDate = (ledger: any[]) => {
    const groups: { [date: string]: any[] } = {};
    (ledger || []).forEach(entry => {
      const d = entry.date || 'পূর্বে';
      if (!groups[d]) groups[d] = [];
      groups[d].push(entry);
    });
    return groups;
  };

  // Send a specific transaction memo to WhatsApp
  const sendTransactionWhatsApp = (customer: any, entry: any) => {
    const cleanPhone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const isPay = entry.isPayment || entry.paymentMethod === 'due_payment';
    const itemsList = entry.items && entry.items.length > 0 
      ? entry.items.map((it: any) => `• ${it.name} (${it.quantity}টি × ৳${it.price || it.unitPrice || 0}) = ৳${it.total}`).join('\n')
      : (entry.note || 'বাকি পণ্য সামগ্রী');

    let msg = `*${tenant?.shopName || 'আমাদের দোকান'}*\n`;
    msg += `তারিখ: ${entry.date} (${entry.time})\n`;
    msg += `মেমো নং: #${entry.invoiceNo}\n`;
    msg += `--------------------------\n`;
    if (isPay) {
      msg += `🟢 জমা গ্রহণ: ৳${entry.paidAmount} টাকা\n`;
      msg += `বিবরণ: ${entry.note || 'বাকি আদায় জমা'}\n`;
    } else {
      msg += `🔴 বাকি নেওয়া পণ্যের ফর্দ:\n${itemsList}\n`;
      msg += `মেমো মোট: ৳${entry.totalAmount} | জমা: ৳${entry.paidAmount}\n`;
      msg += `যোগ হওয়া বাকি: ৳${entry.dueAmount} টাকা\n`;
    }
    msg += `--------------------------\n`;
    msg += `বর্তমান সর্বমোট বকেয়া: ৳${Number(customer.totalDue || customer.total_due || 0).toLocaleString('en-US')} টাকা\n`;
    msg += `ধন্যবাদ! 🛍️`;

    window.open(`https://wa.me/88${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSavePromiseDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPromiseModal?.id) return;
    try {
      const res = await fetch(`/api/customers/${showPromiseModal.id}/promise-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promiseDate: promiseDateInput,
          notes: promiseNotesInput
        })
      });
      if (res.ok) {
        speakAnnouncement(`${showPromiseModal.name} এর টাকা দেওয়ার তারিখ ${promiseDateInput} সেট হয়েছে।`);
        triggerHaptic('success');
        setNotice(`✓ "${showPromiseModal.name}" এর টাকা দেওয়ার তারিখ সংরক্ষিত হয়েছে!`);
        setShowPromiseModal(null);
        setPromiseDateInput('');
        setPromiseNotesInput('');
        loadCustomers();
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
  };

  const loadCustomers = async () => {
    if (!currentTenantId) {
      setCustomers([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/customers?tenantId=${currentTenantId}`);
      if (res.ok) {
        const list = await res.json();
        setCustomers(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('Failed to load customers', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDealers = async () => {
    if (!currentTenantId) {
      setDealers([]);
      return;
    }
    try {
      const res = await fetch(`/api/dealers?tenantId=${currentTenantId}`);
      if (res.ok) {
        const list = await res.json();
        setDealers(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('Failed to load dealers', e);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadProducts();
    loadDealers();

    const handleVoiceSuccess = () => {
      loadCustomers();
      loadProducts();
      loadDealers();
    };

    window.addEventListener('voice-action-success', handleVoiceSuccess);
    return () => {
      window.removeEventListener('voice-action-success', handleVoiceSuccess);
    };
  }, [currentTenantId]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currentTenantId) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          name,
          phone: phone || 'ফোন নাম্বার নেই',
          address: address || 'দোকানের পরিচিত',
          totalDue: Number(initialDue) || 0,
          creditLimit: Number(creditLimit) || 5000
        })
      });
      if (res.ok) {
        await loadCustomers();
        setNotice(`✓ "${name}" সফলভাবে বাকি খাতায় যুক্ত হয়েছেন!`);
        setShowAddModal(false);
        setName('');
        setPhone('');
        setInitialDue('0');
        setAddress('');
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
    setSubmitting(false);
  };

  const startVoiceInputForField = (setter: (val: string) => void, isNumeric = false, label?: string) => {
    triggerFieldVoiceInput({ label, isNumeric, onResult: setter });
  };

  const handleCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal || !payAmount) return;

    try {
      const res = await fetch('/api/customers/due-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: showPayModal.id,
          amount: Number(payAmount) || 0
        })
      });
      if (res.ok) {
        await loadCustomers();
        speakAnnouncement(`${showPayModal.name} ভাই ${payAmount} টাকা বাকি পরিশোধ করেছেন।`);
        triggerHaptic('success');
        setNotice(`✓ ৳${payAmount} টাকা বাকি আদায় সফলভাবে রেকর্ড হয়েছে!`);
        setShowPayModal(null);
        setPayAmount('');
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
  };

  const sendWhatsAppReminder = (customer: any) => {
    const due = Number(customer.totalDue || customer.total_due || 0);
    const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const promiseStr = customer.promiseDate || customer.promise_date ? ` (পরিশোধের প্রতিশ্রুত তারিখ: ${customer.promiseDate || customer.promise_date})` : '';
    const passbookUrl = `http://localhost:3005/khata/passbook?phone=${cleanPhone}`;
    const textMsg = encodeURIComponent(
      `আসসালামু আলাইকুম ${customer.name} ভাই,\n${tenant?.shopName || 'আমাদের দোকান'}-এ আপনার বর্তমান বকেয়া বাকি ৳${due.toLocaleString('en-US')} টাকা${promiseStr}।\n\nঅনুগ্রহ করে সুবিধামতো সময়ে পরিশোধের অনুরোধ রইল।\nবিকাশ/নগদ পাঠাতে: ${tenant?.phone || '০১৭XXXXXXXX'}\n\n📱 আপনার ডিজিটাল খাতা ও মেমো স্টেটমেন্ট দেখুন:\n${passbookUrl}\n\nধন্যবাদ,\n${tenant?.shopName || 'দোকান মালিক'}`
    );
    window.open(`https://wa.me/88${cleanPhone}?text=${textMsg}`, '_blank');
  };

  // Customer Deletion Handler
  const handleDeleteCustomer = async () => {
    if (!customerToDelete?.id) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        playDeleteSound();
        triggerHaptic('success');
        speakAnnouncement(`${customerToDelete.name} এর খাতা মুছে ফেলা হয়েছে।`);
        setNotice(`✓ "${customerToDelete.name}" বাকি খাতা থেকে সফলভাবে মুছে ফেলা হয়েছে!`);
        if (selectedLedger?.customer?.id === customerToDelete.id) {
          setSelectedLedger(null);
        }
        setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
        setCustomerToDelete(null);
        await loadCustomers();
        setTimeout(() => setNotice(''), 4000);
      } else {
        playWarningSound();
        const err = await res.json();
        alert(err.error || 'মুছে ফেলতে ব্যর্থ হয়েছে');
      }
    } catch (e) {
      playWarningSound();
      console.error('Delete customer error', e);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Individual Ledger Entry (Sale / Payment) Deletion Handler
  const handleDeleteEntry = async (entry: any) => {
    const isPayment = entry.isPayment || entry.paymentMethod === 'due_payment' || entry.payment_method === 'due_payment';
    const entryLabel = isPayment ? `৳${entry.paidAmount} টাকার জমা এন্ট্রি` : `৳${entry.dueAmount || entry.totalAmount} টাকার বাকি মেমো #${entry.invoiceNo}`;

    if (!confirm(`আপনি কি নিশ্চিত যে "${entryLabel}" মুছে ফেলতে চান?\nমুছে ফেললে কাস্টমারের মোট বাকি হিসাব স্বয়ংক্রিয়ভাবে সমন্বয় হবে।`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sales/${entry.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        playDeleteSound();
        triggerHaptic('success');
        setNotice(`✓ "${entryLabel}" সফলভাবে মুছে ফেলা হয়েছে!`);
        if (selectedLedger?.customer?.id) {
          await loadCustomerLedger(selectedLedger.customer);
        }
        await loadCustomers();
        setTimeout(() => setNotice(''), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'এন্ট্রি মুছতে ব্যর্থ হয়েছে');
      }
    } catch (e) {
      alert('সার্ভারে যোগাযোগ করা যায়নি');
    }
  };

  // Direct In-Ledger / In-Card Voice Entry
  const handleDirectCustomerVoiceSubmit = async (cust: any, spokenText: string) => {
    if (!cust?.id || !spokenText.trim()) return;
    setVoiceCustomerSubmitting(true);
    setVoiceCustomerStatus('এন্ট্রি প্রসেস হচ্ছে...');
    try {
      const res = await fetch(`/api/customers/${cust.id}/voice-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        playSuccessChime();
        triggerHaptic('success');
        const msg = result.message || 'বাকি আপডেট হয়েছে';
        speakAnnouncement(msg);
        setNotice(`✓ ${cust.name}: ${msg}`);
        setVoiceCustomerStatus(`✓ ${msg}`);
        await Promise.all([loadCustomers(), loadProducts()]);
        if (selectedLedger?.customer?.id === cust.id) {
          loadCustomerLedger(cust);
        }
        setTimeout(() => {
          setVoiceCustomerModal(null);
          setVoiceCustomerTranscript('');
          setVoiceCustomerStatus('');
        }, 1800);
        setTimeout(() => setNotice(''), 4000);
      } else {
        playWarningSound();
        triggerHaptic('warning');
        setVoiceCustomerStatus(result.error || 'ভয়েস বোঝা যায়নি, আবার বলুন');
      }
    } catch (e) {
      playWarningSound();
      setVoiceCustomerStatus('সার্ভারে যোগাযোগ করা যায়নি');
    } finally {
      setVoiceCustomerSubmitting(false);
    }
  };

  const directVoiceSilenceTimerRef = React.useRef<any>(null);

  const startCustomerVoice = (cust: any) => {
    triggerHaptic('medium');
    playMicStartSound();
    setVoiceCustomerModal(cust);
    setVoiceCustomerTranscript('');
    setVoiceCustomerStatus('শুনছি... বলুন: "৫০ টাকা বাকি" বা "১০০ টাকা জমা" বা "১ প্যাকেট চিনি বাকি"');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে মাইক্রোফোন সাপোর্ট নেই।');
      return;
    }

    try {
      if (voiceRecognitionInstance) {
        try { voiceRecognitionInstance.abort(); } catch (e) {}
      }
      if (directVoiceSilenceTimerRef.current) clearTimeout(directVoiceSilenceTimerRef.current);

      const rec = new SpeechRecognition();
      rec.lang = 'bn-BD';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setVoiceCustomerListening(true);
      };

      rec.onresult = (event: any) => {
        let finalStr = '';
        for (let i = 0; i < event.results.length; i++) {
          finalStr += event.results[i][0].transcript;
        }
        setVoiceCustomerTranscript(finalStr);

        // Auto-silence timer: 1.3 seconds after speech pauses, auto-submit!
        if (directVoiceSilenceTimerRef.current) clearTimeout(directVoiceSilenceTimerRef.current);
        directVoiceSilenceTimerRef.current = setTimeout(() => {
          if (finalStr.trim()) {
            try { rec.stop(); } catch (e) {}
            handleDirectCustomerVoiceSubmit(cust, finalStr.trim());
          }
        }, 1300);
      };

      rec.onerror = (e: any) => {
        console.warn('Customer speech error', e);
        setVoiceCustomerListening(false);
        setVoiceCustomerStatus('কথা বুঝতে সমস্যা হয়েছে। নিচের বাটনে আবার ক্লিক করুন।');
      };

      rec.onend = () => {
        setVoiceCustomerListening(false);
      };

      setVoiceRecognitionInstance(rec);
      rec.start();
    } catch (err) {
      console.error('Speech rec start error', err);
      setVoiceCustomerListening(false);
    }
  };

  const stopCustomerVoice = () => {
    if (voiceRecognitionInstance) {
      try {
        voiceRecognitionInstance.stop();
      } catch (e) {}
    }
    setVoiceCustomerListening(false);
  };

  // Date Check Helpers for Filtering
  const isTodayDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isYesterdayDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear();
  };

  const isThisWeekDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 7;
  };

  const isThisMonthDate = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const handleExportKhata = () => {
    const exportData = filtered.map((c) => ({
      name: c.name || '',
      phone: c.phone || '',
      totalDue: Number(c.totalDue || c.total_due || 0),
      creditLimit: Number(c.creditLimit || c.credit_limit || 0),
      promiseDate: c.promiseDate || c.promise_date || 'নাই',
      address: c.address || ''
    }));

    exportToCSV('Khata_Customer_Due_Ledger', exportData, [
      { key: 'name', label: 'গ্রাহকের নাম' },
      { key: 'phone', label: 'মোবাইল নাম্বার' },
      { key: 'totalDue', label: 'মোট বকেয়া বাকি (টাকা)' },
      { key: 'creditLimit', label: 'বাকি লিমিট (টাকা)' },
      { key: 'promiseDate', label: 'টাকা দেওয়ার তারিখ' },
      { key: 'address', label: 'ঠিকানা' }
    ]);
  };

  const totalReceivable = customers.reduce((acc, c) => acc + (Number(c.totalDue) || Number(c.total_due) || 0), 0);
  const receivableCount = customers.filter(c => (Number(c.totalDue) || Number(c.total_due) || 0) > 0).length;
  const totalPayable = dealers.reduce((acc, d) => acc + (Number(d.payable_due || d.payableDue) || 0), 0);
  const payableCount = dealers.filter(d => (Number(d.payable_due || d.payableDue) || 0) > 0).length;
  const netBalance = totalReceivable - totalPayable;
  const totalMarketDue = totalReceivable;
  const dueCustomerCount = receivableCount;

  // Filter Counts
  const countToday = customers.filter(c => isTodayDate(c.lastDateRaw || c.createdAt)).length;
  const countYesterday = customers.filter(c => isYesterdayDate(c.lastDateRaw || c.createdAt)).length;
  const countWeek = customers.filter(c => isThisWeekDate(c.lastDateRaw || c.createdAt)).length;
  const countMonth = customers.filter(c => isThisMonthDate(c.lastDateRaw || c.createdAt)).length;
  const countDue = customers.filter(c => (Number(c.totalDue || c.total_due || 0)) > 0).length;
  const countZero = customers.filter(c => (Number(c.totalDue || c.total_due || 0)) <= 0).length;

  // Reset page to 1 if search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFilter]);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q));
    if (!matchesSearch) return false;

    const due = Number(c.totalDue || c.total_due || 0);
    const dateRef = c.lastDateRaw || c.createdAt;

    if (selectedFilter === 'today') return isTodayDate(dateRef);
    if (selectedFilter === 'yesterday') return isYesterdayDate(dateRef);
    if (selectedFilter === 'week') return isThisWeekDate(dateRef);
    if (selectedFilter === 'month') return isThisMonthDate(dateRef);
    if (selectedFilter === 'due') return due > 0;
    if (selectedFilter === 'zero') return due <= 0;
    return true;
  });

  const totalKhataCustomers = filtered.length;
  const paginatedCustomers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      
      {/* 🎙️ INTERACTIVE VOICE ACTION BANNER */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          setShowVoiceKhataModal(true);
        }}
        style={{
          background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
          border: '1.5px solid #fca5a5',
          borderRadius: '14px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)',
          transition: 'transform 0.15s ease'
        }}
        className="clickable-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#ef4444',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '16px',
            flexShrink: 0
          }}>
            🎙️
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ভয়েসে বাকি খাতা এন্ট্রি
              <span style={{ fontSize: '9px', background: '#ef4444', color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>AI</span>
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '1px' }}>
              বলুন: <em>"রহিম এর খাতায় ৫০০ টাকা বাকি লেখো"</em>
            </div>
          </div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#b91c1c', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', flexShrink: 0 }}>
          শুরু ➔
        </span>
      </div>

      {/* Header & Total Due Cockpit */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '16px'
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: theme.textPrimary, background: theme.headerBadgeBg, padding: '2px 8px', borderRadius: '99px' }}>
            {theme.icon} {theme.khataLabel}
          </span>
          <h1 style={{ fontSize: 'clamp(17px, 4.5vw, 22px)', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px' }}>
            {theme.khataLabel} ও বকেয়া আদায়
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            বাকি হিসাব রাখুন ও হোয়াটসঅ্যাপে তাগাদা পাঠান
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportKhata}
            style={{
              background: '#047857',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(4, 120, 87, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📥</span> এক্সেল / CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: theme.primaryGradient,
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>➕</span> নতুন বাকি খাতা
          </button>
        </div>
      </div>

      {/* 🌟 Amar Dokan Style High-Contrast Hero Cockpit */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {/* 🟢 মোট পাবো (Customer Receivable) */}
        <div className="ui-card" style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.04) 100%)',
          border: '1.5px solid #10b981',
          borderRadius: '16px',
          padding: '16px 18px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🟢</span> মোট পাবো (গ্রাহক বাকি)
            </span>
            <span style={{ fontSize: '11px', fontWeight: '800', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '99px' }}>
              {receivableCount} জন বাকিদার
            </span>
          </div>
          <div className="num-font" style={{ fontSize: '32px', fontWeight: '900', color: '#047857', margin: '4px 0' }}>
            ৳{totalReceivable.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            দোকানের মোট নিবন্ধিত খরিদ্দার: {customers.length} জন
          </div>
        </div>

        {/* 🔴 মোট দেবো (Dealer / Supplier Payable) */}
        <div className="ui-card" style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.04) 100%)',
          border: '1.5px solid #ef4444',
          borderRadius: '16px',
          padding: '16px 18px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔴</span> মোট দেবো (মহাজন দেনা)
            </span>
            <Link
              href="/dealers"
              style={{
                fontSize: '11px',
                fontWeight: '800',
                background: '#fee2e2',
                color: '#991b1b',
                padding: '2px 8px',
                borderRadius: '99px',
                textDecoration: 'none'
              }}
            >
              {payableCount} জন ডিলার ➔
            </Link>
          </div>
          <div className="num-font" style={{ fontSize: '32px', fontWeight: '900', color: '#b91c1c', margin: '4px 0' }}>
            ৳{totalPayable.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            কোম্পানি / সরবরাহকারী মহাজনদের খাতা
          </div>
        </div>

        {/* ⚖️ নীট ব্যালেন্স / খাতা স্থিতি */}
        <div className="ui-card" style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1.5px solid #cbd5e1',
          borderRadius: '16px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚖️</span> নীট খাতা স্থিতি
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '99px',
              background: netBalance >= 0 ? '#ecfdf5' : '#fff1f2',
              color: netBalance >= 0 ? '#065f46' : '#991b1b'
            }}>
              {netBalance >= 0 ? 'পাওনা উদ্বৃত্ত' : 'দেনা অতিরিক্ত'}
            </span>
          </div>
          <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: netBalance >= 0 ? '#047857' : '#b91c1c', margin: '4px 0' }}>
            ৳{Math.abs(netBalance).toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            {netBalance >= 0
              ? 'মহাজনদের দেনা শোধের পরও আপনার উদ্বৃত্ত থাকবে'
              : 'গ্রাহকদের বাকি আদায়ের পরও মহাজনদের বাড়তি পরিশোধ করতে হবে'}
          </div>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: '12px', fontSize: '13.5px', fontWeight: '700', marginBottom: '16px' }}>
          {notice}
        </div>
      )}

      {/* Search Filter with Embedded Voice Mic */}
      <div className="ui-card" style={{ padding: '12px 14px', marginBottom: '12px', position: 'relative' }}>
        <input
          type="text"
          placeholder="🔍 কাস্টমারের নাম বা মোবাইল নাম্বার দিয়ে খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 44px 10px 14px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <button
          type="button"
          onClick={() => setShowVoiceKhataModal(true)}
          style={{
            position: 'absolute',
            right: '22px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '3px 7px',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: '13.5px',
            display: 'grid',
            placeItems: 'center'
          }}
          title="মুখে বলে বাকি এন্ট্রি বা কাস্টমার খুঁজুন"
        >
          🎙️
        </button>
      </div>

      {/* 🏷️ Quick Date & Status Filter Pills */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '16px',
        scrollbarWidth: 'thin'
      }}>
        {[
          { id: 'all', label: 'সব খরিদ্দার', icon: '👥', count: customers.length, color: '#475569', activeBg: '#0f172a', activeText: '#ffffff' },
          { id: 'today', label: 'আজকের বাকি', icon: '📅', count: countToday, color: '#dc2626', activeBg: '#dc2626', activeText: '#ffffff' },
          { id: 'yesterday', label: 'গতকালকের বাকি', icon: '⏳', count: countYesterday, color: '#ea580c', activeBg: '#ea580c', activeText: '#ffffff' },
          { id: 'week', label: 'এই সপ্তাহ', icon: '🗓️', count: countWeek, color: '#2563eb', activeBg: '#2563eb', activeText: '#ffffff' },
          { id: 'month', label: 'এই মাস', icon: '📆', count: countMonth, color: '#7c3aed', activeBg: '#7c3aed', activeText: '#ffffff' },
          { id: 'due', label: 'বকেয়া আছে', icon: '🔴', count: countDue, color: '#b91c1c', activeBg: '#ef4444', activeText: '#ffffff' },
          { id: 'zero', label: 'পরিশোধিত', icon: '🟢', count: countZero, color: '#059669', activeBg: '#10b981', activeText: '#ffffff' },
        ].map(f => {
          const isActive = selectedFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                triggerHaptic('light');
                setSelectedFilter(f.id as any);
                setCurrentPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: '800',
                border: isActive ? 'none' : '1px solid #e2e8f0',
                background: isActive ? f.activeBg : '#ffffff',
                color: isActive ? f.activeText : f.color,
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
              <span style={{
                fontSize: '10.5px',
                padding: '1px 6px',
                borderRadius: '99px',
                background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: '900'
              }}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 🔀 View Mode & Results Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card, #ffffff)', border: '1px solid #cbd5e1', padding: '3px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); setViewMode('cards'); }}
            style={{
              background: viewMode === 'cards' ? '#059669' : 'transparent',
              color: viewMode === 'cards' ? '#fff' : '#64748b',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '9px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>📇</span> কার্ড ভিউ
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic('light'); setViewMode('table'); }}
            style={{
              background: viewMode === 'table' ? '#059669' : 'transparent',
              color: viewMode === 'table' ? '#fff' : '#64748b',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '9px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>📋</span> টেবিল ভিউ
          </button>
        </div>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
          মোট পাওয়া গেছে: <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> জন গ্রাহক
        </span>
      </div>

      {/* Customer List Cards / Table */}
      {loading ? (
        <DataLoader type="skeleton-list" count={5} text="বাকি খাতার গ্রাহক তালিকা লোড হচ্ছে..." />
      ) : filtered.length === 0 ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          কোনো গ্রাহক পাওয়া যায়নি। "নতুন বাকি খাতা এন্ট্রি" বাটনে ক্লিক করে খরিদ্দার যুক্ত করুন।
        </div>
      ) : viewMode === 'table' ? (
        <div className="ui-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '800' }}>
                <th style={{ padding: '12px 16px' }}>খরিদ্দার</th>
                <th style={{ padding: '12px 14px' }}>যোগাযোগ</th>
                <th style={{ padding: '12px 14px' }}>সর্বশেষ বাকি পণ্য ও তারিখ</th>
                <th style={{ padding: '12px 14px' }}>দেওয়ার তারিখ</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>বর্তমান বকেয়া</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((c, idx) => {
                const due = Number(c.totalDue || c.total_due || 0);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'transparent' : 'rgba(248, 250, 252, 0.4)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: due > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: due > 0 ? '#b91c1c' : '#047857',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: '900',
                          fontSize: '15px',
                          flexShrink: 0
                        }}>
                          {c.name ? c.name.charAt(0) : '👤'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '13.5px' }}>{c.name}</div>
                          {due > Number(c.creditLimit || c.credit_limit || 5000) && (
                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px' }}>
                              সীমা পার
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '700', color: '#334155' }}>
                        <a href={`tel:${c.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          📱 {c.phone}
                        </a>
                      </div>
                      {c.address && <div style={{ fontSize: '11px', color: '#64748b' }}>📍 {c.address}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '12.5px' }}>{c.lastItemsSummary || 'পূর্বের বাকি'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>📅 {c.lastDate || 'পূর্বের হিসাব'} {c.lastInvoiceNo ? `(#${c.lastInvoiceNo})` : ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {c.promiseDate || c.promise_date ? (
                        <span style={{ fontSize: '11px', fontWeight: '800', background: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '6px' }}>
                          📅 {c.promiseDate || c.promise_date}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>নির্ধারিত নেই</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: due > 0 ? '#b91c1c' : '#059669' }}>
                        ৳{due.toLocaleString('en-US')}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {due > 0 && (
                          <button
                            onClick={() => sendWhatsAppReminder(c)}
                            style={{
                              background: '#25d366',
                              color: '#fff',
                              border: 'none',
                              padding: '5px 9px',
                              borderRadius: '7px',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="WhatsApp তাগাদা"
                          >
                            💬
                          </button>
                        )}
                        <button
                          onClick={() => { setShowPayModal(c); setPayAmount(String(due)); }}
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            padding: '5px 9px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                          title="টাকা আদায়"
                        >
                          💵 আদায়
                        </button>
                        <button
                          onClick={() => {
                            setShowAddDueModal(c);
                            setAddDueAmount('');
                            setAddDueItems('');
                            setSelectedDueProducts([]);
                            setProductSearch('');
                            setDueMode('stock');
                          }}
                          style={{
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            padding: '5px 9px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                          title="বাকি দিন"
                        >
                          ➕ বাকি
                        </button>
                        <button
                          onClick={() => loadCustomerLedger(c)}
                          style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '5px 8px',
                            borderRadius: '7px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                          title="ফুল খতিয়ান"
                        >
                          📜
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {paginatedCustomers.map(c => {
            const due = Number(c.totalDue || c.total_due || 0);
            return (
              <div
                key={c.id}
                className="ui-card"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: due > 0 ? '1.5px solid #fecdd3' : '1px solid #e2e8f0',
                  boxShadow: due > 0 ? '0 2px 10px rgba(239, 68, 68, 0.05)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                  borderRadius: '16px'
                }}
              >
                {/* Top Row: Customer Info & Due Balance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: due > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      color: due > 0 ? '#b91c1c' : '#047857',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '18px',
                      fontWeight: '900',
                      flexShrink: 0
                    }}>
                      {c.name ? c.name.charAt(0) : '👤'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#0f172a' }}>
                          {c.name}
                        </h4>
                        {due > Number(c.creditLimit || c.credit_limit || 5000) && (
                          <span style={{ fontSize: '10.5px', fontWeight: '800', background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: '6px' }}>
                            🚨 বাকি সীমা পার (লিমিট ৳{Number(c.creditLimit || c.credit_limit || 5000)})
                          </span>
                        )}
                        {(c.promiseDate || c.promise_date) && (
                          <span style={{ fontSize: '10.5px', fontWeight: '800', background: '#eff6ff', color: '#2563eb', padding: '2px 7px', borderRadius: '6px' }}>
                            📅 দেওয়ার তারিখ: {c.promiseDate || c.promise_date}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span>📱 {c.phone}</span>
                        {c.address && <span>• 📍 {c.address}</span>}
                      </span>
                    </div>
                  </div>

                  {/* Due Amount Badge */}
                  <div style={{
                    background: due > 0 ? '#fff1f2' : '#ecfdf5',
                    border: due > 0 ? '1.5px solid #fca5a5' : '1.5px solid #a7f3d0',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    textAlign: 'right',
                    alignSelf: 'center'
                  }}>
                    <span style={{ fontSize: '11px', color: due > 0 ? '#991b1b' : '#065f46', fontWeight: '700', display: 'block' }}>
                      বর্তমান বকেয়া বাকি
                    </span>
                    <div className="num-font" style={{ fontSize: '20px', fontWeight: '900', color: due > 0 ? '#b91c1c' : '#059669' }}>
                      ৳{due.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                {/* Middle Row: কিসের বাকি ও শেষ ক্রয়ের তারিখ / ফর্দ প্যানেল */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '9px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                    <span style={{ fontSize: '16px' }}>🛍️</span>
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                        সর্বশেষ বাকি পণ্য / ফর্দ:
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b', marginTop: '1px' }}>
                        {c.lastItemsSummary || 'পূর্বের বাকি খাতা'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span>📅</span>
                    <span><strong>তারিখ:</strong> {c.lastDate || 'পূর্বের হিসাব'} {c.lastInvoiceNo ? `(#${c.lastInvoiceNo})` : ''}</span>
                  </div>
                </div>

                {/* In-Card Expandable Date-wise History Preview */}
                {cardHistoryOpen[c.id] && (
                  <div style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '12px',
                    marginTop: '2px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>
                        📋 {c.name} এর বিগত ফর্দসমূহ (তারিখ অনুযায়ী):
                      </span>
                      <button
                        onClick={() => loadCustomerLedger(c)}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        ফুল খতিয়ান ➔
                      </button>
                    </div>

                    {cardHistoryData[c.id] && cardHistoryData[c.id].length > 0 ? (
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {cardHistoryData[c.id].slice(0, 4).map((hEntry: any) => {
                          const isPay = hEntry.isPayment || hEntry.paymentMethod === 'due_payment';
                          return (
                            <div key={hEntry.id} style={{ background: '#fff', borderRadius: '8px', padding: '8px 10px', border: isPay ? '1px solid #a7f3d0' : '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '3px' }}>
                                <span style={{ fontWeight: '800', color: isPay ? '#059669' : '#b45309' }}>
                                  {isPay ? '🟢 জমা পরিশোধ' : `🔴 বাকি ক্রয় (#${hEntry.invoiceNo})`}
                                </span>
                                <span style={{ color: '#64748b' }}>📅 {hEntry.date} ({hEntry.time})</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '700' }}>
                                  {hEntry.items && hEntry.items.length > 0 
                                    ? hEntry.items.map((it: any) => `${it.name} (${it.quantity}টি)`).join(', ')
                                    : (hEntry.note || 'বাকি এন্ট্রি')}
                                </span>
                                <strong className="num-font" style={{ fontSize: '13px', color: isPay ? '#059669' : '#dc2626' }}>
                                  {isPay ? `-৳${hEntry.paidAmount}` : `+৳${hEntry.dueAmount}`}
                                </strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'center', padding: '10px' }}>
                        ফর্দ লোড হচ্ছে...
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Row: Comprehensive Action Buttons Toolbar */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  {/* 🎙️ Direct Voice Action for this customer */}
                  <button
                    type="button"
                    onClick={() => startCustomerVoice(c)}
                    style={{
                      background: '#fff1f2',
                      color: '#b91c1c',
                      border: '1px solid #fecdd3',
                      padding: '6px 11px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 1px 3px rgba(239, 68, 68, 0.1)'
                    }}
                    title={`${c.name} এর জন্য মুখে বলে সরাসরি বাকি বা জমা এন্ট্রি করুন`}
                  >
                    <span>🎙️</span> মুখে বলুন
                  </button>

                  {c.phone && c.phone.length > 5 && !c.phone.includes('নেই') && (
                    <a
                      href={`tel:${c.phone}`}
                      style={{
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        padding: '6px 10px',
                        borderRadius: '9px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="সরাসরি মোবাইলে কল দিন"
                    >
                      <span>📞</span> কল
                    </a>
                  )}

                  {due > 0 && (
                    <button
                      onClick={() => sendWhatsAppReminder(c)}
                      style={{
                        background: '#25d366',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 11px',
                        borderRadius: '9px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.2)'
                      }}
                      title="WhatsApp-এ বকেয়া পরিশোধের তাগাদা মেসেজ পাঠান"
                    >
                      <span>💬</span> তাগাদা
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowAddDueModal(c);
                      setAddDueAmount('');
                      setAddDueItems('');
                      setSelectedDueProducts([]);
                      setProductSearch('');
                      setDueMode('stock');
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)'
                    }}
                    title="গ্রাহকের খাতায় স্টক পণ্য থেকে বাকি মেমো যোগ করুন"
                  >
                    <span>➕</span> বাকি দিন
                  </button>

                  <button
                    onClick={() => toggleInCardHistory(c)}
                    style={{
                      background: cardHistoryOpen[c.id] ? '#0f172a' : '#f8fafc',
                      color: cardHistoryOpen[c.id] ? '#fff' : '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '6px 10px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="তারিখ অনুযায়ী কি কি নিয়েছে দেখুন"
                  >
                    <span>📋</span> {cardHistoryOpen[c.id] ? 'ফর্দ বন্ধ' : 'ফর্দ দেখুন'}
                  </button>

                  <button
                    onClick={() => loadCustomerLedger(c)}
                    style={{
                      background: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      padding: '6px 10px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="কখন কোন তারিখে কি কি পণ্য নিয়েছে তার সম্পূর্ণ স্টেটমেন্ট"
                  >
                    <span>📜</span> ফুল খতিয়ান
                  </button>

                  <Link
                    href={`/khata/passbook?id=${c.id}&tenantId=${currentTenantId}`}
                    target="_blank"
                    style={{
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '6px 9px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="গ্রাহকের লাইভ ডিজিটাল পাসবুক দেখুন"
                  >
                    <span>📖</span> পাসবুক
                  </Link>

                  <button
                    onClick={() => { setShowPayModal(c); setPayAmount(String(due)); }}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    <span>💵</span> টাকা আদায়
                  </button>

                  {/* 🗑️ Delete Customer Button */}
                  <button
                    type="button"
                    onClick={() => setCustomerToDelete(c)}
                    style={{
                      background: '#ffffff',
                      color: '#94a3b8',
                      border: '1px solid #e2e8f0',
                      padding: '6px 8px',
                      borderRadius: '9px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    title={`${c.name} এর খাতা মুছে ফেলুন`}
                  >
                    <span>🗑️</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Khata Customers Pagination */}
      {totalKhataCustomers > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalKhataCustomers}
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
          pageSizeOptions={[10, 15, 30, 50, 100]}
          itemLabel="গ্রাহক"
          themeColor={theme.primaryColor}
        />
      )}

      {/* Quick Add Due (বাকি দিন ও স্টক ফর্দ এন্ট্রি) Modal */}
      {showAddDueModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📦</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                    বাকি মেমো ও স্টক এন্ট্রি
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    স্টক পণ্য থেকে সরাসরি বাকি মেমো তৈরি
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAddDueModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>

            {/* Customer Info Pill */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', marginBottom: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{showAddDueModal.name}</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>📱 {showAddDueModal.phone}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>বর্তমান বকেয়া</span>
                <span style={{ fontSize: '14px', color: '#dc2626', fontWeight: '900' }}>
                  ৳{Number(showAddDueModal.totalDue || showAddDueModal.total_due || 0).toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '14px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setDueMode('stock')}
                style={{
                  background: dueMode === 'stock' ? '#fff' : 'transparent',
                  color: dueMode === 'stock' ? '#dc2626' : '#64748b',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: dueMode === 'stock' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <span>📦</span> স্টক পণ্য বাছাই
              </button>
              <button
                type="button"
                onClick={() => setDueMode('custom')}
                style={{
                  background: dueMode === 'custom' ? '#fff' : 'transparent',
                  color: dueMode === 'custom' ? '#0f172a' : '#64748b',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: dueMode === 'custom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <span>✍️</span> সাধারণ নোট
              </button>
            </div>

            <form onSubmit={handleAddDueSubmit} style={{ display: 'grid', gap: '14px' }}>
              {dueMode === 'stock' ? (
                <>
                  {/* Stock Product Search & Quick Picker */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                        📦 স্টক থেকে পণ্য সার্চ ও বাছাই করুন:
                      </label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField(setProductSearch, false, 'পণ্য সার্চ করুন')}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          color: '#2563eb',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '800'
                        }}
                        title="পণ্যের নাম মুখে বলুন"
                      >
                        <span>🎙️</span>
                        <span>মুখে বলুন</span>
                      </button>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="পণ্য খুঁজুন (যেমন: তেল, চিনি, সাবান, চাল...)"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch('')}
                          style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filtered Products Horizontal Scroll / Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '8px',
                      maxHeight: '140px',
                      overflowY: 'auto',
                      padding: '4px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      {products
                        .filter(p => !productSearch || (p.banglaName || p.name || '').toLowerCase().includes(productSearch.toLowerCase()) || (p.barcode && p.barcode.includes(productSearch)))
                        .slice(0, 12)
                        .map(p => {
                          const stockCount = Number(p.stock || 0);
                          const isOutOfStock = stockCount <= 0;
                          return (
                            <div
                              key={p.id}
                              onClick={() => addProductToDue(p)}
                              style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '16px' }}>{p.icon || '📦'}</span>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.banglaName || p.name}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                                <span style={{ color: '#16a34a', fontWeight: '800' }}>৳{p.sellingPrice || p.selling_price}</span>
                                <span style={{ color: isOutOfStock ? '#ef4444' : '#64748b', fontWeight: '600' }}>
                                  {isOutOfStock ? 'মজুত শেষ' : `মজুত: ${stockCount}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      {products.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                          কোনো পণ্য পাওয়া যায়নি
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Items Memo List */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                      📋 নির্বাচিত বাকি পণ্যের তালিকা ({selectedDueProducts.length}টি):
                    </label>

                    {selectedDueProducts.length === 0 ? (
                      <div style={{ padding: '16px', background: '#fff1f2', border: '1px dashed #fecdd3', borderRadius: '12px', textAlign: 'center', color: '#9f1239', fontSize: '12.5px' }}>
                        👆 উপরের তালিকা থেকে পণ্য সিলেক্ট করুন। সিলেক্ট করা পণ্যের দাম অনুযায়ী স্বয়ংক্রিয়ভাবে বাকি হিসাব হবে এবং ইনভেন্টরি স্টক মাইনাস হবে।
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '2px' }}>
                        {selectedDueProducts.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '8px 10px',
                              borderRadius: '10px'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{item.icon || '📦'}</span>
                                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.name}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                ৳{item.price}/{item.unit || 'পিস'} | মজুত: {item.stock ?? '-'}
                              </div>
                            </div>

                            {/* Qty Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
                              <button
                                type="button"
                                onClick={() => updateDueItemQty(idx, -1)}
                                style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '32px', textAlign: 'center' }}>
                                {item.quantity} {item.unit || ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateDueItemQty(idx, 1)}
                                style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                              >
                                +
                              </button>
                            </div>

                            {/* Total Price & Remove */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '900', color: '#dc2626', minWidth: '55px', textAlign: 'right' }}>
                                ৳{Math.round(item.quantity * item.price)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDueItem(idx)}
                                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary & Price Display */}
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', padding: '12px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: '700', display: 'block' }}>
                        মোট বাকি হিসাব (স্টক মাইনাস হবে)
                      </span>
                      <span style={{ fontSize: '11px', color: '#dc2626' }}>
                        {selectedDueProducts.length}টি পণ্য নির্বাচিত
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>৳</span>
                      <input
                        type="number"
                        value={addDueAmount}
                        onChange={(e) => setAddDueAmount(e.target.value)}
                        required
                        style={{
                          width: '100px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1.5px solid #ef4444',
                          fontSize: '16px',
                          fontWeight: '900',
                          color: '#dc2626',
                          background: '#fff',
                          textAlign: 'right'
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                        বাকি টাকার পরিমাণ: *
                      </label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField(setAddDueAmount, true, 'বাকি টাকার পরিমাণ')}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '800'
                        }}
                        title="টাকা মুখে বলুন"
                      >
                        <span>🎙️</span>
                        <span>মুখে বলুন</span>
                      </button>
                    </div>
                    <input
                      type="number"
                      value={addDueAmount}
                      onChange={(e) => setAddDueAmount(e.target.value)}
                      className="num-font"
                      required
                      placeholder="যেমন: ৭৫০"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #ef4444',
                        fontSize: '18px',
                        fontWeight: '900',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                        কী কী পণ্য নিয়েছে / কিসের বাকি (ফর্দ):
                      </label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField(setAddDueItems, false, 'পণ্যের ফর্দ বা বিবরণ')}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          color: '#2563eb',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '800'
                        }}
                        title="পণ্যের নাম মুখে বলুন"
                      >
                        <span>🎙️</span>
                        <span>মুখে বলুন</span>
                      </button>
                    </div>
                    <textarea
                      value={addDueItems}
                      onChange={(e) => setAddDueItems(e.target.value)}
                      rows={3}
                      placeholder="যেমন: তীর তেল ১ লিটার, চিনি ২ কেজি, সাবান ২টি"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        resize: 'none'
                      }}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={addDueSubmitting || !addDueAmount || Number(addDueAmount) <= 0}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14.5px',
                  cursor: (addDueSubmitting || !addDueAmount) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>✓</span>
                <span>{addDueSubmitting ? 'যোগ হচ্ছে ও স্টক আপডেট হচ্ছে...' : `বাকি মেমো নিশ্চিত করুন (৳${Number(addDueAmount || 0).toLocaleString('en-US')})`}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Collect Due Payment Modal */}
      {showPayModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                বাকি টাকা জমা গ্রহণ
              </h3>
              <button onClick={() => setShowPayModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
              <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{showPayModal.name}</strong>
              <span style={{ fontSize: '12.5px', color: '#dc2626', fontWeight: '700' }}>
                বর্তমান বকেয়া: ৳{Number(showPayModal.totalDue || showPayModal.total_due || 0).toLocaleString('en-US')}
              </span>
            </div>

            <form onSubmit={handleCollectDue} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                    জমা প্রাপ্ত টাকার পরিমাণ: *
                  </label>
                  <button
                    type="button"
                    onClick={() => startVoiceInputForField(setPayAmount, true, 'জমা টাকার পরিমাণ')}
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      color: '#059669',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '800'
                    }}
                    title="টাকা মুখে বলুন"
                  >
                    <span>🎙️</span>
                    <span>মুখে বলুন</span>
                  </button>
                </div>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="num-font"
                  required
                  placeholder="যেমন: ৫০০"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #10b981',
                    fontSize: '18px',
                    fontWeight: '900',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14.5px',
                  cursor: 'pointer'
                }}
              >
                ✓ টাকা জমা নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                নতুন বাকি খাতা এন্ট্রি
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddCustomer} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                    কাস্টমারের নাম *
                  </label>
                  <button
                    type="button"
                    onClick={() => startVoiceInputForField(setName, false, 'কাস্টমারের নাম')}
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '800'
                    }}
                    title="নাম মুখে বলুন"
                  >
                    <span>🎙️</span>
                    <span>মুখে বলুন</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: কালাম ভাই (মাস্টার)"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                    মোবাইল নাম্বার *
                  </label>
                  <button
                    type="button"
                    onClick={() => startVoiceInputForField(setPhone, true, 'মোবাইল নাম্বার')}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      color: '#2563eb',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '800'
                    }}
                    title="নাম্বার মুখে বলুন"
                  >
                    <span>🎙️</span>
                    <span>মুখে বলুন</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                      পূর্বের বকেয়া
                    </label>
                    <button
                      type="button"
                      onClick={() => startVoiceInputForField(setInitialDue, true, 'পূর্বের বকেয়া টাকা')}
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        padding: '1px 6px',
                        fontSize: '10.5px',
                        color: '#b45309',
                        cursor: 'pointer',
                        fontWeight: '800'
                      }}
                      title="টাকা মুখে বলুন"
                    >
                      🎙️
                    </button>
                  </div>
                  <input
                    type="number"
                    value={initialDue}
                    onChange={(e) => setInitialDue(e.target.value)}
                    className="num-font"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    বাকি সীমা (Credit Limit)
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="num-font"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  ঠিকানা বা পরিচিতি
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: পূর্ব পাড়া, মসজিদ সংলগ্ন"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14.5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  marginTop: '6px'
                }}
              >
                {submitting ? 'যুক্ত হচ্ছে...' : '✓ খাতা তৈরি করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED DUE LEDGER & ITEM TIMESTAMPS MODAL (DATE-WISE GROUPED CHRONOLOGICAL) */}
      {selectedLedger && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(6px)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            padding: '22px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '4px' }}>
                  📜 তারিখভিত্তিক খতিয়ান ও ফর্দ বিবরণী
                </span>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                  {selectedLedger.customer?.name} এর বাকি খাতা
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => startCustomerVoice(selectedLedger.customer)}
                  style={{
                    background: '#fff1f2',
                    color: '#b91c1c',
                    border: '1px solid #fecdd3',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="এই গ্রাহকের জন্য সরাসরি মুখে বলে এন্ট্রি নিন"
                >
                  <span>🎙️</span> মুখে এন্ট্রি
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(selectedLedger.customer)}
                  style={{
                    background: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                  title="এই খাতা মুছে ফেলুন"
                >
                  <span>🗑️</span> মুছুন
                </button>
                <button 
                  onClick={() => setSelectedLedger(null)} 
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '15px', fontWeight: '800' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Customer Summary Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
              border: '1.5px solid #fecdd3',
              borderRadius: '16px',
              padding: '12px 16px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>📱 {selectedLedger.customer?.phone || 'মোবাইল নেই'} {selectedLedger.customer?.address ? `• 📍 ${selectedLedger.customer.address}` : ''}</span>
                <div style={{ fontSize: '12.5px', color: '#991b1b', fontWeight: '800', marginTop: '2px' }}>
                  মোট বকেয়া পাওনা:
                </div>
              </div>
              <div className="num-font" style={{ fontSize: '26px', fontWeight: '900', color: '#dc2626' }}>
                ৳{Number(selectedLedger.customer?.totalDue || selectedLedger.customer?.total_due || 0).toLocaleString('en-US')}
              </div>
            </div>

            {/* Transaction & Items Ledger List Grouped by Date */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {ledgerLoading ? (
                <DataLoader type="skeleton-list" count={3} text="তারিখভিত্তিক ফর্দ ও খতিয়ান প্রস্তুত হচ্ছে..." />
              ) : selectedLedger.ledger && selectedLedger.ledger.length > 0 ? (
                Object.entries(groupLedgerByDate(selectedLedger.ledger)).map(([dateStr, dayEntries]) => {
                  const dayTotalDue = dayEntries.filter(e => !e.isPayment && e.paymentMethod !== 'due_payment').reduce((acc, e) => acc + (e.dueAmount || 0), 0);
                  const dayTotalPaid = dayEntries.filter(e => e.isPayment || e.paymentMethod === 'due_payment').reduce((acc, e) => acc + (e.paidAmount || 0), 0);

                  return (
                    <div key={dateStr} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      
                      {/* Date Group Header Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '15px' }}>📅</span>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>{dateStr}</strong>
                          <span style={{ fontSize: '10.5px', background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: '6px', fontWeight: '800' }}>
                            {dayEntries.length}টি এন্ট্রি
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', fontWeight: '800' }}>
                          {dayTotalDue > 0 && <span style={{ color: '#dc2626', marginRight: '8px' }}>বাকি: +৳{dayTotalDue}</span>}
                          {dayTotalPaid > 0 && <span style={{ color: '#059669' }}>জমা: -৳{dayTotalPaid}</span>}
                        </div>
                      </div>

                      {/* Day Transactions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {dayEntries.map((entry: any) => {
                          const isPayment = entry.isPayment || entry.paymentMethod === 'due_payment' || entry.payment_method === 'due_payment';
                          return (
                            <div 
                              key={entry.id} 
                              style={{ 
                                background: isPayment ? '#f0fdf4' : '#ffffff', 
                                border: isPayment ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0', 
                                borderRadius: '12px', 
                                padding: '12px 14px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '900',
                                    color: isPayment ? '#166534' : '#b45309',
                                    background: isPayment ? '#dcfce7' : '#fef3c7',
                                    padding: '2px 8px',
                                    borderRadius: '6px'
                                  }}>
                                    {isPayment ? '🟢 বাকি টাকা জমা' : `🔴 বাকি ক্রয় #${entry.invoiceNo}`}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#64748b' }}>🕒 {entry.time}</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => sendTransactionWhatsApp(selectedLedger.customer, entry)}
                                    style={{
                                      background: '#25d366',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '10.5px',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                    title="এই মেমোর বিবরণ WhatsApp-এ পাঠান"
                                  >
                                    <span>💬</span> স্লিপ পাঠান
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(entry)}
                                    style={{
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      border: '1px solid #fecaca',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '10.5px',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                    title="এই বাকি/জমা এন্ট্রিটি মুছে ফেলুন"
                                  >
                                    <span>🗑️</span> মুছুন
                                  </button>
                                </div>
                              </div>

                              {isPayment ? (
                                /* Payment Details */
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                  <div>
                                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#166534', display: 'block' }}>
                                      ক্যাশ / নগদ আদায় জমা
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      {entry.note || 'বাকি হিসাব পরিশোধ'}
                                    </span>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <strong className="num-font" style={{ fontSize: '16px', color: '#16a34a' }}>
                                      -৳{entry.paidAmount}
                                    </strong>
                                    <span style={{ display: 'block', fontSize: '9.5px', color: '#15803d', fontWeight: '800' }}>
                                      বাকি হ্রাস
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                /* Due Purchase Details with Detailed Items Table */
                                <div>
                                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 10px', border: '1px solid #f1f5f9', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: '800', color: '#64748b', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>
                                      <span>নেওয়া পণ্য ও পরিমাণ</span>
                                      <span>দর ও মোট</span>
                                    </div>
                                    {entry.items && entry.items.length > 0 ? (
                                      entry.items.map((it: any, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '3px 0', borderBottom: idx < entry.items.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                                          <div>
                                            <span style={{ color: '#0f172a', fontWeight: '700' }}>{it.name}</span>
                                            <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '6px' }}>
                                              ({it.quantity} {it.unit || 'টি'} × ৳{it.price || it.unitPrice || 0})
                                            </span>
                                          </div>
                                          <span className="num-font" style={{ color: '#0f172a', fontWeight: '800' }}>
                                            ৳{it.total}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div style={{ fontSize: '12px', color: '#334155', fontWeight: '700' }}>
                                        {entry.note || 'বাকি পণ্য সামগ্রী'}
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#475569' }}>
                                    <span>
                                      মেমো মোট: <strong className="num-font">৳{entry.totalAmount}</strong> | জমা: <strong className="num-font" style={{ color: '#059669' }}>৳{entry.paidAmount}</strong>
                                    </span>
                                    <span style={{ fontWeight: '900', color: '#dc2626', fontSize: '13px' }}>
                                      যোগ হওয়া বাকি: ৳{entry.dueAmount}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 14px', color: '#94a3b8' }}>
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '6px' }}>🧾</span>
                  <strong style={{ fontSize: '14px', color: '#64748b' }}>পূর্বে কোনো ডিজিটাল মেমোর রেকর্ড নেই</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>পূর্বের বাকি হিসেবে ব্যালেন্স যোগ করা আছে।</p>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => startCustomerVoice(selectedLedger.customer)}
                style={{
                  flex: 1,
                  minWidth: '110px',
                  background: '#fff1f2',
                  color: '#b91c1c',
                  border: '1.5px solid #fecdd3',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                title="এই গ্রাহকের জন্য মুখে বলে বাকি বা জমা এন্ট্রি করুন"
              >
                <span>🎙️</span> মুখে বলুন
              </button>

              <button
                onClick={() => {
                  const targetCust = selectedLedger.customer;
                  setSelectedLedger(null);
                  setShowAddDueModal(targetCust);
                  setAddDueAmount('');
                  setAddDueItems('');
                  setSelectedDueProducts([]);
                  setProductSearch('');
                  setDueMode('stock');
                }}
                style={{
                  flex: 1,
                  minWidth: '110px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                ➕ নতুন বাকি দিন
              </button>

              <button
                onClick={() => {
                  const targetCust = selectedLedger.customer;
                  setSelectedLedger(null);
                  setShowPayModal(targetCust);
                  setPayAmount(String(targetCust.totalDue || targetCust.total_due || ''));
                }}
                style={{
                  flex: 1,
                  minWidth: '110px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                💵 টাকা আদায় করুন
              </button>

              {Number(selectedLedger.customer?.totalDue || selectedLedger.customer?.total_due || 0) > 0 && (
                <button
                  onClick={() => sendWhatsAppReminder(selectedLedger.customer)}
                  style={{
                    background: '#25d366',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>💬</span> তাগাদা
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ CUSTOMER DELETE CONFIRMATION MODAL */}
      {customerToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
                🗑️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  খাতা মুছে ফেলতে চান?
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  গ্রাহকের নাম: <strong>{customerToDelete.name}</strong>
                </span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                📱 <strong>মোবাইল:</strong> {customerToDelete.phone || 'মোবাইল নেই'}
              </div>
              {Number(customerToDelete.totalDue || customerToDelete.total_due || 0) > 0 ? (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '8px 12px', borderRadius: '10px', color: '#991b1b', fontSize: '12.5px', fontWeight: '800' }}>
                  ⚠️ সতর্কবার্তা: এই খরিদ্দারের কাছে <strong>৳{Number(customerToDelete.totalDue || customerToDelete.total_due || 0).toLocaleString('en-US')}</strong> টাকা বকেয়া রয়েছে! খাতা মুছে ফেললে এই পাওনা হিসাব মুছে যাবে।
                </div>
              ) : (
                <div style={{ color: '#059669', fontSize: '12.5px', fontWeight: '700' }}>
                  ✓ এই গ্রাহকের কোনো বকেয়া পাওনা নেই।
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '800', color: '#475569', cursor: 'pointer' }}
              >
                না, থাক
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeleteCustomer}
                style={{ flex: 1.2, padding: '11px', background: '#dc2626', border: 'none', borderRadius: '12px', fontWeight: '900', color: '#ffffff', cursor: deleteSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)' }}
              >
                {deleteSubmitting ? 'মুছে যাচ্ছে...' : '🗑️ হ্যাঁ, মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ DIRECT CUSTOMER VOICE MODAL */}
      {voiceCustomerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎙️</span>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                    {voiceCustomerModal.name} - ভয়েস এন্ট্রি
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>সরাসরি মুখে বলে বাকি বা জমা যোগ করুন</span>
                </div>
              </div>
              <button onClick={() => { stopCustomerVoice(); setVoiceCustomerModal(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: '800' }}>✕</button>
            </div>

            {/* Pulsing Mic Visualizer */}
            <div style={{ margin: '18px 0 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div
                onClick={() => {
                  if (voiceCustomerListening) {
                    stopCustomerVoice();
                  } else {
                    startCustomerVoice(voiceCustomerModal);
                  }
                }}
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: voiceCustomerListening ? 'radial-gradient(circle, #ef4444 0%, #dc2626 100%)' : '#f1f5f9',
                  color: voiceCustomerListening ? '#ffffff' : '#64748b',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '32px',
                  cursor: 'pointer',
                  boxShadow: voiceCustomerListening ? '0 0 0 10px rgba(239, 68, 68, 0.2), 0 0 0 20px rgba(239, 68, 68, 0.1)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                🎙️
              </div>
              <span style={{ fontSize: '13px', fontWeight: '800', color: voiceCustomerListening ? '#dc2626' : '#475569' }}>
                {voiceCustomerListening ? '🔴 শুনছি... এখন বলুন' : 'মাইক্রোফোনে ক্লিক করে কথা বলুন'}
              </span>
            </div>

            {/* Status / Instruction Text */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '14px', textAlign: 'left' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                💡 উদাহরণ: <em>"৫০ টাকা বাকি নিল"</em> বা <em>"১০০ টাকা জমা দিল"</em> বা <em>"১ প্যাকেট চিনি বাকি"</em>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', minHeight: '36px' }}>
                {voiceCustomerTranscript ? `🗣️ "${voiceCustomerTranscript}"` : voiceCustomerStatus}
              </div>
            </div>

            {/* Manual Edit / Fallback Input */}
            <div style={{ marginBottom: '14px' }}>
              <input
                type="text"
                value={voiceCustomerTranscript}
                onChange={(e) => setVoiceCustomerTranscript(e.target.value)}
                placeholder="অথবা এখানে টাইপ করুন (যেমন: ৫০ টাকা বাকি)..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={voiceCustomerSubmitting || !voiceCustomerTranscript.trim()}
              onClick={() => handleDirectCustomerVoiceSubmit(voiceCustomerModal, voiceCustomerTranscript)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: (!voiceCustomerTranscript.trim() || voiceCustomerSubmitting) ? '#cbd5e1' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '14.5px',
                cursor: (!voiceCustomerTranscript.trim() || voiceCustomerSubmitting) ? 'not-allowed' : 'pointer',
                boxShadow: voiceCustomerTranscript.trim() ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
              }}
            >
              {voiceCustomerSubmitting ? 'প্রসেস হচ্ছে...' : '✓ এন্ট্রি সম্পন্ন করুন'}
            </button>
          </div>
        </div>
      )}

      {/* PROMISE TO PAY DATE MODAL */}
      {showPromiseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>📅</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  টাকা দেওয়ার প্রতিশ্রুত তারিখ
                </h3>
              </div>
              <button onClick={() => setShowPromiseModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
              <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{showPromiseModal.name}</strong>
              <span style={{ fontSize: '12.5px', color: '#dc2626', fontWeight: '700' }}>
                মোট বকেয়া: ৳{Number(showPromiseModal.totalDue || showPromiseModal.total_due || 0).toLocaleString('en-US')}
              </span>
            </div>

            <form onSubmit={handleSavePromiseDate} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  কবে টাকা পরিশোধের কথা দিয়েছে? *
                </label>
                <input
                  type="date"
                  value={promiseDateInput}
                  onChange={(e) => setPromiseDateInput(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #3b82f6', fontSize: '15px', fontWeight: '700', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  ঠিকানা বা বিশেষ মন্তব্য:
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ধান কাটার পর টাকা দিবে"
                  value={promiseNotesInput}
                  onChange={(e) => setPromiseNotesInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowPromiseModal(null)}
                  style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '11px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                >
                  ✓ তারিখ সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🎙️ Dedicated Interactive Voice Khata Modal */}
      {showVoiceKhataModal && (
        <VoiceKhataModal
          isOpen={showVoiceKhataModal}
          onClose={() => setShowVoiceKhataModal(false)}
          currentTenantId={currentTenantId || ''}
          customers={customers}
          products={products}
          industryId={tenant?.industryId || 'cat-grocery'}
          speakAnnouncement={speakAnnouncement}
          triggerHaptic={triggerHaptic}
          onActionCompleted={() => {
            loadCustomers();
            loadProducts();
          }}
        />
      )}

    </div>
  );
}

