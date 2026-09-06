'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getIndustryTheme } from '../lib/industryConfig';

export default function ShopkeeperDashboard() {
  const { userRole, tenant, activeRoleMode, isLoading, isOnline, pendingSyncCount, triggerHaptic, speakAnnouncement, saveOfflineAction } = useAuth();
  const router = useRouter();
  const theme = getIndustryTheme(tenant?.industryId);

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    cashSales: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0,
    cashInHand: 0,
    totalMarketDue: 0,
    orderCount: 0
  });

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uiMode, setUiMode] = useState<'easy' | 'pro'>('easy');
  const [products, setProducts] = useState<any[]>([]);

  // 🌅 Morning Opening & 🌙 Night Closing Cash
  const [openingCash, setOpeningCash] = useState(0);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [openingInput, setOpeningInput] = useState('');

  // ⚡ 1-Tap Fast Taka Calculator Strip
  const [fastTaka, setFastTaka] = useState(0);
  const [showFastDueModal, setShowFastDueModal] = useState(false);
  const [fastDueCustomerName, setFastDueCustomerName] = useState('');

  // 4 Super Simple Quick Action Modals
  const [showQuickCashSaleModal, setShowQuickCashSaleModal] = useState(false);
  const [quickCashAmount, setQuickCashAmount] = useState('');
  const [quickCashNote, setQuickCashNote] = useState('');

  const [showQuickDueSaleModal, setShowQuickDueSaleModal] = useState(false);
  const [quickDueCustomerName, setQuickDueCustomerName] = useState('');
  const [quickDueAmount, setQuickDueAmount] = useState('');
  const [quickDueNote, setQuickDueNote] = useState('');

  const [showQuickDuePayModal, setShowQuickDuePayModal] = useState(false);
  const [quickDuePayCustomerId, setQuickDuePayCustomerId] = useState('');
  const [quickDuePayAmount, setQuickDuePayAmount] = useState('');

  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
  const [quickExpenseCat, setQuickExpenseCat] = useState('চা/নাস্তা');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');

  // 👑 Hisabpati-style Balance Cockpit, Dealers & Privacy Mode
  const [dealers, setDealers] = useState<any[]>([]);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  useEffect(() => {
    const savedPrivacy = localStorage.getItem('lbos_privacy_mode');
    if (savedPrivacy === 'true') setPrivacyMode(true);
  }, []);

  const togglePrivacyMode = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    localStorage.setItem('lbos_privacy_mode', String(next));
    triggerHaptic('medium');
    if (next) {
      speakAnnouncement('প্রাইভেসি মোড চালু, টাকার অংক লুকানো হয়েছে');
    } else {
      speakAnnouncement('ব্যালেন্স দৃশ্যমান করা হয়েছে');
    }
  };

  // 🎙️ Universal Voice-to-Fill for any input field
  const startVoiceInputForField = (setter: (val: string) => void, isNumericOnly = false) => {
    triggerHaptic('medium');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট পাওয়া যায়নি');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.start();
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          let parsed = transcript.trim();
          if (isNumericOnly) {
            parsed = parsed.replace(/দেড়শো|দেড়শ|দেড়শো|দেড়শ/g, '150');
            parsed = parsed.replace(/আড়াইশো|আড়াইশ|আড়াইশো|আড়াইশ/g, '250');
            parsed = parsed.replace(/সাড়ে তিনশো|সাড়ে তিনশ/g, '350');
            parsed = parsed.replace(/সাড়ে চারশো|সাড়ে চারশ/g, '450');
            parsed = parsed.replace(/একশত|একশো|একশ/g, '100');
            parsed = parsed.replace(/দুইশত|দুইশো|দুশো/g, '200');
            parsed = parsed.replace(/তিনশত|তিনশো/g, '300');
            parsed = parsed.replace(/পাঁচশত|পাঁচশো/g, '500');
            parsed = parsed.replace(/হাজার/g, '000');
            const digits = parsed.replace(/[^0-9.]/g, '');
            setter(digits || parsed);
          } else {
            setter(parsed);
          }
          triggerHaptic('success');
        }
      };
    } catch (e) {
      console.error('Speech input error', e);
    }
  };

  // Time & Greeting
  const [greeting, setGreeting] = useState('আসসালামু আলাইকুম');
  const [currentDateString, setCurrentDateString] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('শুভ সকাল');
    else if (hour >= 12 && hour < 17) setGreeting('শুভ দুপুর');
    else if (hour >= 17 && hour < 20) setGreeting('শুভ সন্ধ্যা');
    else setGreeting('শুভ রাত্রি');

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setCurrentDateString(new Date().toLocaleDateString('bn-BD', options));
  }, []);

  // 🔄 Mobile Pull-to-Refresh Gesture Engine
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - touchStartY.current);
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.45, 90));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= 55 && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('medium');
      await loadShopData();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        triggerHaptic('success');
      }, 500);
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  };

  // 📲 1-Tap WhatsApp Receipt Share
  const shareReceiptViaWhatsApp = (customerName: string, amount: number, memoType: string, note?: string) => {
    triggerHaptic('medium');
    const text = `🧾 *${tenant?.shopName || 'সহজ হিসাব'}*\n📍 ${tenant?.location || 'বাজার'}\n📅 ${new Date().toLocaleDateString('bn-BD')}\n\n👤 কাস্টমার: ${customerName}\n🔖 বিবরণ: ${memoType} ${note ? `(${note})` : ''}\n💵 টাকা: ৳${amount.toLocaleString('en-US')}\n\nধন্যবাদ, আপনার হিসাব ডিজিটাল খাতা ও ক্লাউডে সংরক্ষিত আছে! ✨`;
    const encoded = encodeURIComponent(text);
    if (navigator.share) {
      navigator.share({
        title: `${tenant?.shopName} ডিজিটাল রসিদ`,
        text: text
      }).catch(() => {
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
      });
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  useEffect(() => {
    if (!isLoading && !tenant && userRole !== 'admin') {
      router.push('/login');
    }
  }, [isLoading, tenant, userRole, router]);

  const loadShopData = async () => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    try {
      // 0. Load Opening Cash
      const todayKey = new Date().toISOString().split('T')[0];
      const savedOpening = localStorage.getItem(`lbos_opening_cash_${tenant.id}_${todayKey}`);
      if (savedOpening) {
        setOpeningCash(parseFloat(savedOpening) || 0);
      }

      // 1. Fetch real Day-End live financials for this tenant
      const repRes = await fetch(`/api/reports/day-end?tenantId=${tenant.id}`);
      if (repRes.ok) {
        const repData = await repRes.json();
        setMetrics(repData);
      }

      // 2. Fetch products to count low stock
      const prodRes = await fetch(`/api/products?tenantId=${tenant.id}`);
      if (prodRes.ok) {
        const prods = await prodRes.json();
        setProducts(Array.isArray(prods) ? prods : []);
        const low = (prods || []).filter((p: any) => p.stock <= (p.lowStockThreshold || 5)).length;
        setLowStockCount(low);
      }

      // 3. Fetch recent sales
      const salesRes = await fetch(`/api/sales?tenantId=${tenant.id}`);
      if (salesRes.ok) {
        const sales = await salesRes.json();
        setRecentSales(Array.isArray(sales) ? sales.slice(0, 5) : []);
      }

      // 4. Fetch customers
      const custRes = await fetch(`/api/customers?tenantId=${tenant.id}`);
      if (custRes.ok) {
        const cList = await custRes.json();
        setCustomers(Array.isArray(cList) ? cList : []);
      }

      // 5. Fetch dealers (for supplier payable metric)
      const dealRes = await fetch(`/api/dealers?tenantId=${tenant.id}`);
      if (dealRes.ok) {
        const dList = await dealRes.json();
        setDealers(Array.isArray(dList) ? dList : []);
      }
    } catch (e) {
      console.error('Failed to load shop data', e);
    }
    setLoading(false);
  };

  const handleSaveOpeningCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingInput) || 0;
    setOpeningCash(val);
    if (tenant?.id) {
      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem(`lbos_opening_cash_${tenant.id}_${todayKey}`, String(val));
    }
    speakAnnouncement(`সকালের ক্যাশ বাক্স শুরু ${val} টাকা সংরক্ষিত হয়েছে`);
    triggerHaptic('success');
    setShowOpeningModal(false);
  };

  const handleFastCashSaleSubmit = async (amount: number) => {
    if (!amount || amount <= 0 || !tenant?.id) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          customerName: 'নগদ ক্রেতা',
          paymentMethod: 'cash',
          subtotal: amount,
          discount: 0,
          totalAmount: amount,
          paidAmount: amount,
          dueAmount: 0,
          profitAmount: Math.round(amount * 0.2),
          items: [{ productName: 'নগদ বিক্রয়', quantity: 1, unitPrice: amount, totalPrice: amount }]
        })
      });
      if (res.ok) {
        speakAnnouncement(`আলহামদুলিল্লাহ! নগদ ${amount} টাকা বিক্রি সম্পন্ন হয়েছে`);
        triggerHaptic('success');
        setFastTaka(0);
        loadShopData();
      }
    } catch (e) {}
  };

  const handleFastDueSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastTaka || fastTaka <= 0 || !fastDueCustomerName || !tenant?.id) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          customerName: fastDueCustomerName,
          paymentMethod: 'due',
          subtotal: fastTaka,
          discount: 0,
          totalAmount: fastTaka,
          paidAmount: 0,
          dueAmount: fastTaka,
          profitAmount: Math.round(fastTaka * 0.2),
          items: [{ productName: 'বাকিতে সদাই', quantity: 1, unitPrice: fastTaka, totalPrice: fastTaka }]
        })
      });
      if (res.ok) {
        speakAnnouncement(`${fastDueCustomerName} এর বাকি খাতায় ${fastTaka} টাকা লেখা হয়েছে`);
        triggerHaptic('success');
        setShowFastDueModal(false);
        setFastTaka(0);
        setFastDueCustomerName('');
        loadShopData();
      }
    } catch (e) {}
  };

  const handleFastTileClick = async (tile: any) => {
    if (!tenant?.id) return;
    triggerHaptic('medium');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          customerName: 'নগদ ক্রেতা',
          paymentMethod: 'cash',
          subtotal: tile.price,
          discount: 0,
          totalAmount: tile.price,
          paidAmount: tile.price,
          dueAmount: 0,
          profitAmount: Math.round(tile.price * 0.25),
          items: [{ productName: tile.name, quantity: 1, unitPrice: tile.price, totalPrice: tile.price }]
        })
      });
      if (res.ok) {
        speakAnnouncement(`${tile.name} ${tile.price} টাকা নগদ বিক্রি সম্পন্ন হয়েছে`);
        triggerHaptic('success');
        loadShopData();
      }
    } catch (e) {}
  };

  const getIndustryVisualTiles = () => {
    const ind = tenant?.industryId || 'cat-grocery';
    if (ind === 'cat-restaurant') {
      return [
        { name: 'দুধ চা', price: 15, icon: '☕', unit: 'কাপ' },
        { name: 'লাল চা', price: 10, icon: '🍵', unit: 'কাপ' },
        { name: 'পরোটা', price: 10, icon: '🫓', unit: 'পিস' },
        { name: 'ডিম ভাজি', price: 25, icon: '🍳', unit: 'পিস' },
        { name: 'সিঙ্গাড়া/সমুচা', price: 8, icon: '🥟', unit: 'পিস' },
        { name: 'কলা', price: 10, icon: '🍌', unit: 'পিস' },
        { name: 'পান/সিগারেট', price: 15, icon: '🌿', unit: 'পিস' },
        { name: 'বিরিয়ানি/ভাত', price: 140, icon: '🍛', unit: 'প্লেট' }
      ];
    } else if (ind === 'cat-pharmacy') {
      return [
        { name: 'নাপা ৫০০mg', price: 12, icon: '💊', unit: 'পাতা' },
        { name: 'ওরস্যালাইন-N', price: 6, icon: '🧪', unit: 'প্যাকেট' },
        { name: 'এন্টাসিড প্লাস', price: 20, icon: '🧴', unit: 'পাতা' },
        { name: 'ব্যান্ডেজ', price: 10, icon: '🩹', unit: 'পিস' },
        { name: 'প্যারাসিটামল সিরাপ', price: 35, icon: '🧃', unit: 'বোতল' },
        { name: 'হ্যাক্সিসল জীবানুনাশক', price: 50, icon: '🧼', unit: 'বোতল' },
        { name: 'অ্যান্টিবায়োটিক', price: 150, icon: '💊', unit: 'পাতা' },
        { name: 'সার্জিক্যাল মাস্ক', price: 5, icon: '😷', unit: 'পিস' }
      ];
    } else if (ind === 'cat-clothing' || ind === 'cat-shoes') {
      return [
        { name: 'কটন শার্ট', price: 650, icon: '👔', unit: 'পিস' },
        { name: 'জিন্স প্যান্ট', price: 850, icon: '👖', unit: 'পিস' },
        { name: 'সুতি শাড়ি', price: 1200, icon: '🥻', unit: 'পিস' },
        { name: 'থ্রি-পিস', price: 1100, icon: '👗', unit: 'সেট' },
        { name: 'পাঞ্জাবি', price: 950, icon: '🥼', unit: 'পিস' },
        { name: 'চামড়ার জুতা', price: 1400, icon: '👞', unit: 'জোড়া' },
        { name: 'ক্যাজুয়াল স্যান্ডেল', price: 450, icon: '👡', unit: 'জোড়া' },
        { name: 'টি-শার্ট', price: 250, icon: '👕', unit: 'পিস' }
      ];
    } else if (ind === 'cat-mobile') {
      return [
        { name: 'ফাস্ট চার্জার', price: 250, icon: '🔌', unit: 'পিস' },
        { name: 'টাইপ-সি কেবল', price: 120, icon: '📱', unit: 'পিস' },
        { name: 'হেডফোন', price: 150, icon: '🎧', unit: 'পিস' },
        { name: 'মোবাইল রিচার্জ', price: 50, icon: '📶', unit: 'টাকা' },
        { name: 'গ্লাস প্রটেক্টর', price: 100, icon: '🛡️', unit: 'পিস' },
        { name: 'ব্যাক কভার', price: 150, icon: '📱', unit: 'পিস' },
        { name: 'পাওয়ার ব্যাংক', price: 1200, icon: '🔋', unit: 'পিস' },
        { name: 'মেমোরি কার্ড ৩২GB', price: 450, icon: '💾', unit: 'পিস' }
      ];
    } else if (ind === 'cat-stationery') {
      return [
        { name: 'বাংলা খাতা', price: 45, icon: '📓', unit: 'পিস' },
        { name: 'ম্যাটাডোর কলম', price: 5, icon: '🖊️', unit: 'পিস' },
        { name: 'জ্যামিতি বক্স', price: 120, icon: '📐', unit: 'বক্স' },
        { name: 'স্কেল / রুলার', price: 15, icon: '📏', unit: 'পিস' },
        { name: 'কালার পেন্সিল', price: 80, icon: '🎨', unit: 'সেট' },
        { name: 'A4 ফটো পেপার', price: 350, icon: '📄', unit: 'রিম' },
        { name: 'গ্লু আঠা', price: 20, icon: '🧴', unit: 'পিস' },
        { name: 'ফাইল ফোল্ডার', price: 25, icon: '📁', unit: 'পিস' }
      ];
    } else {
      return [
        { name: 'ফ্রেশ চিনি', price: 140, icon: '🧂', unit: 'কেজি' },
        { name: 'তীর সয়াবিন তেল', price: 185, icon: '🛢️', unit: 'লিটার' },
        { name: 'মিনিকেট চাল', price: 75, icon: '🍚', unit: 'কেজি' },
        { name: 'দেশি মসুর ডাল', price: 130, icon: '🥣', unit: 'কেজি' },
        { name: 'ফার্মের ডিম', price: 12, icon: '🥚', unit: 'পিস' },
        { name: 'লাক্স সাবান', price: 45, icon: '🧼', unit: 'পিস' },
        { name: 'ম্যাগি নুডুলস', price: 20, icon: '🍜', unit: 'প্যাক' },
        { name: 'পেঁয়াজ / আলু', price: 60, icon: '🧅', unit: 'কেজি' }
      ];
    }
  };

  const handleQuickCashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickCashAmount);
    if (!amt || amt <= 0 || !tenant?.id) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          customerName: 'নগদ ক্রেতা',
          paymentMethod: 'cash',
          subtotal: amt,
          discount: 0,
          totalAmount: amt,
          paidAmount: amt,
          dueAmount: 0,
          profitAmount: Math.round(amt * 0.2),
          items: [{ productName: quickCashNote || 'দ্রুত নগদ বিক্রি', quantity: 1, unitPrice: amt, totalPrice: amt }]
        })
      });
      if (res.ok) {
        speakAnnouncement(`${amt} টাকা নগদ বিক্রি জমা হয়েছে!`);
        triggerHaptic('success');
        setShowQuickCashSaleModal(false);
        setQuickCashAmount('');
        setQuickCashNote('');
        loadShopData();
      }
    } catch (e) {}
  };

  const handleQuickDueSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickDueAmount);
    if (!amt || amt <= 0 || !quickDueCustomerName || !tenant?.id) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          customerName: quickDueCustomerName,
          paymentMethod: 'due',
          subtotal: amt,
          discount: 0,
          totalAmount: amt,
          paidAmount: 0,
          dueAmount: amt,
          profitAmount: Math.round(amt * 0.2),
          items: [{ productName: quickDueNote || 'বাকিতে মালামাল', quantity: 1, unitPrice: amt, totalPrice: amt }]
        })
      });
      if (res.ok) {
        speakAnnouncement(`${quickDueCustomerName} এর বাকি খাতায় ${amt} টাকা জমা হয়েছে!`);
        triggerHaptic('success');
        setShowQuickDueSaleModal(false);
        setQuickDueCustomerName('');
        setQuickDueAmount('');
        setQuickDueNote('');
        loadShopData();
      }
    } catch (e) {}
  };

  const handleQuickDuePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickDuePayAmount);
    if (!amt || amt <= 0 || !quickDuePayCustomerId || !tenant?.id) return;
    try {
      const res = await fetch('/api/customers/due-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: quickDuePayCustomerId,
          amount: amt
        })
      });
      if (res.ok) {
        speakAnnouncement(`${amt} টাকা বকেয়া পরিশোধ আদায় হয়েছে!`);
        triggerHaptic('success');
        setShowQuickDuePayModal(false);
        setQuickDuePayCustomerId('');
        setQuickDuePayAmount('');
        loadShopData();
      }
    } catch (e) {}
  };

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickExpenseAmount);
    if (!amt || amt <= 0 || !tenant?.id) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          category: quickExpenseCat,
          amount: amt,
          description: quickExpenseCat
        })
      });
      if (res.ok) {
        speakAnnouncement(`${quickExpenseCat} ${amt} টাকা খরচ সেভ হয়েছে!`);
        triggerHaptic('success');
        setShowQuickExpenseModal(false);
        setQuickExpenseAmount('');
        loadShopData();
      }
    } catch (e) {}
  };

  const sendWhatsAppDueReminder = (customer: any) => {
    triggerHaptic('success');
    const cleanPhone = String(customer.phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone : cleanPhone.startsWith('01') ? '88' + cleanPhone : cleanPhone;
    const due = customer.totalDue || customer.total_due || 0;
    const msg = `সম্মানিত ${customer.name || 'গ্রাহক'}, ${tenant?.shopName || 'আমাদের দোকান'}-এ আপনার বকেয়া বাকি আছে ৳${due} টাকা। সুবিধামতো সময়ে পরিশোধের জন্য অনুরোধ করা হলো। ধন্যবাদ!`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  useEffect(() => {
    if (tenant?.id) {
      loadShopData();
    }
  }, [tenant?.id]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'soft-pulse 1.5s infinite' }}>🏪</div>
        <strong style={{ fontSize: '17px', color: '#0f172a' }}>দোকানের লাইভ হিসাব লোড হচ্ছে...</strong>
      </div>
    );
  }

  // If Admin visiting root, offer quick link to admin console
  if (userRole === 'admin') {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="ui-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 28px' }}>
          <span style={{ fontSize: '54px', display: 'block', marginBottom: '14px' }}>👑</span>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
            সুপার অ্যাডমিন সেশন সক্রিয়
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
            আপনি বর্তমানে প্ল্যাটফর্ম ওনার হিসেবে কানেক্টেড আছেন। নতুন দোকান তৈরি ও সাবস্ক্রিপশন পরিচালনা করতে অ্যাডমিন কন্ট্রোল সেন্টারে যান।
          </p>
          <Link
            href="/admin"
            style={{
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: '#fff',
              textDecoration: 'none',
              padding: '14px 28px',
              borderRadius: '14px',
              fontWeight: '800',
              display: 'inline-block',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
            }}
          >
            👑 অ্যাডমিন কন্ট্রোল সেন্টারে যান ➔
          </Link>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="ui-card" style={{ maxWidth: '440px', margin: '0 auto', padding: '36px 24px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🏪</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
            দোকানে লগইন করুন
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 24px' }}>
            দোকানের দৈনিক হিসাব, বাকি খাতা ও বিক্রয় পরিচালনা করতে আপনার দোকানের মোবাইল নাম্বার ও পিন দিয়ে লগইন করুন।
          </p>
          <Link
            href="/login"
            style={{
              background: '#10b981',
              color: '#fff',
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '800',
              display: 'inline-block'
            }}
          >
            🔑 দোকানদার লগইন ➔
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="app-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 🔄 Mobile Pull-to-Refresh Live Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div style={{
          textAlign: 'center',
          padding: `${Math.min(pullDistance, 36)}px 0 12px`,
          transition: isRefreshing ? 'all 0.2s ease' : 'none',
          color: '#4f46e5',
          fontWeight: '800',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span style={{
            display: 'inline-block',
            fontSize: '18px',
            transform: isRefreshing ? 'rotate(360deg)' : `rotate(${pullDistance * 4}deg)`,
            transition: isRefreshing ? 'transform 0.8s linear infinite' : 'none'
          }}>
            🔄
          </span>
          <span>{isRefreshing ? 'লাইভ হিসাব ক্লাউড থেকে সিঙ্ক হচ্ছে...' : (pullDistance >= 55 ? 'ছেড়ে দিন রিফ্রেশ করতে...' : 'নিচে টানুন রিফ্রেশ করতে...')}</span>
        </div>
      )}
      
      {/* Clean Greeting & Mode Switcher Header */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '12px 14px',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', background: theme.headerBadgeBg, color: theme.headerBadgeText, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${theme.accentBorder}` }}>
              {theme.icon} {theme.name}
            </span>
            <span style={{
              fontSize: '11px',
              color: isOnline ? '#059669' : '#d97706',
              background: isOnline ? '#ecfdf5' : '#fffbeb',
              border: isOnline ? '1px solid #a7f3d0' : '1px solid #fde68a',
              padding: '2px 7px',
              borderRadius: '6px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span className={isOnline ? "live-dot" : ""} style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#10b981' : '#f59e0b', display: 'inline-block' }}></span>
              {isOnline ? '🟢 অনলাইন' : '⚡ অফলাইন'}
              {pendingSyncCount > 0 && <span style={{ background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '99px', fontSize: '9.5px' }}>{pendingSyncCount}</span>}
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(16px, 4.2vw, 22px)', fontWeight: '800', color: '#0f172a', margin: '3px 0 1px' }}>
            {greeting}, {tenant.ownerName || 'দোকান মালিক'}!
          </h2>
          <p style={{ margin: 0, fontSize: 'clamp(11px, 3.2vw, 12.5px)', color: '#64748b' }}>
            <strong style={{ color: '#0f172a' }}>{tenant.shopName}</strong> • 📍 {tenant.location || 'বাজার'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Mode Switcher Pill */}
          <div style={{
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '10px',
            display: 'flex',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => { setUiMode('easy'); triggerHaptic('light'); }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                background: uiMode === 'easy' ? '#4f46e5' : 'transparent',
                color: uiMode === 'easy' ? '#fff' : '#64748b',
                fontWeight: '800',
                fontSize: '11.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ⚡ সহজ
            </button>
            <button
              type="button"
              onClick={() => { setUiMode('pro'); triggerHaptic('light'); }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                background: uiMode === 'pro' ? '#0f172a' : 'transparent',
                color: uiMode === 'pro' ? '#fff' : '#64748b',
                fontWeight: '800',
                fontSize: '11.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              💼 সম্পূর্ণ
            </button>
          </div>

          <Link
            href="/pos"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: '900',
              fontSize: '12.5px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            className="clickable-card"
          >
            <span>⚡ POS বিক্রি</span>
          </Link>
        </div>
      </div>

      {/* ==========================================================================
         👑 HISABPATI-STYLE HERO BALANCE COCKPIT
         ========================================================================== */}
      {(() => {
        const liveCashInHand = (metrics as any)?.cashInHand !== undefined ? Number((metrics as any).cashInHand) : (openingCash + (Number(metrics.cashSales) || 0) - (Number(metrics.expenses) || 0));
        const liveBankBalance = Number((metrics as any)?.digitalSales) || 0;
        const todayCashIn = (Number(metrics.cashSales) || 0) + (Number((metrics as any)?.dueCollected) || 0);
        const todayCashOut = (Number(metrics.expenses) || 0) + (Number((metrics as any)?.dealerPaid) || 0);

        const totalMarketDue = customers.reduce((sum: number, c: any) => sum + (Number(c.totalDue || c.total_due) || 0), 0);
        const totalDealerDue = dealers.reduce((sum: number, d: any) => sum + (Number(d.payableDue || d.payable_due) || 0), 0);
        const totalProductStockCount = products.reduce((sum: number, p: any) => sum + (Number(p.stock) || 0), 0);
        const totalStockWholesaleValue = products.reduce((sum: number, p: any) => sum + ((Number(p.stock) || 0) * (Number(p.purchasePrice || p.purchase_price) || Math.round((Number(p.sellingPrice || p.selling_price) || 0) * 0.8))), 0);
        const totalPartiesCount = customers.length + dealers.length;

        return (
          <>
            {/* 👑 Royal Violet Hero Cockpit Card */}
            <div style={{
              background: 'linear-gradient(135deg, #5b50e6 0%, #4338ca 100%)',
              color: '#ffffff',
              borderRadius: '24px',
              padding: '22px 20px',
              marginBottom: '24px',
              boxShadow: '0 12px 30px -5px rgba(91, 80, 230, 0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Privacy Eye Button */}
              <button
                type="button"
                onClick={togglePrivacyMode}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: '#ffffff',
                  fontSize: '17px',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'background 0.2s ease'
                }}
                title={privacyMode ? 'ব্যালেন্স দেখতে চাপুন' : 'ব্যালেন্স গোপন রাখতে চাপুন'}
              >
                {privacyMode ? '🙈' : '👁️'}
              </button>

              {/* Dual-Column Main Balance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', alignItems: 'center', marginBottom: '18px' }}>
                {/* Left Column: হাতে আছে (Cash in Hand) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#c7d2fe', fontWeight: '800', marginBottom: '4px' }}>
                    <span>হাতে আছে</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.3px', color: '#ffffff' }} className="num-font">
                    {privacyMode ? '••••••' : `৳ ${Math.max(0, liveCashInHand).toLocaleString('en-US')}`}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '42px', background: 'rgba(255, 255, 255, 0.25)', margin: '0 10px' }} />

                {/* Right Column: ব্যাংকে আছে (Bank / Digital) */}
                <div style={{ paddingLeft: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#c7d2fe', fontWeight: '800', marginBottom: '4px' }}>
                    <span>ব্যাংকে আছে</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.3px', color: '#ffffff' }} className="num-font">
                    {privacyMode ? '••••••' : `৳ ${liveBankBalance.toLocaleString('en-US')}`}
                  </div>
                </div>
              </div>

              {/* White Sub-Pill: নগদ প্রাপ্তি (Cash in) vs নগদ প্রদান (Cash out) */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1px 1fr',
                alignItems: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}>
                {/* নগদ প্রাপ্তি ↓ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#10b981',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '15px',
                    fontWeight: '900'
                  }}>
                    ↓
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>নগদ প্রাপ্তি</span>
                    <strong style={{ fontSize: '15px', color: '#10b981', fontWeight: '900' }} className="num-font">
                      {privacyMode ? '••••' : `৳ ${todayCashIn.toLocaleString('en-US')}`}
                    </strong>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '28px', background: '#f1f5f9' }} />

                {/* নগদ প্রদান ↑ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '10px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#fef2f2',
                    color: '#ef4444',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '15px',
                    fontWeight: '900'
                  }}>
                    ↑
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>নগদ প্রদান</span>
                    <strong style={{ fontSize: '15px', color: '#ef4444', fontWeight: '900' }} className="num-font">
                      {privacyMode ? '••••' : `৳ ${todayCashOut.toLocaleString('en-US')}`}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 📊 2x2 FLOATING-BADGE KPI METRIC CARDS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '18px 14px',
              marginBottom: '20px',
              paddingTop: '6px'
            }}>
              {/* Card 1: মোট পাওনা ⓘ (Customer Due) */}
              <Link
                href="/khata"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #fed7aa',
                  borderRadius: '20px',
                  padding: '16px 14px 14px',
                  position: 'relative',
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(254, 215, 170, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '84px',
                  transition: 'transform 0.15s ease'
                }}
                className="clickable-card"
              >
                {/* Floating Round Badge at Top */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '18px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ffedd5',
                  color: '#ea580c',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(234, 88, 12, 0.2)',
                  border: '2px solid #ffffff'
                }}>
                  🪙
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    মোট পাওনা <span style={{ fontSize: '10px' }}>ⓘ</span>
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="num-font">
                    <span>{privacyMode ? '••••••' : `৳ ${totalMarketDue.toLocaleString('en-US')}`}</span>
                    <span style={{ color: '#4f46e5', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              </Link>

              {/* Card 2: মোট দেনা ⓘ (Dealer Payable) */}
              <Link
                href="/dealers"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #bae6fd',
                  borderRadius: '20px',
                  padding: '16px 14px 14px',
                  position: 'relative',
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(186, 230, 253, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '84px',
                  transition: 'transform 0.15s ease'
                }}
                className="clickable-card"
              >
                {/* Floating Round Badge at Top */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '18px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)',
                  border: '2px solid #ffffff'
                }}>
                  🚚
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    মোট দেনা <span style={{ fontSize: '10px' }}>ⓘ</span>
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="num-font">
                    <span>{privacyMode ? '••••••' : `৳ ${totalDealerDue.toLocaleString('en-US')}`}</span>
                    <span style={{ color: '#4f46e5', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              </Link>

              {/* Card 3: পণ্য (Products Count) */}
              <Link
                href="/stock"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #99f6e4',
                  borderRadius: '20px',
                  padding: '16px 14px 14px',
                  position: 'relative',
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(153, 246, 228, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '84px',
                  transition: 'transform 0.15s ease'
                }}
                className="clickable-card"
              >
                {/* Floating Round Badge at Top */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '18px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ccfbf1',
                  color: '#0d9488',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.2)',
                  border: '2px solid #ffffff'
                }}>
                  📦
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                    পণ্য
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="num-font">
                    <span>{products.length}</span>
                    <span style={{ color: '#4f46e5', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              </Link>

              {/* Card 4: পার্টি (Parties Count) */}
              <Link
                href="/khata"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #fde047',
                  borderRadius: '20px',
                  padding: '16px 14px 14px',
                  position: 'relative',
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(253, 224, 71, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '84px',
                  transition: 'transform 0.15s ease'
                }}
                className="clickable-card"
              >
                {/* Floating Round Badge at Top */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '18px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#fef9c3',
                  color: '#ca8a04',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(202, 138, 4, 0.2)',
                  border: '2px solid #ffffff'
                }}>
                  👥
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                    পার্টি
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="num-font">
                    <span>{totalPartiesCount}</span>
                    <span style={{ color: '#4f46e5', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* 📋 3 HORIZONTAL QUICK ACTION INFO BARS */}
            <div style={{ display: 'grid', gap: '10px', marginBottom: '22px' }}>
              {/* Bar 1: মোট ব্যয়/খরচ > */}
              <Link
                href="/expenses"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'background 0.15s ease'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>💸</span>
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>মোট ব্যয় / খরচ</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#e11d48', fontWeight: '900' }} className="num-font">
                    {privacyMode ? '••••' : `৳ ${(metrics.expenses || 0).toLocaleString('en-US')}`}
                  </strong>
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>›</span>
                </div>
              </Link>

              {/* Bar 2: মোট স্টক > */}
              <Link
                href="/stock"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'background 0.15s ease'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🛒</span>
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>মোট স্টক (পিস/ইউনিট)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#059669', fontWeight: '900' }} className="num-font">
                    {totalProductStockCount.toLocaleString('en-US')} টি
                  </strong>
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>›</span>
                </div>
              </Link>

              {/* Bar 3: স্টক মূল্য > */}
              <Link
                href="/stock"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'background 0.15s ease'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🪙</span>
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>স্টক মূল্য (পাইকারি মূলধন)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#ca8a04', fontWeight: '900' }} className="num-font">
                    {privacyMode ? '••••••' : `৳ ${totalStockWholesaleValue.toLocaleString('en-US')}`}
                  </strong>
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>›</span>
                </div>
              </Link>
            </div>
          </>
        );
      })()}

      {/* 🌅 সকাল-সন্ধ্যা ২-ক্লিক দোকান সহকারী (Morning Opening Float & Night Day-End Balancing) */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '16px 20px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.1)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '22px'
          }}>
            🌅
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>
              সকালের ক্যাশ বাক্স শুরু: <strong style={{ color: '#38bdf8' }}>৳{openingCash.toLocaleString('en-US')}</strong> | ক্যাশে প্রত্যাশিত মোট: <strong style={{ color: '#4ade80' }}>৳{(openingCash + (metrics.cashSales || 0) - (metrics.expenses || 0)).toLocaleString('en-US')}</strong>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc' }}>
              দৈনিক সহজ গাইড: সকালে ক্যাশ দিয়ে শুরু, রাতে হিসাব মিলিয়ে ক্লোজ
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setOpeningInput(String(openingCash || ''));
              setShowOpeningModal(true);
              triggerHaptic('medium');
            }}
            style={{
              background: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              padding: '9px 14px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>🌅</span>
            <span>সকালের ক্যাশ শুরু</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowClosingModal(true);
              triggerHaptic('medium');
            }}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            <span>🌙</span>
            <span>দোকান বন্ধ ও হিসাব মেলানো</span>
          </button>
        </div>
      </div>

      {/* 🎙️ ১-ট্যাপে বড় ভয়েস কমান্ড বার (Universal 1-Tap Voice Action Bar) */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          const floatBtn = document.querySelector('.floating-voice-btn, button[title*="মুখে"]') as HTMLButtonElement;
          if (floatBtn) {
            floatBtn.click();
          } else {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
              const recognition = new SpeechRecognition();
              recognition.lang = 'bn-BD';
              recognition.start();
            }
          }
        }}
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '2px solid #10b981',
          borderRadius: '20px',
          padding: '16px 20px',
          marginBottom: '18px',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
        className="clickable-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: '#10b981',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '28px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
          }}>
            🎙️
          </div>
          <div>
            <h3 style={{ margin: '0 0 3px', fontSize: '16px', fontWeight: '900', color: '#065f46' }}>
              মুখে বলে সরাসরি হিসাব লিখুন (ভয়েস ইনপুট)
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#047857' }}>
              চাপ দিয়ে বাংলায় বলুন: <strong>"স্বপন ভাই ৫০ টাকা বাকি নিল"</strong> বা <strong>"চা নাস্তা ৬০ টাকা খরচ"</strong>
            </p>
          </div>
        </div>
        <div style={{
          background: '#10b981',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '12px',
          fontWeight: '800',
          fontSize: '13.5px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>কথা বলুন</span> ➔
        </div>
      </div>

      {/* ⚡ ফাস্ট টাকার বাটন ও কুইক ক্যালকুলেটর স্ট্রিপ (Quick Fast Taka Calculator Strip) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '18px 20px',
        marginBottom: '18px',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🔢</span>
            <div>
              <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>
                দ্রুত টাকার বাটন (অংক যোগ করে বিক্রি/বাকি)
              </strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                টাকা যোগ করে সরাসরি নগদ বিক্রি বা বাকি লিখুন
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              borderRadius: '12px',
              padding: '6px 14px',
              fontSize: '20px',
              fontWeight: '900',
              color: fastTaka > 0 ? '#059669' : '#94a3b8'
            }} className="num-font">
              ৳{fastTaka}
            </div>
            {fastTaka > 0 && (
              <button
                type="button"
                onClick={() => { setFastTaka(0); triggerHaptic('light'); }}
                style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                মুছুন ✕
              </button>
            )}
          </div>
        </div>

        {/* Fast Taka Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {[10, 20, 50, 100, 200, 500, 1000].map(val => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setFastTaka(prev => prev + val);
                triggerHaptic('light');
              }}
              style={{
                flex: '1 1 auto',
                minWidth: '60px',
                background: '#f1f5f9',
                border: '1.5px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 10px',
                fontSize: '15px',
                fontWeight: '900',
                color: '#0f172a',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
              }}
              className="clickable-card"
            >
              +৳{val}
            </button>
          ))}
        </div>

        {/* 1-Tap Fast Checkout Action for Accumulated Fast Taka */}
        {fastTaka > 0 && (
          <div style={{ display: 'flex', gap: '10px', animation: 'fadeIn 0.2s ease-out' }}>
            <button
              type="button"
              onClick={() => handleFastCashSaleSubmit(fastTaka)}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🟢</span>
              <span>নগদ বিক্রি সম্পন্ন (৳{fastTaka})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowFastDueModal(true);
                triggerHaptic('medium');
              }}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🔴</span>
              <span>বাকি লিখুন (৳{fastTaka})</span>
            </button>
          </div>
        )}
      </div>

      {/* 🖼️ ক্যাটাগরি অনুযায়ী বড় ছবির বোতাম (Industry Category Visual Touch Tiles) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>{tenant?.industryIcon || '📦'}</span>
            <div>
              <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>
                জনপ্রিয় মালামালের ছবি (ছবির ওপর চাপ দিলেই নগদ বিক্রি)
              </strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {tenant?.industryName || 'দোকান'} ক্যাটাগরির রেগুলার পণ্য
              </span>
            </div>
          </div>
          <Link href="/pos" style={{ fontSize: '12.5px', color: '#059669', fontWeight: '800', textDecoration: 'none' }}>
            সব পণ্য ➔
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '10px'
        }}>
          {getIndustryVisualTiles().map((tile, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleFastTileClick(tile)}
              style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '12px 8px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
              className="clickable-card"
              title="১-ক্লিকে বিক্রি করতে চাপুন"
            >
              <span style={{ fontSize: '30px' }}>{tile.icon}</span>
              <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {tile.name}
              </strong>
              <span style={{ fontSize: '13px', fontWeight: '900', color: '#059669' }} className="num-font">
                ৳{tile.price}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 👥 শীর্ষ পরিচিত বাকিদারদের কুইক কার্ডস (VIP Customer Quick Khata Grid) */}
      {customers.length > 0 && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '18px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>👥</span>
              <div>
                <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>
                  পরিচিত কাস্টমার (১-ট্যাপে বাকি লেখা বা টাকা জমা)
                </strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  কাস্টমারের ওপর চাপ দিয়ে সরাসরি বাকি বা পেমেন্ট নিন
                </span>
              </div>
            </div>
            <Link href="/khata" style={{ fontSize: '12.5px', color: '#4f46e5', fontWeight: '800', textDecoration: 'none' }}>
              বাকি খাতা ➔
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '12px'
          }}>
            {customers.slice(0, 6).map((c) => {
              const due = Number(c.totalDue || c.total_due || 0);
              return (
                <div
                  key={c.id}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #f1f5f9',
                    borderRadius: '16px',
                    padding: '14px 12px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  className="clickable-card"
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '18px',
                    margin: '0 auto 8px'
                  }}>
                    👤
                  </div>
                  <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>{c.name}</strong>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: due > 0 ? '#ea580c' : '#10b981', display: 'block', marginBottom: '10px' }} className="num-font">
                    {due > 0 ? `বাকি: ৳${due.toLocaleString('en-US')}` : 'পরিশোধিত ✓'}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickDueCustomerName(c.name);
                        setShowQuickDueSaleModal(true);
                        triggerHaptic('medium');
                      }}
                      style={{
                        flex: 1,
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '6px 4px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      +বাকি
                    </button>
                    {due > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickDuePayCustomerId(c.id);
                          setShowQuickDuePayModal(true);
                          triggerHaptic('medium');
                        }}
                        style={{
                          flex: 1,
                          background: '#eef2ff',
                          color: '#4f46e5',
                          border: '1px solid #c7d2fe',
                          padding: '6px 4px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        ✓জমা
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🔘 ৪ বাটনের অতি-সহজ কাউন্টার (1-Tap Super Quick Action Bar) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>
                ১-ট্যাপে দ্রুত হিসাব লিখুন
              </strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                কোনো জটিলতা ছাড়া মাত্র ২ সেকেন্ডে এন্ট্রি করুন
              </span>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* Button 1: Quick Cash Sale */}
          <button
            type="button"
            onClick={() => { setShowQuickCashSaleModal(true); triggerHaptic('medium'); }}
            style={{
              background: '#ffffff',
              border: '1.5px solid #f1f5f9',
              borderRadius: '16px',
              padding: '16px 14px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'transform 0.15s ease'
            }}
            className="clickable-card"
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#ecfdf5',
              color: '#10b981',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              margin: '0 auto 8px'
            }}>
              💰
            </div>
            <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
              ১. নগদ বিক্রি
            </strong>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              টাকা আসল ➔ ক্যাশ জমা
            </span>
          </button>

          {/* Button 2: Quick Due Sale */}
          <button
            type="button"
            onClick={() => { setShowQuickDueSaleModal(true); triggerHaptic('medium'); }}
            style={{
              background: '#ffffff',
              border: '1.5px solid #f1f5f9',
              borderRadius: '16px',
              padding: '16px 14px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'transform 0.15s ease'
            }}
            className="clickable-card"
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#fef2f2',
              color: '#ef4444',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              margin: '0 auto 8px'
            }}>
              📒
            </div>
            <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
              ২. বাকি নিল
            </strong>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              নাম ও টাকা ➔ খাতায় জমা
            </span>
          </button>

          {/* Button 3: Quick Due Payment */}
          <button
            type="button"
            onClick={() => { setShowQuickDuePayModal(true); triggerHaptic('medium'); }}
            style={{
              background: '#ffffff',
              border: '1.5px solid #f1f5f9',
              borderRadius: '16px',
              padding: '16px 14px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'transform 0.15s ease'
            }}
            className="clickable-card"
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#eef2ff',
              color: '#4f46e5',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              margin: '0 auto 8px'
            }}>
              💵
            </div>
            <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
              ৩. বাকি শোধ দিল
            </strong>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              বকেয়া টাকা উসুল হলো
            </span>
          </button>

          {/* Button 4: Quick Expense */}
          <button
            type="button"
            onClick={() => { setShowQuickExpenseModal(true); triggerHaptic('medium'); }}
            style={{
              background: '#ffffff',
              border: '1.5px solid #f1f5f9',
              borderRadius: '16px',
              padding: '16px 14px',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              transition: 'transform 0.15s ease'
            }}
            className="clickable-card"
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#fef9c3',
              color: '#d97706',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              margin: '0 auto 8px'
            }}>
              💸
            </div>
            <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', marginBottom: '2px' }}>
              ৪. দোকান খরচ
            </strong>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              চা, নাস্তা, কারেন্ট বিল
            </span>
          </button>
        </div>
      </div>

      {/* 📊 ৩-বক্সের পরিষ্কার দৈনিক হিসাব (Daily Cash, Due & Profit 3-Box Cockpit) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {/* Box 1: Today's Cash In Hand */}
        <div className="ui-card" style={{ padding: '20px', borderRadius: '18px', border: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '800' }}>আজকের নগদ ক্যাশ</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'grid', placeItems: 'center', fontSize: '16px' }}>
              💵
            </div>
          </div>
          <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
            ৳{metrics.cashSales.toLocaleString('en-US')}
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>
            ক্যাশ ড্রয়ারে জমা টাকা
          </span>
        </div>

        {/* Box 2: Total Market Due */}
        <div className="ui-card" style={{ padding: '20px', borderRadius: '18px', border: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '800' }}>কাস্টমার মোট বাকি</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fff7ed', color: '#ea580c', display: 'grid', placeItems: 'center', fontSize: '16px' }}>
              📒
            </div>
          </div>
          <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
            ৳{metrics.totalMarketDue.toLocaleString('en-US')}
          </div>
          <Link href="/khata" style={{ fontSize: '11.5px', color: '#4f46e5', fontWeight: '800', textDecoration: 'none' }}>
            বাকি খাতা ও WhatsApp তাগাদা ➔
          </Link>
        </div>

        {/* Box 3: Net Profit */}
        <div className="ui-card" style={{ padding: '20px', borderRadius: '18px', border: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '800' }}>আজকের খাঁটি নিট লাভ</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'grid', placeItems: 'center', fontSize: '16px' }}>
              💹
            </div>
          </div>
          <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
            {activeRoleMode === 'owner' ? `৳${metrics.netProfit.toLocaleString('en-US')}` : '৳••••••'}
          </div>
          <span style={{ fontSize: '11.5px', color: activeRoleMode === 'owner' ? '#64748b' : '#94a3b8', fontWeight: '600' }}>
            {activeRoleMode === 'owner' ? 'সব খরচ বাদে আসল মুনাফা' : '🔒 কর্মচারী মোডে লাভ গোপন'}
          </span>
        </div>
      </div>

      {/* 📲 বাকির কাস্টমার তালিকা (1-Click WhatsApp Reminder) */}
      {customers.filter(c => (Number(c.totalDue || c.total_due) || 0) > 0).length > 0 && (
        <div className="ui-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>📒</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  বাকি কাস্টমারদের তালিকা ও ১-ক্লিকে WhatsApp তাগাদা
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>সরাসরি WhatsApp বাটন চেপে বকেয়ার মেসেজ পাঠান</span>
              </div>
            </div>
            <Link href="/khata" style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb', textDecoration: 'none' }}>
              সব দেখুন ➔
            </Link>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {customers.filter(c => (Number(c.totalDue || c.total_due) || 0) > 0).slice(0, 5).map(c => {
              const due = Number(c.totalDue || c.total_due || 0);
              return (
                <div
                  key={c.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'grid', placeItems: 'center', fontSize: '18px' }}>
                      👤
                    </div>
                    <div>
                      <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block' }}>{c.name}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>📱 {c.phone}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>বকেয়া বাকি</span>
                      <strong className="num-font" style={{ fontSize: '17px', color: '#dc2626' }}>৳{due.toLocaleString('en-US')}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => sendWhatsAppDueReminder(c)}
                      style={{
                        background: '#25d366',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="WhatsApp এ ১-ক্লিকে তাগাদা পাঠান"
                    >
                      <span>💬</span>
                      <span>তাগাদা</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PRO MODE: Full Sales & Action Tiles */}
      {uiMode === 'pro' && (
        <>
          {/* Quick Action Navigation Tiles */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  দোকানের প্রধান খাতা ও কার্যক্রম
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>যেখানে ক্লিক করবেন সরাসরি সেই খাতায় কাজ করতে পারবেন</span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px'
            }}>
              {[
                { href: '/pos', icon: theme.posIcon, title: theme.posLabel, desc: theme.posDesc },
                { href: '/khata', icon: '📒', title: theme.khataLabel, desc: 'বকেয়া ও তাগাদা এসএমএস' },
                { href: '/stock', icon: theme.stockIcon, title: theme.stockLabel, desc: lowStockCount > 0 ? `${lowStockCount}টি কম স্টক` : 'মজুত পণ্য ও দাম' },
                { href: '/expenses', icon: '💸', title: 'দোকান খরচ', desc: 'চা, ভাড়া ও বিল' },
                { href: '/dealers', icon: '🚚', title: theme.dealerLabel, desc: 'ডিলার দেনা-পাওনা' },
                { href: '/day-end', icon: '🌙', title: 'ক্যাশ মিলানো', desc: 'রাতের ড্রয়ার হিসাব' },
              ].map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="ui-card launcher-card clickable-card"
                  style={{
                    textDecoration: 'none',
                    textAlign: 'center',
                    padding: '18px 14px'
                  }}
                >
                  <div className="launcher-icon-circle">
                    {action.icon}
                  </div>
                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '3px', lineHeight: 1.2 }}>
                    {action.title}
                  </strong>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {action.desc}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="ui-card" style={{ padding: '22px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 3px' }}>
                  🧾 আজকের সাম্প্রতিক ক্যাশ মেমো ও বিক্রয়
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>ক্যাশ ও বাকি বিক্রয়ের রসিদ তালিকা</span>
              </div>
              <Link
                href="/pos"
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '800',
                  textDecoration: 'none'
                }}
              >
                + নতুন মেমো ➔
              </Link>
            </div>

            {recentSales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 14px', color: '#94a3b8' }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🧾</span>
                <strong style={{ fontSize: '14px', color: '#64748b', display: 'block' }}>আজকে এখনও কোনো মেমো কাটা হয়নি</strong>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#64748b', textAlign: 'left', background: '#f8fafc' }}>
                      <th style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px' }}>মেমো নং</th>
                      <th style={{ padding: '12px 14px' }}>ক্রেতা</th>
                      <th style={{ padding: '12px 14px' }}>মোট টাকা</th>
                      <th style={{ padding: '12px 14px' }}>পরিশোধ</th>
                      <th style={{ padding: '12px 14px' }}>বকেয়া</th>
                      <th style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0' }}>পেমেন্ট মাধ্যম</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>
                          #{s.invoiceNo || s.invoice_no || s.id?.slice(0, 6)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {s.customerName || s.customer_name || 'নগদ ক্রেতা'}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', fontWeight: '900', color: '#0f172a' }}>
                          ৳{Number(s.totalAmount || s.total_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', color: '#059669', fontWeight: '800' }}>
                          ৳{Number(s.paidAmount || s.paid_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', color: Number(s.dueAmount || s.due_amount || 0) > 0 ? '#dc2626' : '#94a3b8', fontWeight: '800' }}>
                          ৳{Number(s.dueAmount || s.due_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button
                            onClick={() => setSelectedInvoice(s)}
                            style={{
                              background: '#f1f5f9',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              padding: '6px 12px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>🖨️</span> রসিদ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Invoice Reprint Modal */}
      {selectedInvoice && (
        <div className="invoice-modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px',
          overflowY: 'auto'
        }}>
          <div className="invoice-modal-card" style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px 20px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div className="printable-receipt" style={{
              background: '#fff',
              fontFamily: 'monospace, "Hind Siliguri", sans-serif',
              fontSize: '12px',
              lineHeight: 1.4,
              color: '#000',
              borderBottom: '1px dashed #cbd5e1',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '8px', marginBottom: '8px' }}>
                <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '900' }}>{tenant?.shopName || 'দোকান'}</h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>{tenant?.location || 'বাজার'}</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>মোবাইল: {tenant?.phone || ''}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px', color: '#475569' }}>
                  <span>মেমো: #{selectedInvoice.invoiceNo || selectedInvoice.invoice_no || selectedInvoice.id?.slice(0, 6)}</span>
                  <span>{new Date(selectedInvoice.created_at || new Date()).toLocaleDateString('bn-BD')}</span>
                </div>
                <div style={{ textAlign: 'left', fontSize: '11.5px', marginTop: '4px', fontWeight: '700' }}>
                  ক্রেতা: {selectedInvoice.customerName || selectedInvoice.customer_name || 'নগদ ক্রেতা'}
                </div>
              </div>

              {/* Items List if Available */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', marginBottom: '4px', fontSize: '11px' }}>
                    <span>বিবরণ</span>
                    <span>পরিমাণ × দর</span>
                  </div>
                  {selectedInvoice.items.map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
                      <span>{it.product_name || it.productName || it.product?.banglaName || 'পণ্য'}</span>
                      <span className="num-font">
                        {it.quantity} × ৳{it.selling_price || it.sellingPrice || it.unitPrice} = ৳{it.total_price || it.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '14px', marginBottom: '4px' }}>
                  <span>মোট বিল:</span>
                  <span className="num-font">৳{selectedInvoice.totalAmount || selectedInvoice.total_amount || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: '700' }}>
                  <span>পরিশোধিত:</span>
                  <span className="num-font">৳{selectedInvoice.paidAmount || selectedInvoice.paid_amount || 0} ({(selectedInvoice.paymentMethod || selectedInvoice.payment_method || 'CASH').toUpperCase()})</span>
                </div>
                {Number(selectedInvoice.dueAmount || selectedInvoice.due_amount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: '700' }}>
                    <span>বকেয়া বাকি:</span>
                    <span className="num-font">৳{selectedInvoice.dueAmount || selectedInvoice.due_amount}</span>
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                *** ধন্যবাদ, আবার আসবেন ***
              </div>
            </div>

            {/* Action Buttons (Excluded from Print) */}
            <div className="no-print" style={{ display: 'grid', gap: '8px' }}>
              <button
                onClick={() => {
                  const custName = selectedInvoice.customerName || selectedInvoice.customer_name || 'নগদ ক্রেতা';
                  const totAmt = Number(selectedInvoice.totalAmount || selectedInvoice.total_amount || 0);
                  const memoNo = selectedInvoice.invoiceNo || selectedInvoice.invoice_no || selectedInvoice.id?.slice(0, 6);
                  shareReceiptViaWhatsApp(custName, totAmt, `মেমো #${memoNo}`, `পরিশোধিত: ৳${selectedInvoice.paidAmount || selectedInvoice.paid_amount || 0}`);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #25d366 0%, #16a34a 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <span>💬</span> WhatsApp এ রসিদ পাঠান
              </button>

              <button
                onClick={() => window.print()}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🖨️</span> থার্মাল স্লিপ প্রিন্ট করুন
              </button>

              <button
                onClick={() => setSelectedInvoice(null)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 MODAL 1: QUICK CASH SALE */}
      {showQuickCashSaleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '16px 20px 24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '4px', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🟢</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  দ্রুত নগদ বিক্রি (টাকা জমা)
                </h3>
              </div>
              <button
                onClick={() => setShowQuickCashSaleModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickCashSale} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  কত টাকা বিক্রি হলো? *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: '#059669', fontWeight: '900' }}>৳</span>
                  <input
                    type="number"
                    placeholder="০.০০"
                    value={quickCashAmount}
                    onChange={(e) => setQuickCashAmount(e.target.value)}
                    required
                    autoFocus
                    className="num-font"
                    style={{ width: '100%', padding: '14px 14px 14px 38px', borderRadius: '14px', border: '2px solid #10b981', outline: 'none', boxSizing: 'border-box', fontSize: '24px', fontWeight: '900' }}
                  />
                </div>
              </div>

              {/* Instant Taka Preset Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[10, 20, 50, 100, 200, 500, 1000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(quickCashAmount) || 0;
                      setQuickCashAmount(String(cur + val));
                      triggerHaptic('light');
                    }}
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      color: '#065f46',
                      cursor: 'pointer'
                    }}
                  >
                    +৳{val}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: চা-বিস্কুট বা মুদি মাল"
                  value={quickCashNote}
                  onChange={(e) => setQuickCashNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickCashSaleModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!quickCashAmount || parseFloat(quickCashAmount) <= 0}
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                >
                  ✓ বিক্রি সম্পন্ন ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 MODAL 2: QUICK DUE SALE */}
      {showQuickDueSaleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '16px 20px 24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '4px', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🔴</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  কাস্টমার বাকি এন্ট্রি (খাতায় জমা)
                </h3>
              </div>
              <button
                onClick={() => setShowQuickDueSaleModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickDueSale} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  কার নামে বাকি লিখবেন? *
                </label>
                <input
                  type="text"
                  placeholder="যেমন: রহিম ভাই / করিম চাচা"
                  value={quickDueCustomerName}
                  onChange={(e) => setQuickDueCustomerName(e.target.value)}
                  list="customer-suggestions-list"
                  required
                  autoFocus
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '15px' }}
                />
                <datalist id="customer-suggestions-list">
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - বর্তমান বাকি: ৳{c.totalDue || c.total_due || 0}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  কত টাকা বাকি নিল? *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: '#dc2626', fontWeight: '900' }}>৳</span>
                  <input
                    type="number"
                    placeholder="০.০০"
                    value={quickDueAmount}
                    onChange={(e) => setQuickDueAmount(e.target.value)}
                    required
                    className="num-font"
                    style={{ width: '100%', padding: '14px 14px 14px 38px', borderRadius: '14px', border: '2px solid #ef4444', outline: 'none', boxSizing: 'border-box', fontSize: '24px', fontWeight: '900' }}
                  />
                </div>
              </div>

              {/* Instant Taka Preset Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[10, 20, 50, 100, 200, 500, 1000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(quickDueAmount) || 0;
                      setQuickDueAmount(String(cur + val));
                      triggerHaptic('light');
                    }}
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      color: '#991b1b',
                      cursor: 'pointer'
                    }}
                  >
                    +৳{val}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  মালের নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ১ কেজি চিনি ও চা"
                  value={quickDueNote}
                  onChange={(e) => setQuickDueNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickDueSaleModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!quickDueAmount || parseFloat(quickDueAmount) <= 0 || !quickDueCustomerName}
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                >
                  ✓ বাকি খাতায় লিখুন ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💵 MODAL 3: QUICK DUE PAYMENT COLLECTION */}
      {showQuickDuePayModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '16px 20px 24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '4px', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>💵</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  বাকি টাকা আদায় (শোধ নিল)
                </h3>
              </div>
              <button
                onClick={() => setShowQuickDuePayModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickDuePayment} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  কাস্টমার সিলেক্ট করুন *
                </label>
                <select
                  value={quickDuePayCustomerId}
                  onChange={(e) => {
                    setQuickDuePayCustomerId(e.target.value);
                    const sel = customers.find(c => c.id === e.target.value);
                    if (sel) setQuickDuePayAmount(String(sel.totalDue || sel.total_due || ''));
                  }}
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                >
                  <option value="">-- বাকিদার কাস্টমার বাছাই করুন --</option>
                  {customers.filter(c => (Number(c.totalDue || c.total_due) || 0) > 0).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (বাকি: ৳{c.totalDue || c.total_due})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  কাস্টমার কত টাকা শোধ দিল? *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: '#4f46e5', fontWeight: '900' }}>৳</span>
                  <input
                    type="number"
                    placeholder="০.০০"
                    value={quickDuePayAmount}
                    onChange={(e) => setQuickDuePayAmount(e.target.value)}
                    required
                    className="num-font"
                    style={{ width: '100%', padding: '14px 14px 14px 38px', borderRadius: '14px', border: '2px solid #4f46e5', outline: 'none', boxSizing: 'border-box', fontSize: '24px', fontWeight: '900' }}
                  />
                </div>
              </div>

              {/* Instant Taka Preset Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[50, 100, 200, 500, 1000, 2000, 5000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(quickDuePayAmount) || 0;
                      setQuickDuePayAmount(String(cur + val));
                      triggerHaptic('light');
                    }}
                    style={{
                      background: '#eef2ff',
                      border: '1px solid #c7d2fe',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      color: '#4338ca',
                      cursor: 'pointer'
                    }}
                  >
                    +৳{val}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickDuePayModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!quickDuePayAmount || parseFloat(quickDuePayAmount) <= 0 || !quickDuePayCustomerId}
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                >
                  ✓ বাকি আদায় সেভ ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💸 MODAL 4: QUICK EXPENSE */}
      {showQuickExpenseModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '16px 20px 24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '4px', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>💸</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  দোকান খরচ এন্ট্রি
                </h3>
              </div>
              <button
                onClick={() => setShowQuickExpenseModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickExpense} style={{ display: 'grid', gap: '14px' }}>
              {/* Category Chips */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  খরচের খাত বাছাই করুন
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['চা/নাস্তা', 'দোকান ভাড়া', 'কারেন্ট বিল', 'পরিবহন খরচ', 'অন্যান্য খরচ'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setQuickExpenseCat(cat); triggerHaptic('light'); }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: quickExpenseCat === cat ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                        background: quickExpenseCat === cat ? '#eef2ff' : '#f8fafc',
                        color: quickExpenseCat === cat ? '#4338ca' : '#475569',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  খরচের টাকার পরিমাণ *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: '#4f46e5', fontWeight: '900' }}>৳</span>
                  <input
                    type="number"
                    placeholder="০.০০"
                    value={quickExpenseAmount}
                    onChange={(e) => setQuickExpenseAmount(e.target.value)}
                    required
                    autoFocus
                    className="num-font"
                    style={{ width: '100%', padding: '14px 14px 14px 38px', borderRadius: '14px', border: '2px solid #4f46e5', outline: 'none', boxSizing: 'border-box', fontSize: '24px', fontWeight: '900' }}
                  />
                </div>
              </div>

              {/* Instant Taka Preset Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[10, 20, 50, 100, 200, 500, 1000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(quickExpenseAmount) || 0;
                      setQuickExpenseAmount(String(cur + val));
                      triggerHaptic('light');
                    }}
                    style={{
                      background: '#eef2ff',
                      border: '1px solid #c7d2fe',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      color: '#4338ca',
                      cursor: 'pointer'
                    }}
                  >
                    +৳{val}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickExpenseModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!quickExpenseAmount || parseFloat(quickExpenseAmount) <= 0}
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                >
                  ✓ খরচ সেভ করুন ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌅 MODAL 5: MORNING OPENING CASH */}
      {showOpeningModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '16px 20px 24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '4px', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '26px' }}>🌅</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  সকালের ক্যাশ বাক্স শুরু (ওপেনিং ক্যাশ)
                </h3>
              </div>
              <button
                onClick={() => setShowOpeningModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              দোকান খোলার সময় ক্যাশ ড্রয়ারে বা বাক্সে কত টাকা ভাঙতি/নোট জমা ছিল তা লিখুন।
            </p>

            <form onSubmit={handleSaveOpeningCash} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  সকালের শুরুর টাকা (টাকায়)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: '#4f46e5', fontWeight: '900' }}>৳</span>
                  <input
                    type="number"
                    placeholder="০.০০"
                    value={openingInput}
                    onChange={(e) => setOpeningInput(e.target.value)}
                    autoFocus
                    className="num-font"
                    style={{ width: '100%', padding: '14px 14px 14px 38px', borderRadius: '14px', border: '2px solid #4f46e5', outline: 'none', boxSizing: 'border-box', fontSize: '24px', fontWeight: '900' }}
                  />
                </div>
              </div>

              {/* Fast Presets */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[100, 200, 500, 1000, 2000, 5000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(openingInput) || 0;
                      setOpeningInput(String(cur + val));
                      triggerHaptic('light');
                    }}
                    style={{
                      background: '#eef2ff',
                      border: '1px solid #c7d2fe',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      color: '#4338ca',
                      cursor: 'pointer'
                    }}
                  >
                    +৳{val}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowOpeningModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                >
                  ✓ সেভ করুন ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌙 MODAL 6: NIGHT CLOSING & CASH BALANCING */}
      {showClosingModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '16px 20px 24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '4px', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '26px' }}>🌙</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  দিন শেষের ক্যাশ ব্যালেন্স ও হিসাব মেলানো
                </h3>
              </div>
              <button
                onClick={() => setShowClosingModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            {/* Printable Balance Sheet Box */}
            <div id="day-end-slip" style={{
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '16px',
              fontFamily: 'monospace, "Hind Siliguri", sans-serif'
            }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: '900' }}>{tenant?.shopName}</h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>দৈনিক ক্যাশ ক্লোজিং স্লিপ • {currentDateString}</span>
              </div>

              <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🌅 সকালের শুরু (ওপেনিং):</span>
                  <strong className="num-font">৳{openingCash.toLocaleString('en-US')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>🟢 সারাদিনের নগদ বিক্রি (+):</span>
                  <strong className="num-font">+৳{(metrics.cashSales || 0).toLocaleString('en-US')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>💸 মোট দোকান খরচ (-):</span>
                  <strong className="num-font">-৳{(metrics.expenses || 0).toLocaleString('en-US')}</strong>
                </div>
                <div style={{ borderTop: '2px solid #0f172a', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>
                  <span>💵 ক্যাশ বাক্সে থাকার কথা:</span>
                  <strong className="num-font" style={{ color: '#059669' }}>
                    ৳{(openingCash + (metrics.cashSales || 0) - (metrics.expenses || 0)).toLocaleString('en-US')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#4338ca', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                  <span>💰 আজকের খাঁটি নিট লাভ:</span>
                  <strong className="num-font">৳{(metrics.netProfit || 0).toLocaleString('en-US')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#dc2626' }}>
                  <span>🔴 নতুন মোট বকেয়া বাকি:</span>
                  <strong className="num-font">৳{(metrics.totalMarketDue || 0).toLocaleString('en-US')}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                style={{
                  flex: 1,
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>🖨️</span>
                <span>স্লিপ প্রিন্ট করুন</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  speakAnnouncement('আজকের দিনের হিসাব সফলভাবে ক্লোজ করা হয়েছে');
                  setShowClosingModal(false);
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '900',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                ✓ ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ MODAL 7: FAST DUE CUSTOMER SELECTOR */}
      {showFastDueModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '16px 20px 24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '4px', margin: '0 auto 14px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '26px' }}>🔴</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  বাকি খাতায় লিখুন (৳{fastTaka})
                </h3>
              </div>
              <button
                onClick={() => setShowFastDueModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFastDueSaleSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  কার নামে বাকি লিখবেন? *
                </label>
                <input
                  type="text"
                  placeholder="যেমন: স্বপন ভাই / করিম চাচা"
                  value={fastDueCustomerName}
                  onChange={(e) => setFastDueCustomerName(e.target.value)}
                  list="fast-due-customer-list"
                  required
                  autoFocus
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #ef4444', outline: 'none', boxSizing: 'border-box', fontSize: '16px', fontWeight: '800' }}
                />
                <datalist id="fast-due-customer-list">
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} (বর্তমান বাকি: ৳{c.totalDue || c.total_due || 0})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Quick Customer Selection Chips */}
              {customers.length > 0 && (
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    বা পরিচিত কাস্টমারে চাপুন:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {customers.slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setFastDueCustomerName(c.name);
                          triggerHaptic('light');
                        }}
                        style={{
                          background: fastDueCustomerName === c.name ? '#fef2f2' : '#f8fafc',
                          border: fastDueCustomerName === c.name ? '2px solid #ef4444' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '800',
                          color: fastDueCustomerName === c.name ? '#dc2626' : '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        👤 {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowFastDueModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!fastDueCustomerName}
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                >
                  ✓ বাকি খাতায় লিখুন ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
