'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { getIndustryTheme } from '../../lib/industryConfig';
import Pagination from '../../components/Pagination';
import ThermalReceipt from '../../components/ThermalReceipt';
import VoicePOSCalculatorModal from '../../components/VoicePOSCalculatorModal';
import IndustryUnitSelect from '../../components/IndustryUnitSelect';

const CATEGORY_FAST_ITEMS: Record<string, { name: string; price: number; icon: string; unit: string }[]> = {
  'cat-pharmacy': [
    { name: 'নাপা এক্সট্রা', price: 30, icon: '💊', unit: 'পাতা' },
    { name: 'এইস প্লাস', price: 30, icon: '💊', unit: 'পাতা' },
    { name: 'সেকলো ২০মিগ্রা', price: 70, icon: '💊', unit: 'পাতা' },
    { name: 'ম্যাক্সপ্রো ২০মিগ্রা', price: 90, icon: '💊', unit: 'পাতা' },
    { name: 'অ্যালাট্রোল ১০মিগ্রা', price: 40, icon: '💊', unit: 'পাতা' },
    { name: 'তুসকা কফ সিরাপ', price: 95, icon: '🧴', unit: 'বোতল' },
    { name: 'ওরস্যালাইন-এন', price: 6, icon: '💧', unit: 'প্যাকেট' },
    { name: 'স্যাভলন ব্যান্ডেজ', price: 15, icon: '🩹', unit: 'পিস' },
    { name: 'সিভিত ২৫০mg', price: 25, icon: '💊', unit: 'পাতা' },
    { name: 'ফ্ল্যাজিল ৪০০মিগ্রা', price: 35, icon: '💊', unit: 'পাতা' },
  ],
  'cat-clothing': [
    { name: 'সুতি পাঞ্জাবি (L)', price: 950, icon: '🥻', unit: 'পিস' },
    { name: 'ফরমাল শার্ট (XL)', price: 750, icon: '👔', unit: 'পিস' },
    { name: 'জিন্স প্যান্ট (32)', price: 1100, icon: '👖', unit: 'পিস' },
    { name: 'গোলগলা টি-শার্ট', price: 350, icon: '👕', unit: 'পিস' },
    { name: 'সুতি লুঙ্গি', price: 450, icon: '🩳', unit: 'পিস' },
    { name: 'কটন থ্রি-পিস', price: 1450, icon: '🧕', unit: 'পিস' },
  ],
  'cat-hardware': [
    { name: 'পিপিআর পাইপ ১ ইঞ্চি', price: 45, icon: '🔧', unit: 'ফুট' },
    { name: 'পিতলের পানির কল', price: 320, icon: '🚰', unit: 'পিস' },
    { name: 'এলইডি বাল্ব ১২W', price: 150, icon: '💡', unit: 'পিস' },
    { name: 'মাল্টিপ্লাগ ৫ গজ', price: 280, icon: '🔌', unit: 'পিস' },
    { name: 'কালো কসটেপ', price: 25, icon: '🧰', unit: 'রোল' },
  ],
  'cat-cosmetics': [
    { name: 'নিভিয়া বডি লোশন', price: 350, icon: '🧴', unit: 'বোতল' },
    { name: 'হিমালয়া নিম ফেসওয়াশ', price: 190, icon: '🧼', unit: 'টিউব' },
    { name: 'ম্যাট লিপস্টিক', price: 260, icon: '💄', unit: 'পিস' },
    { name: 'সানসিল্ক শ্যাম্পু', price: 220, icon: '🧴', unit: 'বোতল' },
    { name: 'নেইলপলিশ', price: 80, icon: '💅', unit: 'পিস' },
  ],
  'cat-shoes': [
    { name: 'জেন্টস লেদার সু (42)', price: 1250, icon: '👞', unit: 'জোড়া' },
    { name: 'ক্যাজুয়াল স্নিকার্স (41)', price: 950, icon: '👟', unit: 'জোড়া' },
    { name: 'লেডিস হিল স্যান্ডেল (38)', price: 750, icon: '👡', unit: 'জোড়া' },
    { name: 'বাটার স্পঞ্জের স্যান্ডেল', price: 250, icon: '🩴', unit: 'জোড়া' },
    { name: 'বাচ্চাদের স্কুল জুতা', price: 550, icon: '👞', unit: 'জোড়া' },
    { name: 'সুতি মোজা', price: 60, icon: '🧦', unit: 'জোড়া' },
    { name: 'জুতার পোলিশ ও ব্রাশ', price: 90, icon: '🧴', unit: 'সেট' },
  ],
  'cat-mobile': [
    { name: 'স্ক্রিন গ্লাস প্রোটেক্টর', price: 100, icon: '📱', unit: 'পিস' },
    { name: 'টাইপ-সি ফাস্ট ক্যাবল', price: 150, icon: '🔌', unit: 'পিস' },
    { name: '২০W ফাস্ট চার্জার অ্যাডাপ্টার', price: 550, icon: '⚡', unit: 'পিস' },
    { name: 'বেসাস হেডফোন / ইয়ারফোন', price: 220, icon: '🎧', unit: 'পিস' },
    { name: 'সিলিকন ব্যাক কভার', price: 120, icon: '📱', unit: 'পিস' },
    { name: 'মেমোরি কার্ড ৩২GB', price: 420, icon: '💾', unit: 'পিস' },
    { name: 'ওটিজি অ্যাডাপ্টার', price: 60, icon: '🔌', unit: 'পিস' },
  ],
  'cat-restaurant': [
    { name: 'চিকেন দম বিরিয়ানি', price: 180, icon: '🍗', unit: 'প্লেট' },
    { name: 'বিফ ভুনা খিচুড়ি', price: 220, icon: '🍛', unit: 'প্লেট' },
    { name: 'মোগলাই পরোটা', price: 60, icon: '🫓', unit: 'পিস' },
    { name: 'চিকেন গ্রিল ও নান', price: 140, icon: '🍢', unit: 'সেট' },
    { name: 'স্পেশাল ফালুদা', price: 110, icon: '🍨', unit: 'গ্লাস' },
    { name: 'বোরহানি ৫০০ml', price: 80, icon: '🥛', unit: 'বোতল' },
    { name: 'কোল্ড ড্রিঙ্কস ২৫০ml', price: 30, icon: '🥤', unit: 'বোতল' },
  ],
  'cat-tea': [
    { name: 'স্পেশাল দুধ চা', price: 15, icon: '☕', unit: 'কাপ' },
    { name: 'লেবু রং চা', price: 10, icon: '🍵', unit: 'কাপ' },
    { name: 'আদা ও মাল্টা চা', price: 20, icon: '🫖', unit: 'কাপ' },
    { name: 'বাটার টোস্ট বিস্কুট', price: 10, icon: '🍞', unit: 'পিস' },
    { name: 'গরম সিঙ্গাড়া / সমুচা', price: 10, icon: '🥟', unit: 'পিস' },
    { name: 'বেনসন সিগারেট', price: 15, icon: '🚬', unit: 'শলা' },
    { name: 'ডার্বি সিগারেট', price: 8, icon: '🚬', unit: 'শলা' },
    { name: 'পান ও সুপারি', price: 10, icon: '🫓', unit: 'খিলি' },
  ],
  'cat-grocery': [
    { name: 'সয়াবিন তেল ১ লিটার', price: 180, icon: '🛢️', unit: 'লিটার' },
    { name: 'মিনিকেট চাল ১ কেজি', price: 70, icon: '🍚', unit: 'কেজি' },
    { name: 'চিনি ১ কেজি', price: 140, icon: '🧂', unit: 'কেজি' },
    { name: 'ডিম ১ হালি', price: 48, icon: '🥚', unit: 'হালি' },
    { name: 'মসুর ডাল ১ কেজি', price: 140, icon: '🥣', unit: 'কেজি' },
    { name: 'লাক্স সাবান', price: 60, icon: '🧼', unit: 'পিস' },
    { name: 'ম্যাগি নুডুলস', price: 90, icon: '🍜', unit: 'প্যাক' },
  ],
};

const INDUSTRY_SUBCATS: Record<string, Array<{ id: string; label: string; icon: string; keywords: string[] }>> = {
  'cat-grocery': [
    { id: 'rice-dal', label: 'চাল ও ডাল', icon: '🍚', keywords: ['চাল', 'ডাল', 'মিনিকেট', 'মসুর'] },
    { id: 'oil-ghee', label: 'তেল ও ঘি', icon: '🛢️', keywords: ['তেল', 'সয়াবিন', 'সরিষা', 'ঘি', 'রূপচাঁদা', 'তীর'] },
    { id: 'sugar-salt', label: 'চিনি ও মশলা', icon: '🧂', keywords: ['চিনি', 'লবণ', 'হলুদ', 'মরিচ', 'মশলা'] },
    { id: 'eggs-dairy', label: 'ডিম ও দুধ', icon: '🥚', keywords: ['ডিম', 'দুধ'] },
    { id: 'snacks', label: 'স্ন্যাক্স ও নুডুলস', icon: '🍜', keywords: ['নুডুলস', 'বিস্কুট', 'চা', 'ম্যাগি'] },
    { id: 'toiletries', label: 'সাবান ও ক্লিন', icon: '🧼', keywords: ['সাবান', 'লাক্স', 'শ্যাম্পু', 'হুইল'] }
  ],
  'cat-pharmacy': [
    { id: 'tablet', label: 'ট্যাবলেট ও পাতা', icon: '💊', keywords: ['ট্যাবলেট', 'পাতা', 'নাপা', 'এইস', 'সেকলো'] },
    { id: 'syrup', label: 'সিরাপ ও ড্রপ', icon: '🧴', keywords: ['সিরাপ', 'ড্রপ', 'তুসকা'] },
    { id: 'saline', label: 'স্যালাইন ও ব্যান্ডেজ', icon: '💧', keywords: ['স্যালাইন', 'ব্যান্ডেজ', 'স্যাভলন'] }
  ],
  'cat-clothing': [
    { id: 'panjabi', label: 'পাঞ্জাবি ও থ্রি-পিস', icon: '🥻', keywords: ['পাঞ্জাবি', 'থ্রি-পিস'] },
    { id: 'shirt-pant', label: 'শার্ট ও প্যান্ট', icon: '👔', keywords: ['শার্ট', 'প্যান্ট', 'টি-শার্ট'] },
    { id: 'lungi', label: 'লুঙ্গি', icon: '🩳', keywords: ['লুঙ্গি'] }
  ],
  'cat-shoes': [
    { id: 'gents', label: 'জেন্টস সু', icon: '👞', keywords: ['সু', 'লেদার'] },
    { id: 'sneakers', label: 'স্নিকার্স', icon: '👟', keywords: ['স্নিকার্স', 'কেডস'] },
    { id: 'sandals', label: 'স্যান্ডেল', icon: '🩴', keywords: ['স্যান্ডেল', 'বাটা', 'এপেক্স'] }
  ]
};

export default function PosPage() {
  const { tenant, activeRoleMode, currentStaffUser, triggerHaptic, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id;

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [cart, setCart] = useState<any[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('none');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'due'>('cash');
  const [discount, setDiscount] = useState('0');
  const [cashTendered, setCashTendered] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [showVoiceCalculatorModal, setShowVoiceCalculatorModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [heldCarts, setHeldCarts] = useState<any[]>([]);

  // Industry-Tailored Workflows
  const industryId = tenant?.industryId || 'cat-grocery';
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [tableNumber, setTableNumber] = useState('১');
  const [imeiInput, setImeiInput] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('১২ মাস (১ বছর)');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [celebrationWish, setCelebrationWish] = useState('');
  const [isKotPrint, setIsKotPrint] = useState(false);
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

  // Quick Add Custom Product Modal state
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPrice, setQuickAddPrice] = useState('');
  const [quickAddGeneric, setQuickAddGeneric] = useState('');
  const [quickAddExpiry, setQuickAddExpiry] = useState('');
  const [quickAddSize, setQuickAddSize] = useState('L');
  const [quickAddColor, setQuickAddColor] = useState('');
  const [quickAddUnit, setQuickAddUnit] = useState('পিস');

  // Running Tabs / চলতি আড্ডা খাতা state
  const [runningTabs, setRunningTabs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<any | null>(null);
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabCustomerName, setNewTabCustomerName] = useState('');
  const [showSettleModal, setShowSettleModal] = useState<any | null>(null);

  // Taka to Weight Gram Calculator
  const [showGramModal, setShowGramModal] = useState(false);
  const [gramTargetProduct, setGramTargetProduct] = useState<any | null>(null);
  const [gramInputTaka, setGramInputTaka] = useState('');

  // Camera Barcode Scanner state
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Power Keyboard Shortcuts (F2: New/Focus, F4: Scanner, F9/Space: Checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        triggerHaptic('light');
        if (searchInputRef.current) searchInputRef.current.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        triggerHaptic('light');
        setShowCameraScanner(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadRunningTabs = async () => {
    if (!currentTenantId) return;
    try {
      const res = await fetch(`/api/running-tabs?tenantId=${currentTenantId}`);
      if (res.ok) {
        const tabs = await res.json();
        setRunningTabs(Array.isArray(tabs) ? tabs : []);
      }
    } catch (e) {}
  };

  // Load products, customers & running tabs strictly for active store
  const loadData = async () => {
    if (!currentTenantId) return;
    try {
      const prodRes = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (prodRes.ok) {
        const pList = await prodRes.json();
        setProducts(Array.isArray(pList) ? pList : []);
      }
    } catch (e) {}

    try {
      const custRes = await fetch(`/api/customers?tenantId=${currentTenantId}`);
      if (custRes.ok) {
        const cList = await custRes.json();
        setCustomers(Array.isArray(cList) ? cList : []);
      }
    } catch (e) {}

    await loadRunningTabs();
  };

  useEffect(() => {
    setCart([]);
    loadData();
  }, [currentTenantId]);

  // Handle Voice Query from Universal Voice Assistant
  useEffect(() => {
    if (products.length > 0 && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const vq = params.get('voiceQuery');
      if (vq) {
        parseVoiceCommand(vq);
        window.history.replaceState({}, '', '/pos');
      }
    }
  }, [products]);

  // Universal Voice integration for POS (Add to cart & Checkout)
  useEffect(() => {
    const handleVoiceAddToCart = (e: any) => {
      const { product, quantity } = e.detail || {};
      if (product) {
        const prod = {
          id: product.id,
          name: product.name,
          banglaName: product.bangla_name || product.name,
          sellingPrice: Number(product.selling_price || product.sellingPrice) || 50,
          purchasePrice: Number(product.purchase_price || product.purchasePrice) || 40,
          unit: product.unit || 'পিস',
          stock: Number(product.stock) || 10,
          icon: product.icon || '📦'
        };
        addToCart(prod, Number(quantity) || 1);
        triggerHaptic('success');
        playBeep(1100);
        setVoiceNotice(`✓ ভয়েসে যুক্ত: ${prod.banglaName} (${quantity || 1} ${prod.unit})`);
      }
    };

    const handleVoiceMultiItemsAdd = (e: any) => {
      const { items } = e.detail || {};
      if (Array.isArray(items) && items.length > 0) {
        items.forEach(({ product, quantity }: any) => {
          if (product) {
            const prod = {
              id: product.id,
              name: product.name,
              banglaName: product.bangla_name || product.name,
              sellingPrice: Number(product.selling_price || product.sellingPrice) || 50,
              purchasePrice: Number(product.purchase_price || product.purchasePrice) || 40,
              unit: product.unit || 'পিস',
              stock: Number(product.stock) || 10,
              icon: product.icon || '📦'
            };
            addToCart(prod, Number(quantity) || 1);
          }
        });
        triggerHaptic('success');
        playBeep(1100);
        setVoiceNotice(`✓ ভয়েসে ফর্দ থেকে ${items.length}টি পণ্য কার্টে যুক্ত হয়েছে!`);
      }
    };

    const handleVoiceCheckout = () => {
      if (cart.length > 0) {
        setPaymentMethod('cash');
        handleCheckout();
      } else {
        setVoiceNotice('কার্টে কোনো পণ্য নেই। আগে মুখে বলে পণ্য যোগ করুন।');
      }
    };

    window.addEventListener('voice-add-to-cart', handleVoiceAddToCart);
    window.addEventListener('voice-multi-items-add', handleVoiceMultiItemsAdd);
    window.addEventListener('voice-checkout-cash', handleVoiceCheckout);

    return () => {
      window.removeEventListener('voice-add-to-cart', handleVoiceAddToCart);
      window.removeEventListener('voice-multi-items-add', handleVoiceMultiItemsAdd);
      window.removeEventListener('voice-checkout-cash', handleVoiceCheckout);
    };
  }, [cart, currentTenantId, customers, selectedCustomer, discount, paymentMethod]);

  const playBeep = (freq: number = 880) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  const addToCart = (product: any, qty: number = 1) => {
    playBeep(880);
    triggerHaptic('light');
    const unitP = Number(product.sellingPrice) || 0;
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        const newQty = Math.round((existing.quantity + qty) * 1000) / 1000;
        const pPrice = existing.unitPrice !== undefined ? existing.unitPrice : unitP;
        return prev.map(i => i.product.id === product.id ? {
          ...i,
          quantity: newQty,
          totalPrice: Math.round(newQty * pPrice * 100) / 100
        } : i);
      }
      return [...prev, {
        product,
        quantity: qty,
        unitPrice: unitP,
        totalPrice: Math.round(unitP * qty * 100) / 100
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    playBeep(delta > 0 ? 950 : 700);
    triggerHaptic('light');
    setCart(prev => prev.map(i => {
      if (i.product.id === id) {
        const pPrice = i.unitPrice !== undefined ? i.unitPrice : i.product.sellingPrice;
        let step = delta;
        if (i.quantity <= 1 && Math.abs(delta) === 1) {
          step = delta > 0 ? 0.25 : -0.25;
        }
        const newQty = Math.max(0.05, Math.round((i.quantity + step) * 1000) / 1000);
        return {
          ...i,
          quantity: newQty,
          totalPrice: Math.round(newQty * pPrice * 100) / 100
        };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const setDirectQuantity = (id: string, qty: number) => {
    playBeep(900);
    triggerHaptic('light');
    setCart(prev => prev.map(i => {
      if (i.product.id === id) {
        const cleanQty = Math.max(0.01, Math.round(qty * 1000) / 1000);
        const pPrice = i.unitPrice !== undefined ? i.unitPrice : i.product.sellingPrice;
        return {
          ...i,
          quantity: cleanQty,
          totalPrice: Math.round(cleanQty * pPrice * 100) / 100
        };
      }
      return i;
    }));
  };

  const handlePromptTakaAmount = (item: any) => {
    const takaStr = prompt(`"${item.product.banglaName}" কত টাকার বিক্রি করতে চান? (যেমন: ২০, ৩০, ৫০ বা ১০০ টাকা):`);
    if (!takaStr) return;
    const taka = parseFloat(toEnDigits(takaStr));
    if (!taka || taka <= 0) return;

    const unitP = item.unitPrice !== undefined ? item.unitPrice : item.product.sellingPrice;
    if (unitP <= 0) return;

    const calculatedQty = Math.round((taka / unitP) * 1000) / 1000;
    setCart(prev => prev.map(i => {
      if (i.product.id === item.product.id) {
        return {
          ...i,
          quantity: calculatedQty,
          totalPrice: taka
        };
      }
      return i;
    }));
    triggerHaptic('success');
    playBeep(1100);
    speakAnnouncement(`${item.product.banglaName} ${taka} টাকা মেমোতে সেট করা হয়েছে।`);
  };

  const removeFromCart = (id: string) => {
    playBeep(500);
    triggerHaptic('medium');
    setCart(prev => prev.filter(i => i.product.id !== id));
  };

  const updateCartUnitPrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === id) {
        return {
          ...i,
          unitPrice: newPrice,
          totalPrice: i.quantity * newPrice
        };
      }
      return i;
    }));
  };

  const savePriceToCatalog = async (product: any, newPrice: number) => {
    try {
      await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellingPrice: newPrice })
      });
      triggerHaptic('success');
      playBeep(1100);
      setVoiceNotice(`✓ "${product.banglaName || product.name}" এর নতুন বিক্রয় মূল্য ৳${newPrice} সেভ হয়েছে!`);
      loadData();
      setTimeout(() => setVoiceNotice(''), 4000);
    } catch (e) {}
  };

  const handleQuickAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName || !quickAddPrice || !currentTenantId) return;

    const price = Number(quickAddPrice) || 50;
    const newProdId = 'prod-q-' + Date.now().toString().slice(-6);
    const autoBarcode = '894' + Math.floor(10000000 + Math.random() * 90000000);

    const defaultUnit = industryId === 'cat-pharmacy' ? 'পাতা' : industryId === 'cat-hardware' ? 'ফুট' : industryId === 'cat-grocery' ? 'কেজি' : 'পিস';
    const defaultEmoji = industryId === 'cat-pharmacy' ? '💊' : industryId === 'cat-clothing' ? '🥻' : industryId === 'cat-hardware' ? '🔧' : '📦';

    const newProd = {
      id: newProdId,
      tenantId: currentTenantId,
      banglaName: quickAddName,
      name: quickAddName,
      sellingPrice: price,
      purchasePrice: Math.round(price * 0.85),
      stock: 50,
      unit: quickAddUnit || defaultUnit,
      categoryId: industryId,
      genericName: industryId === 'cat-pharmacy' ? quickAddGeneric || null : null,
      expiryDate: industryId === 'cat-pharmacy' ? quickAddExpiry || null : null,
      size: industryId === 'cat-clothing' ? quickAddSize || null : null,
      color: industryId === 'cat-clothing' ? quickAddColor || null : null,
      lowStockThreshold: 5,
      barcode: autoBarcode,
      imageEmoji: defaultEmoji
    };

    addToCart(newProd, 1);
    triggerHaptic('success');
    speakAnnouncement(`নতুন পণ্য ${quickAddName} ${price} টাকা মেমো ও স্টকে যুক্ত হয়েছে।`);

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd)
      });
      loadData();
    } catch (e) {}

    setShowQuickAddModal(false);
    setQuickAddName('');
    setQuickAddPrice('');
    setQuickAddGeneric('');
    setQuickAddExpiry('');
    setQuickAddSize('L');
    setQuickAddColor('');
    setQuickAddUnit('পিস');
  };

  const handleCreateNewTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabCustomerName || !currentTenantId) return;
    try {
      const res = await fetch('/api/running-tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          customerName: newTabCustomerName,
          items: cart,
          totalAmount: subtotalCart
        })
      });
      if (res.ok) {
        speakAnnouncement(`${newTabCustomerName} এর চলতি খাতা খোলা হয়েছে।`);
        await loadRunningTabs();
        setCart([]);
        setShowNewTabModal(false);
        setNewTabCustomerName('');
        triggerHaptic('success');
      }
    } catch (e) {}
  };

  const handleSettleTab = async (tab: any, paymentMethod: 'cash' | 'due') => {
    try {
      const res = await fetch('/api/running-tabs/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabId: tab.id,
          paymentMethod,
          customerName: tab.customer_name
        })
      });
      if (res.ok) {
        speakAnnouncement(`${tab.customer_name} এর ৳${tab.total_amount} ${paymentMethod === 'cash' ? 'নগদ আদায়' : 'বাকি খাতায় জমা'} হয়েছে।`);
        triggerHaptic('success');
        await loadRunningTabs();
        await loadData();
        setShowSettleModal(null);
      }
    } catch (e) {}
  };

  const handleFastAddItem = (name: string, price: number, unit: string = 'পিস', icon: string = '📦') => {
    const itemObj = {
      id: 'fast-' + name,
      banglaName: name,
      name,
      sellingPrice: price,
      purchasePrice: Math.round(price * 0.8),
      stock: 999,
      unit,
      icon
    };
    addToCart(itemObj, 1);
    speakAnnouncement(`${name} ${price} টাকা যোগ হয়েছে`);
  };

  const handleGramConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gramTargetProduct || !gramInputTaka) return;
    const taka = parseFloat(gramInputTaka);
    const unitPrice = Number(gramTargetProduct.sellingPrice) || 100;
    if (taka <= 0 || unitPrice <= 0) return;

    const calculatedQty = Math.round((taka / unitPrice) * 1000) / 1000;
    const grams = Math.round(calculatedQty * 1000);

    addToCart(gramTargetProduct, calculatedQty);
    speakAnnouncement(`${gramTargetProduct.banglaName} ${taka} টাকায় ${grams} গ্রাম যোগ হয়েছে`);
    triggerHaptic('success');
    setShowGramModal(false);
    setGramInputTaka('');
    setGramTargetProduct(null);
  };

  const subtotalCart = cart.reduce((acc, i) => acc + i.totalPrice, 0);
  const totalCartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const finalPayable = Math.max(0, subtotalCart - (Number(discount) || 0));

  // Change Return Calculation
  const tenderedNum = Number(cashTendered) || 0;
  const changeToReturn = tenderedNum > 0 ? tenderedNum - finalPayable : 0;

  // Camera Barcode Scanner Controls
  const openCameraScanner = async () => {
    setCameraError('');
    setShowCameraScanner(true);
    triggerHaptic('medium');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check for native BarcodeDetector
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });

        const scanLoop = async () => {
          if (!videoRef.current || !mediaStreamRef.current) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              handleBarcodeDetected(code);
              closeCameraScanner();
              return;
            }
          } catch (e) {}
          if (mediaStreamRef.current) {
            requestAnimationFrame(scanLoop);
          }
        };
        requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      setCameraError('ক্যামেরা চালু করা যায়নি। ক্যামেরার অনুমতি (Permission) নিশ্চিত করুন।');
    }
  };

  const closeCameraScanner = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCameraScanner(false);
  };

  const handleBarcodeDetected = (barcode: string) => {
    const found = products.find(p => p.barcode === barcode);
    if (found) {
      addToCart(found, 1);
      triggerHaptic('success');
      playBeep(1100);
      setVoiceNotice(`✓ স্ক্যান সফল: ${found.banglaName}`);
      setTimeout(() => setVoiceNotice(''), 4000);
    } else {
      triggerHaptic('warning');
      setVoiceNotice(`বারকোড (${barcode}) সিস্টেমে পাওয়া যায়নি।`);
      setTimeout(() => setVoiceNotice(''), 4000);
    }
  };

  // Voice Recognition Handler (Continuous Live Stream with Anti-Cutoff Timer)
  const posSilenceTimerRef = useRef<any>(null);
  const posTranscriptBufferRef = useRef<string>('');

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে ভয়েস সাপোর্ট করে না। Google Chrome ব্যবহার করুন।');
      return;
    }

    if (posSilenceTimerRef.current) clearTimeout(posSilenceTimerRef.current);
    posTranscriptBufferRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setVoiceNotice('🎙️ শুনছি... বলুন: যেমন "চিনি ১ কেজি" বা "তেল ২ লিটার"');
    triggerHaptic('medium');

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalChunk += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (finalChunk) {
        posTranscriptBufferRef.current += finalChunk;
      }

      const fullSpoken = (posTranscriptBufferRef.current + ' ' + interim).trim();
      setVoiceNotice(`শোনা যাচ্ছে: "${fullSpoken}"`);

      // 1.5-second silence timer before finishing command
      if (posSilenceTimerRef.current) clearTimeout(posSilenceTimerRef.current);
      posSilenceTimerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch (e) {}
        setIsListening(false);
        const finalToParse = (posTranscriptBufferRef.current + ' ' + interim).trim();
        if (finalToParse) {
          setVoiceNotice(`✓ মেমো হচ্ছে: "${finalToParse}"`);
          parseVoiceCommand(finalToParse);
        }
        setTimeout(() => setVoiceNotice(''), 4000);
      }, 1500);
    };

    recognition.onerror = (err: any) => {
      if (err.error === 'no-speech') return;
      setIsListening(false);
      setVoiceNotice('শুনতে সমস্যা হয়েছে। আবার বলুন।');
      setTimeout(() => setVoiceNotice(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const toEnDigits = (str: string) => {
    return str.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
  };

  const parseVoiceCommand = async (rawText: string) => {
    if (!rawText || !currentTenantId) return;

    // Convert spoken numbers like 'দেড়শ', 'আড়াই কেজি'
    const toSpokenNums = (str: string) => {
      let s = String(str || '');
      s = s.replace(/দেড়শো|দেড়শ|দেড়শো|দেড়শ/g, '150');
      s = s.replace(/আড়াইশো|আড়াইশ|আড়াইশো|আড়াইশ/g, '250');
      s = s.replace(/সাড়ে তিনশো|সাড়ে তিনশ/g, '350');
      s = s.replace(/সাড়ে চারশো|সাড়ে চারশ/g, '450');
      s = s.replace(/একশত|একশো|একশ/g, '100');
      s = s.replace(/দুইশত|দুইশো|দুইশ/g, '200');
      s = s.replace(/তিনশত|তিনশো|তিনশ/g, '300');
      s = s.replace(/চারশত|চারশো|চারশ/g, '400');
      s = s.replace(/পাঁচশত|পাঁচশো|পাঁচশ/g, '500');
      s = s.replace(/দেড় হাজার|দেড় হাজার/g, '1500');
      s = s.replace(/আড়াই হাজার|আড়াই হাজার/g, '2500');
      s = s.replace(/এক হাজার/g, '1000');
      s = s.replace(/দেড় কেজি|দেড় কেজি/g, '1.5 কেজি');
      s = s.replace(/আড়াই কেজি|আড়াই কেজি/g, '2.5 কেজি');
      s = s.replace(/আধা কেজি|আধ কেজি|হাফ কেজি/g, '0.5 কেজি');
      return s;
    };

    // Check for multi-item voice sale: "২ কেজি চিনি আর ১ লিটার তেল আর ১টা সাবান"
    const segments = rawText.split(/\s+(?:আর|এবং|,)\s+/).filter(Boolean);
    if (segments.length > 1) {
      for (const seg of segments) {
        await parseSingleVoiceSegment(seg, toSpokenNums);
      }
      speakAnnouncement(`কার্টে মোট ${segments.length}টি আইটেম যুক্ত করা হয়েছে।`);
      return;
    }

    await parseSingleVoiceSegment(rawText, toSpokenNums);
  };

  const parseSingleVoiceSegment = async (rawText: string, toSpokenNums: (s: string) => string) => {
    const normalized = toEnDigits(toSpokenNums(rawText.toLowerCase()));

    // 1. Detect if spoken as exact taka amount (e.g., "৫০ টাকার তেল", "৩০ টাকার ডাল")
    let targetTakaAmount: number | null = null;
    const takaAmountMatch = normalized.match(/(\d+)\s*(টাকা|tk|taka)/i);
    if (/টাকার/.test(rawText) && takaAmountMatch) {
      targetTakaAmount = Number(takaAmountMatch[1]);
    }

    // 2. Detect requested quantity / weight
    let targetQuantity: number | null = null;

    // A. Eggs & pieces: "২টা", "১টা", "৩টা", "৪টা", "দুইটা", "একটা", "তিনটা"
    if (/২\s*টা|দুইটা|২টা/.test(normalized)) {
      targetQuantity = 2;
    } else if (/১\s*টা|একটা|১টা/.test(normalized)) {
      targetQuantity = 1;
    } else if (/৩\s*টা|তিনটা|৩টা/.test(normalized)) {
      targetQuantity = 3;
    } else if (/৪\s*টা|চারটা|১\s*হালি|এক\s*হালি/.test(normalized)) {
      targetQuantity = 4;
    } else if (/২\s*হালি|দুই\s*হালি/.test(normalized)) {
      targetQuantity = 8;
    }
    // B. Fractional Weights (কেজি / লিটার / গ্রাম / পোয়া)
    else if (/আধা\s*কেজি|হাফ\s*কেজি|৫০০\s*গ্রাম|500\s*গ্রাম/.test(rawText) || /0\.5\s*কেজি/.test(normalized)) {
      targetQuantity = 0.5;
    } else if (/এক\s*পোয়া|১\s*পোয়া|১\s*পোয়া|২৫০\s*গ্রাম|250\s*গ্রাম/.test(rawText) || /0\.25\s*কেজি/.test(normalized)) {
      targetQuantity = 0.25;
    } else if (/দেড়\s*কেজি|দেড়\s*কেজি|1\.5\s*কেজি/.test(rawText)) {
      targetQuantity = 1.5;
    } else if (/আড়াই\s*কেজি|আড়াই\s*কেজি|2\.5\s*কেজি/.test(rawText)) {
      targetQuantity = 2.5;
    } else if (/৭৫০\s*গ্রাম|750\s*গ্রাম/.test(rawText)) {
      targetQuantity = 0.75;
    } else if (/১০০\s*গ্রাম|100\s*গ্রাম/.test(rawText)) {
      targetQuantity = 0.1;
    } else {
      const unitMatch = normalized.match(/(\d+(\.\d+)?)\s*(কেজি|লিটার|বস্তা|প্যাকেট|প্যাক|পাতা|ফুট|গজ|কাপ|প্লেট|বোতল)/);
      if (unitMatch) {
        targetQuantity = parseFloat(unitMatch[1]);
      }
    }

    // 3. Spoken unit price (if not taka amount): e.g. "প্যারাসুট তেল ১০০ টাকা"
    let extractedPrice: number | null = null;
    if (!targetTakaAmount && takaAmountMatch) {
      extractedPrice = Number(takaAmountMatch[1]);
    }

    // Extract product name
    let cleanedName = rawText
      .replace(/[০-৯0-9]+/g, '')
      .replace(/(টাকা|টাকার|tk|taka|কেজি|লিটার|পিস|পাতা|টা|গ্রাম|পোয়া|পোয়া|আধা|হাফ|দেড়|দেড়|হালি|ফুট|গজ|কাপ|প্লেট|বোতল|বিক্রি|মেমো)/gi, '')
      .trim();

    if (!cleanedName && rawText) {
      cleanedName = rawText.trim();
    }

    // Find in existing products (Matches name, banglaName, genericName, brand)
    let foundProd = products.find(p =>
      (p.banglaName && (p.banglaName.toLowerCase().includes(cleanedName.toLowerCase()) || cleanedName.toLowerCase().includes(p.banglaName.toLowerCase()))) ||
      (p.name && (p.name.toLowerCase().includes(cleanedName.toLowerCase()) || cleanedName.toLowerCase().includes(p.name.toLowerCase()))) ||
      (p.genericName && (p.genericName.toLowerCase().includes(cleanedName.toLowerCase()) || cleanedName.toLowerCase().includes(p.genericName.toLowerCase()))) ||
      (p.brand && (p.brand.toLowerCase().includes(cleanedName.toLowerCase()) || cleanedName.toLowerCase().includes(p.brand.toLowerCase())))
    );

    if (foundProd) {
      const unitPrice = extractedPrice && extractedPrice > 0 ? extractedPrice : foundProd.sellingPrice;
      let finalQty = 1;

      if (foundProd.unit === 'হালি') {
        if (targetQuantity !== null) {
          finalQty = targetQuantity / 4;
        }
      } else if (foundProd.unit === 'পাতা') {
        if (targetQuantity !== null) {
          if (/পাতা/.test(rawText)) {
            finalQty = targetQuantity;
          } else {
            finalQty = targetQuantity / 10;
          }
        }
      } else {
        if (targetQuantity !== null) {
          finalQty = targetQuantity;
        }
      }

      if (targetTakaAmount && targetTakaAmount > 0) {
        finalQty = Math.round((targetTakaAmount / unitPrice) * 1000) / 1000;
      }

      const prodToAdd = { ...foundProd, sellingPrice: unitPrice };
      addToCart(prodToAdd, finalQty);
      triggerHaptic('success');
      playBeep(1100);

      const calculatedTotal = Math.round(finalQty * unitPrice * 100) / 100;
      let unitLabel = `${finalQty} ${foundProd.unit}`;
      if (foundProd.unit === 'হালি') {
        unitLabel = `${Math.round(finalQty * 4)}টা ডিম`;
      } else if (foundProd.unit === 'পাতা') {
        unitLabel = `${Math.round(finalQty * 10)}টি ট্যাবলেট`;
      }

      setVoiceNotice(`✓ কার্টে যুক্ত: ${foundProd.banglaName} (${unitLabel} - ৳${calculatedTotal})`);
      speakAnnouncement(`${foundProd.banglaName} ${unitLabel} ${calculatedTotal} টাকা কার্টে যুক্ত হয়েছে।`);

      if (extractedPrice && extractedPrice > 0 && extractedPrice !== foundProd.sellingPrice) {
        fetch(`/api/products/${foundProd.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sellingPrice: extractedPrice })
        }).then(() => loadData()).catch(() => {});
      }
    } else {
      const price = extractedPrice && extractedPrice > 0 ? extractedPrice : 50;
      const finalName = cleanedName || 'নতুন পণ্য';
      const newProdId = 'prod-v-' + Date.now().toString().slice(-6);
      const autoBarcode = '894' + Math.floor(10000000 + Math.random() * 90000000);
      const finalQty = targetQuantity || 1;

      const newProductObj = {
        id: newProdId,
        tenantId: currentTenantId,
        banglaName: finalName,
        name: finalName,
        sellingPrice: price,
        purchasePrice: Math.round(price * 0.85),
        stock: 50,
        unit: 'পিস',
        lowStockThreshold: 5,
        barcode: autoBarcode,
        imageEmoji: '📦'
      };

      addToCart(newProductObj, finalQty);
      triggerHaptic('success');
      playBeep(1200);
      const calcTot = Math.round(finalQty * price * 100) / 100;
      setVoiceNotice(`✓ নতুন পণ্য নিবন্ধিত ও কার্টে যুক্ত: ${finalName} (${finalQty} পিস - ৳${calcTot})`);
      speakAnnouncement(`নতুন পণ্য ${finalName} ${calcTot} টাকা মেমো ও স্টকে যুক্ত হয়েছে।`);

      try {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProductObj)
        });
        loadData();
      } catch (e) {}
    }
  };

  // Hold & Resume Cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const custObj = customers.find(c => c.id === selectedCustomer);
    const holdItem = {
      id: 'hold-' + Date.now(),
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      customerName: custObj ? custObj.name : 'ক্রেতা ' + (heldCarts.length + 1),
      cart: [...cart],
      totalAmount: subtotalCart
    };
    setHeldCarts(prev => [holdItem, ...prev]);
    setCart([]);
    setSelectedCustomer('none');
    triggerHaptic('success');
    speakAnnouncement('কার্ট হোল্ড করা হয়েছে। পরবর্তী ক্রেতাকে দিন।');
  };

  const handleResumeCart = (holdItem: any) => {
    setCart(holdItem.cart);
    setHeldCarts(prev => prev.filter(h => h.id !== holdItem.id));
    triggerHaptic('light');
    speakAnnouncement(`${holdItem.customerName} এর কার্ট পুনরায় চালু হয়েছে।`);
  };

  // Send Invoice to WhatsApp
  const sendInvoiceWhatsApp = (rcpt: any) => {
    const cleanPhone = rcpt.customerPhone ? rcpt.customerPhone.replace(/[^0-9]/g, '') : '';
    let msg = `*${rcpt.shopName}*\n`;
    msg += `রসিদ নং: ${rcpt.invoiceNo}\n`;
    msg += `তারিখ: ${rcpt.date}\n`;
    msg += `--------------------------\n`;
    rcpt.items.forEach((it: any, idx: number) => {
      msg += `${idx + 1}. ${it.product.banglaName || it.product.name} × ${it.quantity} = ৳${it.totalPrice}\n`;
    });
    msg += `--------------------------\n`;
    msg += `মোট বিল: ৳${rcpt.totalAmount}\n`;
    msg += `পরিশোধ: ৳${rcpt.paidAmount}\n`;
    if (rcpt.dueAmount > 0) {
      msg += `বকেয়া বাকি: ৳${rcpt.dueAmount}\n`;
    }
    msg += `\nআমাদের দোকানে আসার জন্য ধন্যবাদ! 🛍️`;

    window.open(`https://wa.me/88${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Fast Checkout
  const handleCheckout = async () => {
    if (cart.length === 0 || !currentTenantId) return;
    setSubmitting(true);

    const custObj = customers.find(c => c.id === selectedCustomer);
    const paid = paymentMethod === 'due' ? 0 : (tenderedNum > 0 && tenderedNum < finalPayable ? tenderedNum : finalPayable);
    const due = Math.max(0, finalPayable - paid);

    const payload = {
      tenantId: currentTenantId,
      customerId: selectedCustomer !== 'none' ? selectedCustomer : null,
      customerName: custObj ? custObj.name : 'নগদ কাস্টমার',
      items: cart.map(i => ({
        productId: i.product.id,
        productName: i.product.banglaName || i.product.name,
        quantity: i.quantity,
        sellingPrice: i.product.sellingPrice,
        purchasePrice: i.product.purchasePrice,
        totalPrice: i.totalPrice
      })),
      discount: Number(discount) || 0,
      totalAmount: finalPayable,
      paidAmount: paid,
      dueAmount: due,
      paymentMethod,
      cashier: currentStaffUser?.name || tenant?.ownerName || 'দোকান মালিক'
    };

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        playBeep(1200);
        triggerHaptic('success');
        speakAnnouncement(`${finalPayable} টাকা ${paymentMethod === 'cash' ? 'নগদ' : paymentMethod === 'due' ? 'বাকি' : 'ডিজিটাল'} বিক্রি সম্পন্ন হয়েছে।`);

        const indTheme = getIndustryTheme(tenant?.industryId);

        setReceipt({
          shopName: tenant?.shopName || 'আমার দোকান',
          phone: tenant?.phone || '',
          location: tenant?.location || 'বাজার',
          industryId: tenant?.industryId || 'cat-grocery',
          industrySubtitle: indTheme.receiptSubtitle,
          terms: indTheme.terms,
          invoiceNo: data.order?.invoiceNo || 'INV-' + Date.now().toString().slice(-6),
          date: new Date().toLocaleDateString('bn-BD') + ' ' + new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          cashier: currentStaffUser?.name || tenant?.ownerName || 'দোকান মালিক',
          items: [...cart],
          subtotal: subtotalCart,
          discount: Number(discount) || 0,
          totalAmount: finalPayable,
          paidAmount: paid,
          dueAmount: due,
          cashTendered: tenderedNum,
          changeReturned: changeToReturn,
          paymentMethod,
          customerName: custObj ? custObj.name : 'নগদ কাস্টমার',
          customerPhone: custObj ? custObj.phone : '',
          orderType,
          tableNumber,
          imei: imeiInput,
          warranty: warrantyMonths,
          deliveryAddress,
          celebrationWish
        });

        setCart([]);
        setShowCheckoutModal(false);
        setCashTendered('');
        setDiscount('0');
        setSelectedCustomer('none');
        loadData();
      } else {
        alert('বিক্রি সম্পন্ন হতে সমস্যা হয়েছে!');
      }
    } catch (err) {
      alert('সার্ভার কানেকশন এরর!');
    }
    setSubmitting(false);
  };

  // Reset page to 1 if search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
                          (p.banglaName && p.banglaName.toLowerCase().includes(q)) ||
                          (p.name && p.name.toLowerCase().includes(q)) ||
                          (p.genericName && p.genericName.toLowerCase().includes(q)) ||
                          (p.brand && p.brand.toLowerCase().includes(q)) ||
                          (p.size && p.size.toLowerCase().includes(q)) ||
                          (p.color && p.color.toLowerCase().includes(q)) ||
                          (p.barcode && p.barcode.includes(q));
    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;

    if (selectedCategory === 'fast') {
      const fastItems = (CATEGORY_FAST_ITEMS[industryId] || CATEGORY_FAST_ITEMS['cat-grocery']).map(f => f.name.toLowerCase());
      return fastItems.some(fn => (p.banglaName || '').toLowerCase().includes(fn) || (p.name || '').toLowerCase().includes(fn));
    }

    const subcats = INDUSTRY_SUBCATS[industryId] || INDUSTRY_SUBCATS['cat-grocery'] || [];
    const matchedSub = subcats.find(s => s.id === selectedCategory);
    if (matchedSub) {
      const combined = `${p.banglaName || ''} ${p.name || ''} ${p.genericName || ''}`.toLowerCase();
      return matchedSub.keywords.some(kw => combined.includes(kw));
    }

    return p.categoryId === selectedCategory;
  });

  const totalPosProducts = filteredProducts.length;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-container" style={{ paddingBottom: '160px' }}>
      
      {/* 🎙️ ULTIMATE HANDS-FREE CONTINUOUS VOICE POS CALCULATOR BANNER */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          setShowVoiceCalculatorModal(true);
        }}
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '11px 14px',
          marginBottom: '12px',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.22)',
          transition: 'transform 0.15s ease'
        }}
        className="clickable-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#059669',
              display: 'grid',
              placeItems: 'center',
              fontSize: '16px',
              flexShrink: 0,
              boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.2)'
            }}>
              🎙️
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
              <strong style={{ fontSize: 'clamp(13px, 3.8vw, 15px)', color: '#ffffff', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
                ভয়েস মেমো ও বিলিং
              </strong>
              <span style={{ fontSize: '9.5px', background: '#fef08a', color: '#854d0e', padding: '1px 6px', borderRadius: '99px', fontWeight: '900', letterSpacing: '0.2px', flexShrink: 0 }}>
                AI Live
              </span>
            </div>
          </div>

          <span
            style={{
              background: '#ffffff',
              color: '#047857',
              padding: '5px 11px',
              borderRadius: '8px',
              fontWeight: '900',
              fontSize: '11.5px',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            শুরু করুন ➔
          </span>
        </div>

        <div style={{ fontSize: '11.5px', color: '#a7f3d0', paddingLeft: '40px', lineHeight: 1.35 }}>
          মুখে বলুন: <em>&quot;চাল ১ কেজি ৬০, ডাল ১ কেজি ২০০, তেল ১৯০&quot;</em>
        </div>
      </div>

      {/* 🔍 1. TOP SEARCH, BARCODE SCAN & VOICE BAR */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="🔍 পণ্য বা বারকোড খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 80px 12px 14px',
              borderRadius: '14px',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              background: 'transparent',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              type="button"
              onClick={openCameraScanner}
              style={{
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '8px',
                padding: '5px 8px',
                color: '#4f46e5',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'grid',
                placeItems: 'center'
              }}
              title="ক্যামেরা দিয়ে বারকোড স্ক্যান করুন"
            >
              📷
            </button>
            <button
              type="button"
              onClick={startVoiceInput}
              style={{
                background: isListening ? '#fee2e2' : '#f1f5f9',
                border: isListening ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '5px 8px',
                color: isListening ? '#dc2626' : '#475569',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'grid',
                placeItems: 'center'
              }}
              title="মুখে বলে পণ্য খুঁজুন"
            >
              🎙️
            </button>
          </div>
        </div>

        {/* Quick Add Custom Product Button */}
        <button
          onClick={() => { setShowQuickAddModal(true); triggerHaptic('light'); }}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '12px 14px',
            borderRadius: '14px',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)',
            flexShrink: 0
          }}
          title="নতুন পণ্য মেমো ও স্টকে সরাসরি যুক্ত করুন"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="desktop-only" style={{ color: '#ffffff' }}>নতুন পণ্য</span>
        </button>
      </div>

      {/* 🏷️ 2. MODERN HORIZONTAL CATEGORY & QUICK ACTION PILLS */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          alignItems: 'center',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* All Products Pill */}
        <button
          type="button"
          onClick={() => { setSelectedCategory('all'); triggerHaptic('light'); }}
          style={{
            background: selectedCategory === 'all' ? '#4f46e5' : '#ffffff',
            color: selectedCategory === 'all' ? '#ffffff' : '#475569',
            border: selectedCategory === 'all' ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
            padding: '7px 14px',
            borderRadius: '20px',
            fontSize: '12.5px',
            fontWeight: '800',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: selectedCategory === 'all' ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <span>🏷️ সব</span>
          <span style={{
            fontSize: '11px',
            background: selectedCategory === 'all' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
            padding: '1px 6px',
            borderRadius: '10px'
          }}>
            {products.length}
          </span>
        </button>

        {/* Popular / Fast Selling Pill */}
        <button
          type="button"
          onClick={() => { setSelectedCategory(selectedCategory === 'fast' ? 'all' : 'fast'); triggerHaptic('light'); }}
          style={{
            background: selectedCategory === 'fast' ? '#4f46e5' : '#ffffff',
            color: selectedCategory === 'fast' ? '#ffffff' : '#475569',
            border: selectedCategory === 'fast' ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
            padding: '7px 14px',
            borderRadius: '20px',
            fontSize: '12.5px',
            fontWeight: '800',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: selectedCategory === 'fast' ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <span>⚡ জনপ্রিয়</span>
        </button>

        {/* Taka to Gram Converter (Grocery/Raw Market) */}
        {(industryId === 'cat-grocery' || industryId === 'cat-raw-market') && (
          <button
            type="button"
            onClick={() => {
              const groceryItem = products.find(p => p.unit === 'কেজি') || products[0];
              setGramTargetProduct(groceryItem);
              setShowGramModal(true);
              triggerHaptic('light');
            }}
            style={{
              background: '#ffffff',
              color: '#475569',
              border: '1.5px solid #e2e8f0',
              padding: '7px 14px',
              borderRadius: '20px',
              fontSize: '12.5px',
              fontWeight: '800',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>⚖️ গ্রাম মাপুন</span>
          </button>
        )}

        {/* Dynamic Industry Category Chips */}
        {(INDUSTRY_SUBCATS[industryId] || INDUSTRY_SUBCATS['cat-grocery'] || []).map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id); triggerHaptic('light'); }}
            style={{
              background: selectedCategory === cat.id ? '#4f46e5' : '#ffffff',
              color: selectedCategory === cat.id ? '#ffffff' : '#475569',
              border: selectedCategory === cat.id ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
              padding: '7px 14px',
              borderRadius: '20px',
              fontSize: '12.5px',
              fontWeight: '800',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: selectedCategory === cat.id ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}

        {/* Hold Active Cart Button (if items in cart) */}
        {cart.length > 0 && (
          <button
            type="button"
            onClick={handleHoldCart}
            style={{
              background: '#fff7ed',
              border: '1.5px solid #fed7aa',
              borderRadius: '20px',
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: '800',
              color: '#c2410c',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span>⏸️ হোল্ড ({cart.length})</span>
          </button>
        )}
      </div>

      {/* 🫖 RUNNING TABS / চলতি আড্ডা খাতা (দোকানে বসা কাস্টমার বিল - শুধুমাত্র রেস্টুরেন্ট/ক্যাফে/চা এর জন্য) */}
      {(industryId === 'cat-restaurant' || industryId === 'cat-tea' || tenant?.features?.enableKitchenKOT || tenant?.features?.enableRunningTabs) && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '18px',
          padding: '14px 16px',
          marginBottom: '14px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px' }}>🫖</span>
              <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>চলতি আড্ডা খাতা / রানিং বিল</strong>
              <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '99px', fontWeight: '800' }}>
                {runningTabs.length}টি খোলা ট্যাব
              </span>
            </div>

            <button
              type="button"
              onClick={() => { setShowNewTabModal(true); triggerHaptic('light'); }}
              style={{
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>➕</span> নতুন আড্ডা/কাস্টমার ট্যাব
            </button>
          </div>

          {/* Horizontal Scroll of Active Running Tabs */}
          {runningTabs.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0' }}>
              দোকানে বসে খাওয়া কাস্টমারদের জন্য <strong>"নতুন আড্ডা/কাস্টমার ট্যাব"</strong> বাটনে চাপ দিয়ে নাম লিখুন।
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {runningTabs.map(tab => (
                <div
                  key={tab.id}
                  onClick={() => { setShowSettleModal(tab); triggerHaptic('light'); }}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    minWidth: '150px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    flexShrink: 0
                  }}
                  className="clickable-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{tab.customerName}</strong>
                    <span style={{ fontSize: '10px', background: '#e2e8f0', padding: '1px 5px', borderRadius: '4px' }}>
                      {tab.items?.length || 0} আইটেম
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>
                      ৳{tab.totalAmount}
                    </span>
                    <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '700' }}>
                      বিল ক্লোজ ➔
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 💊 PHARMACY SPECIALIZED RX & DISPENSING BAR */}
      {industryId === 'cat-pharmacy' && (
        <div className="desktop-only" style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '1.5px solid #a7f3d0',
          borderRadius: '18px',
          padding: '12px 18px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>💊</span>
            <div>
              <strong style={{ fontSize: '14px', color: '#065f46' }}>ফার্মেসি ও ড্রাগ কাউন্টার (OTC & প্রেসক্রিপশন)</strong>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#047857' }}>
                পাতা বা পিসে ঔষধ বিক্রি করুন • মেয়াদোত্তীর্ণ তারিখ ও জেনেরিক নাম স্বয়ংক্রিয় ট্র্যাকিং
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/expiry-tracker" style={{
              background: '#ffffff',
              border: '1.5px solid #10b981',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '800',
              color: '#047857',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <span>⏳</span> এক্সপায়ারি ট্র্যাকার
            </Link>
          </div>
        </div>
      )}

      {/* 👗 CLOTHING & FASHION SPECIALIZED BAR */}
      {industryId === 'cat-clothing' && (
        <div className="desktop-only" style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          border: '1.5px solid #ddd6fe',
          borderRadius: '18px',
          padding: '12px 18px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>👗</span>
            <div>
              <strong style={{ fontSize: '14px', color: '#5b21b6' }}>গার্মেন্টস ও ফ্যাশন সেলস কাউন্টার</strong>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#6d28d9' }}>
                সাইজ (S/M/L/XL), কালার ও ফেব্রিক ভ্যারিয়েন্ট অনুযায়ী ট্র্যাকিং
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 👞 SHOES & FOOTWEAR SPECIALIZED BAR */}
      {industryId === 'cat-shoes' && (
        <div className="desktop-only" style={{
          background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
          border: '1.5px solid #e9d5ff',
          borderRadius: '18px',
          padding: '12px 18px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>👞</span>
            <div>
              <strong style={{ fontSize: '14px', color: '#7e22ce' }}>জুতা ও ফুটওয়্যার সেলস কাউন্টার</strong>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#9333ea' }}>
                জুতার সাইজ (EU ৩৮-৪৪) ও জোড়া হিসাব • মেমোসহ ৭ দিনের পরিবর্তন সুবিধা
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['38', '39', '40', '41', '42', '43', '44'].map(sz => (
              <button
                key={sz}
                type="button"
                onClick={() => { setSearch(sz); triggerHaptic('light'); }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #d8b4fe',
                  background: '#fff',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#7e22ce',
                  cursor: 'pointer'
                }}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 📱 MOBILE & GADGET SPECIALIZED BAR */}
      {industryId === 'cat-mobile' && (
        <div className="desktop-only" style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1.5px solid #bae6fd',
          borderRadius: '18px',
          padding: '12px 18px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>📱</span>
            <div>
              <strong style={{ fontSize: '14px', color: '#0369a1' }}>মোবাইল ও গ্যাজেট কাউন্টার</strong>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#0284c7' }}>
                IMEI নম্বর ট্র্যাকিং ও অফিশিয়াল ওয়ারেন্টি কার্ড স্বয়ংক্রিয়ভাবে মেমোতে যুক্ত হবে
              </p>
            </div>
          </div>
          <span style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800' }}>
            🛡️ ওয়ারেন্টি সক্রিয়
          </span>
        </div>
      )}

      {/* 🍽️ RESTAURANT & TEA SPECIALIZED TABLE BAR */}
      {(industryId === 'cat-restaurant' || industryId === 'cat-tea') && (
        <div className="desktop-only" style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          border: '1.5px solid #fed7aa',
          borderRadius: '18px',
          padding: '12px 18px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🍽️</span>
            <div>
              <strong style={{ fontSize: '14px', color: '#c2410c' }}>টেবিল ও খাবার অর্ডার কাউন্টার</strong>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#ea580c' }}>
                ডাইন-ইন টেবিল নির্বাচন করুন অথবা সরাসরি পার্সেল মেমো তৈরি করুন
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setOrderType('takeaway'); triggerHaptic('light'); }}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                border: orderType === 'takeaway' ? '2px solid #ea580c' : '1px solid #fed7aa',
                background: orderType === 'takeaway' ? '#ea580c' : '#fff',
                color: orderType === 'takeaway' ? '#fff' : '#c2410c',
                fontSize: '11.5px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              🛍️ পার্সেল
            </button>
            {['১', '২', '৩', '৪', '৫'].map(tbl => (
              <button
                key={tbl}
                type="button"
                onClick={() => { setOrderType('dine-in'); setTableNumber(tbl); triggerHaptic('light'); }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: (orderType === 'dine-in' && tableNumber === tbl) ? '2px solid #ea580c' : '1px solid #fed7aa',
                  background: (orderType === 'dine-in' && tableNumber === tbl) ? '#ea580c' : '#fff',
                  color: (orderType === 'dine-in' && tableNumber === tbl) ? '#fff' : '#c2410c',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                টেবিল #{tbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🛒 GROCERY FRACTIONAL WEIGHT SELECTOR BAR */}
      {industryId === 'cat-grocery' && (
        <div className="desktop-only" style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1.5px solid #bbf7d0',
          borderRadius: '18px',
          padding: '10px 16px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#166534' }}>
            ⚖️ ওজনের দ্রুত মাপ:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: '১ পোয়া (২৫০ গ্রাম)', val: 0.25 },
              { label: 'হাফ কেজি (৫০০ গ্রাম)', val: 0.5 },
              { label: '১ কেজি', val: 1 },
              { label: '২ কেজি', val: 2 },
              { label: '৫ কেজি', val: 5 }
            ].map(w => (
              <span
                key={w.label}
                style={{
                  background: '#fff',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#15803d'
                }}
              >
                {w.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ⏸️ HELD CARTS (হোল্ডে রাখা কাস্টমার কার্ট) */}
      {heldCarts.length > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: '16px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ⏸️ হোল্ডে থাকা কার্ট ({heldCarts.length}টি):
          </span>
          {heldCarts.map(h => (
            <button
              key={h.id}
              type="button"
              onClick={() => handleResumeCart(h)}
              style={{
                background: '#ffffff',
                border: '1px solid #f59e0b',
                padding: '6px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '800',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <span>▶️</span>
              <span>{h.customerName} (৳{h.totalAmount})</span>
              <span style={{ fontSize: '10px', color: '#78350f' }}>{h.time}</span>
            </button>
          ))}
        </div>
      )}

      {industryId === 'cat-restaurant' && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '1.5px solid #fcd34d',
          borderRadius: '16px',
          padding: '10px 16px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🍲</span>
            <strong style={{ fontSize: '13px', color: '#92400e' }}>অর্ডার ধরণ:</strong>
            <button
              type="button"
              onClick={() => { setOrderType('dine-in'); triggerHaptic('light'); }}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: 'none',
                background: orderType === 'dine-in' ? '#d97706' : '#fff',
                color: orderType === 'dine-in' ? '#fff' : '#92400e',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🍽️ ডাইন-ইন
            </button>
            <button
              type="button"
              onClick={() => { setOrderType('takeaway'); triggerHaptic('light'); }}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: 'none',
                background: orderType === 'takeaway' ? '#d97706' : '#fff',
                color: orderType === 'takeaway' ? '#fff' : '#92400e',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🛍️ পার্সেল
            </button>
          </div>

          {orderType === 'dine-in' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '800' }}>টেবিল:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['১', '২', '৩', '৪', '৫', '৬'].map(tNum => (
                  <button
                    key={tNum}
                    type="button"
                    onClick={() => { setTableNumber(tNum); triggerHaptic('light'); }}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      border: 'none',
                      background: tableNumber === tNum ? '#b45309' : '#fff',
                      color: tableNumber === tNum ? '#fff' : '#78350f',
                      fontWeight: '900',
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    {tNum}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {voiceNotice && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '10px 14px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📢</span>
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {showCameraScanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)',
          zIndex: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#0f172a', borderRadius: '24px', padding: '20px', width: '100%', maxWidth: '380px', color: '#fff', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📷</span>
                <strong style={{ fontSize: '16px' }}>ক্যামেরা বারকোড স্ক্যানার</strong>
              </div>
              <button onClick={closeCameraScanner} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '0 0 14px' }}>
              পণ্যের গায়ের বারকোড ক্যামেরার সামনে ধরুন:
            </p>

            {/* Video Viewfinder Container */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '240px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#000',
              border: '2px solid #3b82f6',
              marginBottom: '14px'
            }}>
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                playsInline
                muted
              />

              {/* Animated Laser Scan Line */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '10%',
                right: '10%',
                height: '2px',
                background: '#ef4444',
                boxShadow: '0 0 10px #ef4444, 0 0 20px #ef4444',
                animation: 'soft-pulse 1.5s infinite ease-in-out'
              }} />
            </div>

            {cameraError && (
              <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '10px' }}>
                {cameraError}
              </div>
            )}

            {/* Quick Demo Barcode Buttons */}
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px', borderRadius: '12px', textAlign: 'left' }}>
              <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                ⚡ দ্রুত টেস্ট করতে বারকোডে চাপুন:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {products.slice(0, 4).map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      handleBarcodeDetected(p.barcode);
                      closeCameraScanner();
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.25)',
                      border: '1px solid #3b82f6',
                      color: '#93c5fd',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {p.banglaName?.slice(0, 10)}... (#{p.barcode})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {paginatedProducts.map(p => {
          const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
          const isExpiringSoon = p.expiryDate && !isExpired && (new Date(p.expiryDate).getTime() - new Date().getTime()) < 30 * 24 * 60 * 60 * 1000;

          return (
            <div
              key={p.id}
              onClick={() => addToCart(p)}
              className="mobile-card clickable-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '18px',
                border: isExpired ? '1.5px solid #fca5a5' : '1.5px solid #f1f5f9',
                background: '#ffffff',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '20px'
                  }}>
                    {p.icon || '📦'}
                  </div>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: p.stock <= 5 ? '#fee2e2' : '#f8fafc',
                    color: p.stock <= 5 ? '#dc2626' : '#64748b',
                    border: `1px solid ${p.stock <= 5 ? '#fca5a5' : '#e2e8f0'}`
                  }}>
                    স্টক: {p.stock} {p.unit}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 2px', fontSize: '13.5px', fontWeight: '800', color: '#0f172a', lineHeight: 1.25 }}>
                  {p.banglaName || p.name}
                </h4>
                <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block' }}>
                  #{p.barcode}
                </span>
                {p.genericName && (
                  <span style={{ fontSize: '10.5px', color: '#4f46e5', fontWeight: '700', display: 'block', marginTop: '2px' }}>
                    🧪 {p.genericName}
                  </span>
                )}
                {p.size && (
                  <span style={{ fontSize: '10.5px', color: '#7c3aed', fontWeight: '700', display: 'block', marginTop: '2px' }}>
                    🏷️ সাইজ: {p.size} {p.color ? `• ${p.color}` : ''}
                  </span>
                )}
                {isExpired ? (
                  <span style={{ fontSize: '9.5px', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px', fontWeight: '800', display: 'inline-block', marginTop: '2px' }}>
                    🔴 মেয়াদোত্তীর্ণ ({p.expiryDate})
                  </span>
                ) : isExpiringSoon ? (
                  <span style={{ fontSize: '9.5px', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: '800', display: 'inline-block', marginTop: '2px' }}>
                    ⚠️ মেয়াদ শীঘ্রই শেষ ({p.expiryDate})
                  </span>
                ) : p.expiryDate ? (
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    ⏳ মেয়াদ: {p.expiryDate}
                  </span>
                ) : null}
              </div>

              <div>
                {/* Industry-tailored Quick Sub-unit Chips on Product Card */}
                {p.unit === 'পাতা' ? (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => addToCart(p, 0.1)}
                      style={{
                        flex: 1,
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        padding: '2px 4px',
                        fontSize: '10px',
                        fontWeight: '800',
                        color: '#065f46',
                        cursor: 'pointer'
                      }}
                      title="১টি ট্যাবলেট বিক্রি করুন"
                    >
                      💊 ১ পিস
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(p, 1)}
                      style={{
                        flex: 1,
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '6px',
                        padding: '2px 4px',
                        fontSize: '10px',
                        fontWeight: '800',
                        color: '#15803d',
                        cursor: 'pointer'
                      }}
                      title="১ পুরো পাতা বিক্রি করুন"
                    >
                      ১ পাতা
                    </button>
                  </div>
                ) : (p.unit === 'কেজি' || p.unit === 'লিটার') ? (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => addToCart(p, 0.25)}
                      style={{
                        flex: 1,
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '2px 4px',
                        fontSize: '10px',
                        fontWeight: '800',
                        color: '#166534',
                        cursor: 'pointer'
                      }}
                      title="২৫০ গ্রাম (১ পোয়া)"
                    >
                      ১ পোয়া
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart(p, 0.5)}
                      style={{
                        flex: 1,
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '2px 4px',
                        fontSize: '10px',
                        fontWeight: '800',
                        color: '#166534',
                        cursor: 'pointer'
                      }}
                      title="৫০০ গ্রাম (হাফ কেজি)"
                    >
                      হাফ কেজি
                    </button>
                  </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #f1f5f9' }}>
                  <div>
                    <span className="num-font" style={{ fontSize: '17px', fontWeight: '900', color: '#059669' }}>
                      ৳{p.sellingPrice}
                    </span>
                    {activeRoleMode === 'owner' && p.purchasePrice && (
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>
                        কেনা: ৳{p.purchasePrice}
                      </span>
                    )}
                  </div>
                  <span style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: '900',
                    fontSize: '15px'
                  }}>
                    +
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* POS Products Pagination */}
      {totalPosProducts > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalPosProducts}
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
          pageSizeOptions={[12, 24, 48, 96]}
          itemLabel="পণ্য"
          themeColor={getIndustryTheme(tenant?.industryId).primaryColor}
        />
      )}

      {/* Cart Drawer Modal */}
      {showCartDrawer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{ background: '#fff', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                🛒 নির্বাচিত পণ্যের তালিকা ({cart.length} প্রকার)
              </h3>
              <button onClick={() => setShowCartDrawer(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {cart.map(item => (
                <div key={item.product.id} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '14px', color: '#1e293b', display: 'block' }}>{item.product.banglaName}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>দর: ৳</span>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateCartUnitPrice(item.product.id, Number(e.target.value) || 0)}
                          className="num-font"
                          style={{ width: '65px', padding: '2px 6px', borderRadius: '6px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '800', outline: 'none', background: '#fff' }}
                          title="বিক্রির সময় সরাসরি দর পরিবর্তন করুন"
                        />
                        <span style={{ fontSize: '11px', color: '#64748b' }}>× {item.quantity} {item.product.unit}</span>
                        <button
                          type="button"
                          onClick={() => savePriceToCatalog(item.product, item.unitPrice)}
                          style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '2px 6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                          title="এই নতুন দর সবসময়ের জন্য সেভ করুন"
                        >
                          💾 সেভ দর
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button onClick={() => updateQty(item.product.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '800', cursor: 'pointer' }}>-</button>
                      <input
                        type="number"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => setDirectQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                        className="num-font"
                        style={{ width: '58px', padding: '4px 2px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', fontWeight: '800', fontSize: '14px', outline: 'none', background: '#fff' }}
                        title="সরাসরি পরিমাণ বা ওজন লিখুন (যেমন: 0.5, 0.25, 2)"
                      />
                      <button onClick={() => updateQty(item.product.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '800', cursor: 'pointer' }}>+</button>
                      <button onClick={() => removeFromCart(item.product.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', marginLeft: '2px' }}>🗑️</button>
                    </div>

                    <div className="num-font" style={{ fontWeight: '900', fontSize: '15px', color: '#0f172a', minWidth: '60px', textAlign: 'right' }}>
                      ৳{item.totalPrice}
                    </div>
                  </div>

                  {/* Quick Quantity / Weight Chips */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                    {item.product.unit === 'হালি' ? (
                      <>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.25)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.25 ? '#10b981' : '#fff', color: item.quantity === 0.25 ? '#fff' : '#475569' }}>১টা (০.২৫ হালি)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.5)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.5 ? '#10b981' : '#fff', color: item.quantity === 0.5 ? '#fff' : '#475569' }}>২টা (আধা হালি)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.75)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.75 ? '#10b981' : '#fff', color: item.quantity === 0.75 ? '#fff' : '#475569' }}>৩টা (০.৭৫ হালি)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 1)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 1 ? '#10b981' : '#fff', color: item.quantity === 1 ? '#fff' : '#475569' }}>১ হালি (৪টা)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 2)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 2 ? '#10b981' : '#fff', color: item.quantity === 2 ? '#fff' : '#475569' }}>২ হালি (৮টা)</button>
                      </>
                    ) : (item.product.unit === 'কেজি' || item.product.unit === 'লিটার') ? (
                      <>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.1)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.1 ? '#10b981' : '#fff', color: item.quantity === 0.1 ? '#fff' : '#475569' }}>১০০ গ্রাম</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.25)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.25 ? '#10b981' : '#fff', color: item.quantity === 0.25 ? '#fff' : '#475569' }}>১ পোয়া (২৫০ গ্রাম)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.5)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.5 ? '#10b981' : '#fff', color: item.quantity === 0.5 ? '#fff' : '#475569' }}>আধা {item.product.unit} (৫০০ গ্রাম)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.75)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.75 ? '#10b981' : '#fff', color: item.quantity === 0.75 ? '#fff' : '#475569' }}>৭৫০ গ্রাম</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 1)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 1 ? '#10b981' : '#fff', color: item.quantity === 1 ? '#fff' : '#475569' }}>১ {item.product.unit}</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 2)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 2 ? '#10b981' : '#fff', color: item.quantity === 2 ? '#fff' : '#475569' }}>২ {item.product.unit}</button>
                      </>
                    ) : item.product.unit === 'পাতা' ? (
                      <>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.1)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.1 ? '#10b981' : '#fff', color: item.quantity === 0.1 ? '#fff' : '#475569' }}>১টা ট্যাবলেট (০.১ পাতা)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.2)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.2 ? '#10b981' : '#fff', color: item.quantity === 0.2 ? '#fff' : '#475569' }}>২টা ট্যাবলেট (০.২ পাতা)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.3)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.3 ? '#10b981' : '#fff', color: item.quantity === 0.3 ? '#fff' : '#475569' }}>৩টা ট্যাবলেট (০.৩ পাতা)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 0.5)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 0.5 ? '#10b981' : '#fff', color: item.quantity === 0.5 ? '#fff' : '#475569' }}>৫টা ট্যাবলেট (০.৫ পাতা)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 1)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 1 ? '#10b981' : '#fff', color: item.quantity === 1 ? '#fff' : '#475569' }}>১ পাতা (১০টি)</button>
                        <button type="button" onClick={() => setDirectQuantity(item.product.id, 2)} style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer', background: item.quantity === 2 ? '#10b981' : '#fff', color: item.quantity === 2 ? '#fff' : '#475569' }}>২ পাতা (২০টি)</button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handlePromptTakaAmount(item)}
                      style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer' }}
                      title="যেমন: ৩০ টাকার ডাল বা ৫০ টাকার তেল"
                    >
                      💰 টাকায় পরিমাণ
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setShowCartDrawer(false); setShowCheckoutModal(true); triggerHaptic('medium'); }}
              style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}
            >
              বিল ও পেমেন্টে যান (৳{subtotalCart}) ➔
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal with Cash Tendered & Change Return Calculator */}
      {showCheckoutModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>বিল ও পেমেন্ট হিসাব</h3>
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* 🛍️ নির্বাচিত পণ্যের তালিকা ও পরিমাণ পরিবর্তন (Itemized Bill & Live Qty Editor) */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              padding: '12px 14px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🛍️</span> পণ্যের তালিকা ও পরিমাণ ({cart.length}টি)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  কমে বা বাড়লে এখান থেকেই বদলান
                </span>
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '14px', color: '#ef4444', fontSize: '13px', fontWeight: '700' }}>
                  ⚠️ ব্যাগে কোনো পণ্য নেই! দয়া করে পণ্য যোগ করুন।
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '8px', maxHeight: '185px', overflowY: 'auto', paddingRight: '2px' }}>
                  {cart.map((it) => {
                    const unitP = it.unitPrice !== undefined ? it.unitPrice : it.product.sellingPrice;
                    const isKgOrLit = it.product.unit === 'কেজি' || it.product.unit === 'লিটার' || it.product.unit === 'মিটার' || it.product.unit === 'ফুট';
                    const qtyStep = isKgOrLit ? 0.25 : 1;

                    return (
                      <div
                        key={it.product.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Item Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {it.product.banglaName || it.product.name}
                          </strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {/* Pharmacy Generic Name */}
                            {it.product.genericName && (
                              <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                {it.product.genericName}
                              </span>
                            )}
                            {/* Clothing Size */}
                            {it.product.size && (
                              <span style={{ fontSize: '10px', background: '#f5f3ff', color: '#7c3aed', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                সাইজ: {it.product.size}
                              </span>
                            )}
                            {/* Clothing Color */}
                            {it.product.color && (
                              <span style={{ fontSize: '10px', background: '#f5f3ff', color: '#7c3aed', padding: '1px 5px', borderRadius: '4px' }}>
                                {it.product.color}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              দর: ৳{unitP}/{it.product.unit || 'পিস'}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Controls (- / input / +) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <button
                            type="button"
                            onClick={() => updateQty(it.product.id, -qtyStep)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              color: '#0f172a',
                              fontWeight: '900',
                              fontSize: '15px',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center'
                            }}
                            title="পরিমাণ কমান"
                          >
                            −
                          </button>

                          <div style={{ position: 'relative', width: '56px' }}>
                            <input
                              type="number"
                              step={isKgOrLit ? "0.1" : "1"}
                              min="0.01"
                              value={it.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  setDirectQuantity(it.product.id, val);
                                }
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'center',
                                padding: '4px 2px',
                                borderRadius: '8px',
                                border: '1.5px solid #cbd5e1',
                                fontSize: '13px',
                                fontWeight: '800',
                                color: '#0f172a',
                                outline: 'none',
                                background: '#fff',
                                boxSizing: 'border-box'
                              }}
                              className="num-font"
                              title="সরাসরি পরিমাণ লিখুন"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => updateQty(it.product.id, qtyStep)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              color: '#0f172a',
                              fontWeight: '900',
                              fontSize: '15px',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center'
                            }}
                            title="পরিমাণ বাড়ান"
                          >
                            +
                          </button>

                          {/* Delete Item */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(it.product.id)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#fee2e2',
                              color: '#dc2626',
                              fontWeight: '800',
                              fontSize: '12px',
                              cursor: 'pointer',
                              marginLeft: '2px',
                              display: 'grid',
                              placeItems: 'center'
                            }}
                            title="আইটেমটি বাদ দিন"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Item Total Price */}
                        <div style={{ textAlign: 'right', minWidth: '60px' }}>
                          <strong className="num-font" style={{ fontSize: '13.5px', color: '#059669', display: 'block' }}>
                            ৳{it.totalPrice}
                          </strong>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            {it.quantity} {it.product.unit || 'পিস'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Select (for Due Khata) */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                গ্রাহক নির্বাচন (বাকি বিক্রির জন্য আবশ্যক):
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#fff' }}
              >
                <option value="none">সাধারণ নগদ ক্রেতা (নামহীন)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} • {c.phone} (পূর্বের বাকি: ৳{c.totalDue || 0})</option>
                ))}
              </select>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                পেমেন্ট মাধ্যম:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { id: 'cash', label: 'নগদ', icon: '💵' },
                  { id: 'bkash', label: 'বিকাশ', icon: '📱' },
                  { id: 'nagad', label: 'নগদ', icon: '📲' },
                  { id: 'due', label: 'বাকি', icon: '📖' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setPaymentMethod(m.id as any); triggerHaptic('light'); }}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: paymentMethod === m.id ? '2px solid #10b981' : '1px solid #cbd5e1',
                      background: paymentMethod === m.id ? '#ecfdf5' : '#fff',
                      color: paymentMethod === m.id ? '#065f46' : '#475569',
                      fontWeight: '800',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Total Bill Box with Subtotal and Discount Breakdown */}
            <div style={{
              background: '#f8fafc',
              padding: '12px 14px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12.5px', color: '#64748b' }}>
                <span>পণ্যের সাবটোটাল ({cart.length}টি আইটেম):</span>
                <strong className="num-font" style={{ color: '#0f172a' }}>৳{subtotalCart.toLocaleString('en-US')}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>ছাড় / ডিসকাউন্ট (৳):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#dc2626', fontWeight: '800' }}>-৳</span>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="০"
                    className="num-font"
                    style={{
                      width: '64px',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: '800',
                      textAlign: 'right',
                      outline: 'none',
                      background: '#fff'
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '1.5px solid #cbd5e1'
              }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'block' }}>সর্বমোট প্রদেয় বিল</span>
                  {Number(discount) > 0 && (
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>ছাড় সমন্বয়কৃত</span>
                  )}
                </div>
                <div className="num-font" style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>
                  ৳{finalPayable.toLocaleString('en-US')}
                </div>
              </div>
            </div>

            {/* Dynamic bKash / Nagad QR Code Payment Box */}
            {(paymentMethod === 'bkash' || paymentMethod === 'nagad') && (
              <div style={{
                background: paymentMethod === 'bkash' ? '#fdf2f8' : '#fff7ed',
                border: `1.5px solid ${paymentMethod === 'bkash' ? '#fbcfe8' : '#fed7aa'}`,
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{paymentMethod === 'bkash' ? '📱' : '📲'}</span>
                  <strong style={{ fontSize: '14px', color: paymentMethod === 'bkash' ? '#be185d' : '#c2410c' }}>
                    {paymentMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} কিউআর কোড স্ক্যান করে পেমেন্ট করুন
                  </strong>
                </div>

                <div style={{ display: 'inline-block', background: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '8px' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      `${paymentMethod.toUpperCase()}:PAY?to=${tenant?.phone || '01986233234'}&amount=${finalPayable}&ref=${tenant?.shopName || 'Dokan'}`
                    )}`}
                    alt="Payment QR"
                    style={{ width: '130px', height: '130px', display: 'block' }}
                  />
                </div>

                <div style={{ fontSize: '12.5px', color: '#475569' }}>
                  দোকানের {paymentMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} নম্বর: <strong className="num-font" style={{ color: '#0f172a' }}>{tenant?.phone || '01986233234'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                  মোট প্রদেয় টাকা: <strong className="num-font">৳{finalPayable}</strong>
                </div>
              </div>
            )}

            {/* Industry Specific Checkout Fields */}
            {industryId === 'cat-mobile' && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '14px', marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e40af', marginBottom: '4px' }}>
                  📱 মোবাইল IMEI / সিরিয়াল নম্বর:
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 864932049234901"
                  value={imeiInput}
                  onChange={(e) => setImeiInput(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', background: '#fff' }}
                />
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e40af', marginBottom: '4px' }}>
                  🛡️ অফিসিয়াল ওয়ারেন্টি মেয়াদ:
                </label>
                <select
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                >
                  <option value="৩ মাস সার্ভিস ওয়ারেন্টি">৩ মাস সার্ভিস ওয়ারেন্টি</option>
                  <option value="৬ মাস অফিসিয়াল ওয়ারেন্টি">৬ মাস অফিসিয়াল ওয়ারেন্টি</option>
                  <option value="১২ মাস (১ বছর) অফিসিয়াল ওয়ারেন্টি">১২ মাস (১ বছর) অফিসিয়াল ওয়ারেন্টি</option>
                  <option value="২ বছর পার্টস ও সার্ভিস ওয়ারেন্টি">২ বছর পার্টস ও সার্ভিস ওয়ারেন্টি</option>
                </select>
              </div>
            )}

            {industryId === 'cat-furniture' && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '14px', marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  🚚 ফার্নিচার ডেলিভারি ঠিকানা ও নোট:
                </label>
                <input
                  type="text"
                  placeholder="যেমন: বাসা #৪, রোড #২, উত্তরা (আগামী শুক্রবার ডেলিভারি)"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                />
              </div>
            )}

            {industryId === 'cat-bakery' && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '12px', borderRadius: '14px', marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#9a3412', marginBottom: '4px' }}>
                  🎂 কেকের শুভেচ্ছা বার্তা:
                </label>
                <input
                  type="text"
                  placeholder="যেমন: শুভ জন্মদিন আরিয়ান!"
                  value={celebrationWish}
                  onChange={(e) => setCelebrationWish(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                />
              </div>
            )}

            {/* Quick Cash Tender Notes Picker & Change Calculator (When Cash Selected) */}
            {paymentMethod === 'cash' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '14px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#166534', display: 'block', marginBottom: '8px' }}>
                  💵 কাস্টমার কত টাকা দিল? (দ্রুত নোট চাপুন):
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                  {[50, 100, 200, 500, 1000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { setCashTendered(String(val)); triggerHaptic('light'); }}
                      style={{
                        padding: '8px 2px',
                        borderRadius: '10px',
                        border: '1px solid #86efac',
                        background: '#ffffff',
                        color: '#15803d',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      ৳{val}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder="হাতে প্রাপ্ত নগদ টাকা"
                    className="num-font"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #86efac',
                      fontSize: '16px',
                      fontWeight: '800',
                      outline: 'none',
                      background: '#fff'
                    }}
                  />
                  {cashTendered && (
                    <button
                      type="button"
                      onClick={() => { setCashTendered(''); triggerHaptic('light'); }}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      মুছুন
                    </button>
                  )}
                </div>

                {/* Return Change Display */}
                {tenderedNum >= finalPayable && finalPayable > 0 && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    background: '#15803d',
                    color: '#ffffff',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <strong style={{ fontSize: '13px' }}>গ্রাহককে ফেরত দিন:</strong>
                    <span className="num-font" style={{ fontSize: '20px', fontWeight: '900' }}>
                      ৳{changeToReturn.toLocaleString('en-US')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              style={{
                width: '100%',
                background: cart.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '14px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '15px',
                cursor: (submitting || cart.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: cart.length === 0 ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              {submitting ? 'বিল হচ্ছে...' : cart.length === 0 ? '⚠️ ব্যাগে পণ্য যোগ করুন' : '✓ বিক্রি সম্পন্ন ও ক্যাশ রসিদ'}
            </button>
          </div>
        </div>
      )}

      {/* 58mm / 80mm Thermal Receipt & A4 Invoice Modal */}
      {receipt && (
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
            maxWidth: printFormat === 'a4' ? '680px' : '380px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            maxHeight: '92vh',
            overflowY: 'auto',
            transition: 'max-width 0.25s ease'
          }}>
            {/* Printable Thermal Receipt Box */}
            {isKotPrint ? (
              <div className="printable-receipt" style={{
                background: '#fff',
                fontFamily: 'monospace, "Hind Siliguri", sans-serif',
                fontSize: '13px',
                lineHeight: 1.4,
                color: '#000',
                borderBottom: '2px dashed #000',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
                  <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '900' }}>🍳 কিচেন অর্ডার স্লিপ (KOT)</h3>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '800' }}>
                    {receipt.orderType === 'dine-in' ? `🍽️ টেবিল: #${receipt.tableNumber}` : '🛍️ পার্সেল (Takeaway)'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px', color: '#555' }}>
                    <span>টোকেন: #{receipt.invoiceNo}</span>
                    <span>{receipt.date}</span>
                  </div>
                </div>

                <div style={{ borderBottom: '2px dashed #000', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', marginBottom: '4px', fontSize: '13px' }}>
                    <span>মেনু আইটেম</span>
                    <span>পরিমাণ</span>
                  </div>
                  {receipt.items.map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', marginBottom: '4px' }}>
                      <span>{it.product.banglaName}</span>
                      <span className="num-font">× {it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700' }}>
                  [বাবুর্চির জন্য কিচেন কপি]
                </div>
              </div>
            ) : printFormat === 'a4' ? (
              /* A4 Professional Invoice Sheet */
              <div className="printable-a4" style={{
                background: '#fff',
                fontFamily: '"Hind Siliguri", sans-serif',
                fontSize: '13px',
                lineHeight: 1.5,
                color: '#0f172a',
                padding: '24px 20px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                {/* A4 Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0f172a', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div>
                    <h1 style={{ margin: '0 0 2px', fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>{receipt.shopName}</h1>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#334155' }}>📍 {receipt.location}</p>
                    <p style={{ margin: 0, fontSize: '12.5px', fontWeight: '700', color: '#334155' }}>📞 মোবাইল: {receipt.phone}</p>
                    {receipt.industrySubtitle && (
                      <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b', fontStyle: 'italic' }}>{receipt.industrySubtitle}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '4px 14px', borderRadius: '8px', display: 'inline-block', marginBottom: '4px' }}>
                      বিক্রয় চালান / INVOICE
                    </span>
                    <div style={{ fontSize: '12px', color: '#475569' }}>মেমো নং: <strong>#{receipt.invoiceNo}</strong></div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>তারিখ: {receipt.date}</div>
                  </div>
                </div>

                {/* Customer Details */}
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>ক্রেতার নাম ও বিবরণ:</span>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{receipt.customerName}</strong>
                    {receipt.customerPhone && <span style={{ fontSize: '12px', color: '#475569', marginLeft: '6px' }}>({receipt.customerPhone})</span>}
                  </div>
                  {receipt.deliveryAddress && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>ঠিকানা:</span>
                      <span style={{ fontSize: '12px', color: '#334155' }}>{receipt.deliveryAddress}</span>
                    </div>
                  )}
                </div>

                {/* A4 Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '40px' }}>ক্র.</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left' }}>পণ্যের বিবরণ</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>পরিমাণ</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '90px' }}>দর (৳)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px' }}>মোট টাকা (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((it: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: '700' }}>{it.product.banglaName || it.product.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{it.quantity} {it.product.unit || 'পিস'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }} className="num-font">৳{it.unitPrice || it.product.sellingPrice}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800' }} className="num-font">৳{it.totalPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Total Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '10px' }}>
                  <div style={{ maxWidth: '60%', fontSize: '12px', color: '#475569' }}>
                    <strong>শর্তাবলী:</strong><br />
                    {(receipt.terms && receipt.terms.length > 0 ? receipt.terms : [
                      '১. বিক্রিত পণ্য অক্ষত অবস্থায় মেমোসহ পরিবর্তনযোগ্য।',
                      '২. কোনো প্রকার কাটা-ছেঁড়া চালান গ্রহণযোগ্য নয়।'
                    ]).map((t: string, idx: number) => (
                      <span key={idx} style={{ display: 'block', lineHeight: 1.4 }}>{t}</span>
                    ))}
                  </div>

                  <div style={{ width: '220px', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>সাবটোটাল:</span>
                      <strong className="num-font">৳{receipt.subtotal || receipt.totalAmount}</strong>
                    </div>
                    {receipt.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: '4px' }}>
                        <span>ছাড়/ডিসকাউন্ট:</span>
                        <strong className="num-font">-৳{receipt.discount}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '900', borderTop: '1.5px solid #0f172a', paddingTop: '4px', marginBottom: '4px' }}>
                      <span>সর্বমোট বিল:</span>
                      <span className="num-font" style={{ color: '#059669' }}>৳{receipt.totalAmount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontSize: '12px' }}>
                      <span>পরিশোধিত ({receipt.paymentMethod.toUpperCase()}):</span>
                      <strong className="num-font">৳{receipt.paidAmount}</strong>
                    </div>
                    {receipt.dueAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontSize: '12px', fontWeight: '800' }}>
                        <span>বকেয়া বাকি:</span>
                        <strong className="num-font">৳{receipt.dueAmount}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '10px', fontSize: '11.5px', color: '#475569' }}>
                  <div style={{ borderTop: '1px dashed #94a3b8', width: '130px', textAlign: 'center', paddingTop: '4px' }}>
                    ক্রেতার স্বাক্ষর
                  </div>
                  <div style={{ borderTop: '1px dashed #94a3b8', width: '130px', textAlign: 'center', paddingTop: '4px' }}>
                    অনুমোদিত কর্তৃপক্ষের স্বাক্ষর
                  </div>
                </div>
              </div>
            ) : (
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
                  <h3 style={{ margin: '0 0 2px', fontSize: '19px', fontWeight: '900' }}>{receipt.shopName}</h3>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '800' }}>📍 {receipt.location}</p>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '800' }}>📞 {receipt.phone}</p>
                  {receipt.industrySubtitle && (
                    <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: '#475569' }}>{receipt.industrySubtitle}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px', color: '#475569' }}>
                    <span>মেমো: #{receipt.invoiceNo}</span>
                    <span>{receipt.date}</span>
                  </div>
                  <div style={{ textAlign: 'left', fontSize: '11.5px', marginTop: '4px', fontWeight: '700' }}>
                    ক্রেতা: {receipt.customerName}
                  </div>
                  {receipt.orderType && (
                    <div style={{ textAlign: 'left', fontSize: '11px', color: '#b45309', fontWeight: '800', marginTop: '2px' }}>
                      {receipt.orderType === 'dine-in' ? `🍽️ ডাইন-ইন (টেবিল #${receipt.tableNumber})` : '🛍️ পার্সেল (Takeaway)'}
                    </div>
                  )}
                  {receipt.imei && (
                    <div style={{ textAlign: 'left', fontSize: '11px', color: '#1e40af', fontWeight: '800', marginTop: '2px' }}>
                      📱 IMEI: {receipt.imei}
                    </div>
                  )}
                  {receipt.warranty && (
                    <div style={{ textAlign: 'left', fontSize: '11px', color: '#15803d', fontWeight: '800', marginTop: '2px' }}>
                      🛡️ ওয়ারেন্টি: {receipt.warranty}
                    </div>
                  )}
                  {receipt.deliveryAddress && (
                    <div style={{ textAlign: 'left', fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                      🚚 ঠিকানা: {receipt.deliveryAddress}
                    </div>
                  )}
                  {receipt.celebrationWish && (
                    <div style={{ textAlign: 'left', fontSize: '11px', color: '#c2410c', fontWeight: '800', marginTop: '2px' }}>
                      🎂 শুভেচ্ছা: "{receipt.celebrationWish}"
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', marginBottom: '4px', fontSize: '11px' }}>
                    <span>বিবরণ</span>
                    <span>পরিমাণ × দর = মোট</span>
                  </div>
                  {receipt.items.map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span>{it.product.banglaName}</span>
                      <span className="num-font">
                        {it.product.unit === 'হালি' ? `${Math.round(it.quantity * 4)}টা (${it.quantity} হালি)` : `${it.quantity} ${it.product.unit}`} × ৳{it.unitPrice || it.product.sellingPrice} = ৳{it.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '14px', marginBottom: '4px' }}>
                    <span>মোট বিল:</span>
                    <span className="num-font">৳{receipt.totalAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: '700' }}>
                    <span>নগদ গ্রহণ:</span>
                    <span className="num-font">৳{receipt.paidAmount} ({receipt.paymentMethod.toUpperCase()})</span>
                  </div>
                  {receipt.dueAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: '700' }}>
                      <span>বকেয়া বাকি:</span>
                      <span className="num-font">৳{receipt.dueAmount}</span>
                    </div>
                  )}
                  {receipt.changeReturned > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                      <span>ফেরত দেওয়া হয়েছে:</span>
                      <span className="num-font">৳{receipt.changeReturned}</span>
                    </div>
                  )}
                </div>

                {(receipt.paymentMethod === 'bkash' || receipt.paymentMethod === 'nagad') && (
                  <div style={{ textAlign: 'center', margin: '8px 0', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                        `${receipt.paymentMethod.toUpperCase()}:PAID?memo=${receipt.invoiceNo}&amount=${receipt.totalAmount}`
                      )}`}
                      alt="Receipt QR"
                      style={{ width: '80px', height: '80px', display: 'block', margin: '0 auto 4px' }}
                    />
                    <span style={{ fontSize: '10px', color: '#475569' }}>ডিজিটাল পেমেন্ট ভেরিফাইড ({receipt.paymentMethod.toUpperCase()})</span>
                  </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: '#64748b' }}>
                  {(receipt.terms && receipt.terms.length > 0 ? receipt.terms : ['* ৭ দিনের মধ্যে মেমোসহ পরিবর্তনযোগ্য *']).map((t: string, idx: number) => (
                    <p key={idx} style={{ margin: '2px 0' }}>{t}</p>
                  ))}
                  <p style={{ margin: '4px 0 0', fontWeight: '800' }}>*** ধন্যবাদ, আবার আসবেন ***</p>
                </div>
              </div>
            )}

            {/* Print Format Toggle Tabs */}
            <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => { setPrintFormat('thermal'); triggerHaptic('light'); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: printFormat === 'thermal' ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                  background: printFormat === 'thermal' ? '#0f172a' : '#fff',
                  color: printFormat === 'thermal' ? '#fff' : '#475569',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                🧾 থার্মাল স্লিপ (POS)
              </button>
              <button
                type="button"
                onClick={() => { setPrintFormat('a4'); triggerHaptic('light'); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: printFormat === 'a4' ? '1.5px solid #059669' : '1px solid #cbd5e1',
                  background: printFormat === 'a4' ? '#059669' : '#fff',
                  color: printFormat === 'a4' ? '#fff' : '#475569',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                📄 A4 ফুল ইনভয়েস
              </button>
            </div>

            {/* Action Buttons (Excluded from Print) */}
            <div className="no-print" style={{ display: 'grid', gap: '8px' }}>
              <button
                onClick={() => { window.print(); triggerHaptic('light'); }}
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

              {(receipt.orderType || receipt.industryId === 'cat-restaurant') && (
                <button
                  onClick={() => {
                    setIsKotPrint(true);
                    triggerHaptic('light');
                    setTimeout(() => {
                      window.print();
                      setTimeout(() => setIsKotPrint(false), 800);
                    }, 100);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#d97706',
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
                  <span>🍳</span> কিচেন অর্ডার স্লিপ (KOT) প্রিন্ট
                </button>
              )}

              {receipt.customerPhone && (
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    const cleanPhone = receipt.customerPhone.replace(/[^0-9]/g, '');
                    const textMsg = encodeURIComponent(`আসসালামু আলাইকুম ${receipt.customerName} ভাই, ${receipt.shopName} থেকে আপনার ক্যাশ মেমো #${receipt.invoiceNo}। মোট বিল: ৳${receipt.totalAmount}, পরিশোধ: ৳${receipt.paidAmount}। ধন্যবাদ!`);
                    window.open(`https://wa.me/88${cleanPhone}?text=${textMsg}`, '_blank');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#25d366',
                    color: '#fff',
                    border: 'none',
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
                  <span>💬</span> WhatsApp-এ মেমো পাঠান
                </button>
              )}

              <button
                onClick={() => { setReceipt(null); triggerHaptic('light'); }}
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
                ✓ সম্পন্ন (নতুন বিক্রি)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Custom Product Modal */}
      {showQuickAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)',
          zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                ➕ নতুন {tenant?.industryName ? tenant.industryName + ' পণ্য' : 'পণ্য'} যোগ
              </h3>
              <button onClick={() => setShowQuickAddModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>
              পণ্যটির তথ্য লিখুন। এটি বর্তমান মেমোতে যোগ হবে এবং স্থায়ীভাবে দোকানে সেভ হয়ে যাবে।
            </p>

            <form onSubmit={handleQuickAddProduct} style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  {industryId === 'cat-pharmacy' ? 'ঔষধের নাম *' : 'পণ্যের নাম *'}
                </label>
                <input
                  type="text"
                  placeholder={industryId === 'cat-pharmacy' ? 'যেমন: নাপা এক্সট্রা ট্যাবলেট' : industryId === 'cat-clothing' ? 'যেমন: সুতি পাঞ্জাবি' : 'যেমন: তীর সয়াবিন তেল'}
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Pharmacy Specific: Generic Name & Expiry Date */}
              {industryId === 'cat-pharmacy' && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      🧪 জেনেরিক নাম (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: Paracetamol + Caffeine"
                      value={quickAddGeneric}
                      onChange={(e) => setQuickAddGeneric(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      ⏳ মেয়াদোত্তীর্ণ তারিখ (Expiry Date)
                    </label>
                    <input
                      type="date"
                      value={quickAddExpiry}
                      onChange={(e) => setQuickAddExpiry(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }}
                    />
                  </div>
                </>
              )}

              {/* Clothing Specific: Size & Color */}
              {industryId === 'cat-clothing' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      🏷️ সাইজ
                    </label>
                    <select
                      value={quickAddSize}
                      onChange={(e) => setQuickAddSize(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }}
                    >
                      <option value="S">S (স্মল)</option>
                      <option value="M">M (মিডিয়াম)</option>
                      <option value="L">L (লার্জ)</option>
                      <option value="XL">XL (এক্সট্রা লার্জ)</option>
                      <option value="XXL">XXL</option>
                      <option value="30">30 ইঞ্চি</option>
                      <option value="32">32 ইঞ্চি</option>
                      <option value="34">34 ইঞ্চি</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      🎨 কালার
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: সাদা, কালো"
                      value={quickAddColor}
                      onChange={(e) => setQuickAddColor(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>বিক্রয় মূল্য (৳) *</label>
                  <input
                    type="number"
                    placeholder="যেমন: ১৫০"
                    value={quickAddPrice}
                    onChange={(e) => setQuickAddPrice(e.target.value)}
                    required
                    className="num-font"
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '16px', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>একক (Unit)</label>
                  <IndustryUnitSelect
                    value={quickAddUnit}
                    onChange={setQuickAddUnit}
                    industryId={industryId}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowQuickAddModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>বাতিল</button>
                <button type="submit" style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>
                  ✓ মেমোতে যোগ করুন ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🫖 MODAL 1: NEW RUNNING TAB CREATOR */}
      {showNewTabModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🫖</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  নতুন চলতি আড্ডা খাতা
                </h3>
              </div>
              <button
                onClick={() => setShowNewTabModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>
              দোকানে বসে থাকা কাস্টমারের নাম বা চেনার মতো বর্ণনা লিখুন (যেমন: <strong>রহিম ভাই</strong>, <strong>লাল শার্ট পরা ভাই</strong> বা <strong>ভ্যানওয়ালা আলম</strong>)।
            </p>

            <form onSubmit={handleCreateNewTab} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  কাস্টমারের নাম বা বর্ণনা *
                </label>
                <input
                  type="text"
                  placeholder="যেমন: রহিম ভাই / ২ নং টেবিল"
                  value={newTabCustomerName}
                  onChange={(e) => setNewTabCustomerName(e.target.value)}
                  required
                  autoFocus
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '15px' }}
                />
              </div>

              {cart.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                  💡 বর্তমান কার্টের <strong>{cart.length}টি আইটেম (৳{subtotalCart})</strong> সরাসরি এই ট্যাবে জমা হবে।
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewTabModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
                >
                  ✓ খাতা ওপেন করুন ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🫖 MODAL 2: SETTLE RUNNING TAB (CASH OR DUE KHATA) */}
      {showSettleModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>☕</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                    {showSettleModal.customer_name}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>চলতি বিল নিষ্পন্ন বা বাকি খাতা</span>
                </div>
              </div>
              <button
                onClick={() => setShowSettleModal(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Total Amount Display */}
            <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '16px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#065f46', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                মোট বকেয়া বিল
              </span>
              <div className="num-font" style={{ fontSize: '36px', fontWeight: '900', color: '#059669' }}>
                ৳{showSettleModal.total_amount}
              </div>
              <span style={{ fontSize: '11.5px', color: '#047857' }}>
                {showSettleModal.items?.length || 0}টি আইটেম গ্রহণ করেছেন
              </span>
            </div>

            {/* List of items in this tab */}
            {showSettleModal.items && showSettleModal.items.length > 0 && (
              <div style={{ maxHeight: '120px', overflowY: 'auto', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '12px' }}>
                {showSettleModal.items.map((it: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed #e2e8f0' }}>
                    <span>{it.product?.banglaName || it.product?.name || 'আইটেম'} × {it.quantity}</span>
                    <strong className="num-font">৳{it.totalPrice}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* 1-Click Settle Actions */}
            <div style={{ display: 'grid', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleSettleTab(showSettleModal, 'cash')}
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '14px',
                  fontWeight: '900',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <span>🟢</span>
                <span>নগদ পরিশোধ (৳{showSettleModal.total_amount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSettleTab(showSettleModal, 'due')}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '14px',
                  fontWeight: '900',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
                }}
              >
                <span>🔴</span>
                <span>বাকি খাতায় লিখে রাখুন (খাতায় জমা)</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('এই ট্যাবটি ডিলিট করতে চান?')) {
                    await fetch(`/api/running-tabs/${showSettleModal.id}`, { method: 'DELETE' });
                    await loadRunningTabs();
                    setShowSettleModal(null);
                  }
                }}
                style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: '12px', cursor: 'pointer' }}
              >
                🗑️ বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => setShowSettleModal(null)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
              >
                পরে বিল করব
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚖️ MODAL 3: TAKA-TO-WEIGHT GRAM CONVERTER */}
      {showGramModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>⚖️</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  টাকার হিসাবে গ্রাম ক্যালকুলেটর
                </h3>
              </div>
              <button
                onClick={() => setShowGramModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGramConvertSubmit} style={{ display: 'grid', gap: '14px' }}>
              {/* Product Selector */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  পণ্য বাছাই করুন
                </label>
                <select
                  value={gramTargetProduct?.id || ''}
                  onChange={(e) => {
                    const found = products.find(p => p.id === e.target.value);
                    if (found) setGramTargetProduct(found);
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.banglaName || p.name} (দর: ৳{p.sellingPrice}/{p.unit || 'কেজি'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Taka Input */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  কাস্টমার কত টাকার নিতে চায়? *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#64748b' }}>৳</span>
                  <input
                    type="number"
                    placeholder="যেমন: ২০ বা ৫০ বা ১০০"
                    value={gramInputTaka}
                    onChange={(e) => setGramInputTaka(e.target.value)}
                    required
                    autoFocus
                    className="num-font"
                    style={{ width: '100%', padding: '12px 12px 12px 34px', borderRadius: '12px', border: '2px solid #3b82f6', outline: 'none', boxSizing: 'border-box', fontSize: '20px', fontWeight: '900' }}
                  />
                </div>
              </div>

              {/* Live Weight Calculation Banner */}
              {gramTargetProduct && gramInputTaka && parseFloat(gramInputTaka) > 0 && (
                <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    দোকানদারকে যত মাপতে হবে:
                  </span>
                  <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#1d4ed8' }}>
                    {Math.round((parseFloat(gramInputTaka) / (Number(gramTargetProduct.sellingPrice) || 1)) * 1000)} গ্রাম
                  </div>
                  <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '700' }}>
                    ({(parseFloat(gramInputTaka) / (Number(gramTargetProduct.sellingPrice) || 1)).toFixed(3)} {gramTargetProduct.unit || 'কেজি'})
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowGramModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!gramInputTaka || parseFloat(gramInputTaka) <= 0}
                  style={{ flex: 2, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
                >
                  ✓ মেমোতে যোগ করুন ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 Mobile Sticky Bottom Cart Pill (1-Tap Fast Checkout) */}
      {cart.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '74px',
          left: '12px',
          right: '12px',
          maxWidth: '560px',
          margin: '0 auto',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '12px 18px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
          border: '1.5px solid #334155'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>
              কার্টে আছে {cart.length} টি পণ্য
            </div>
            <div style={{ fontSize: '19px', fontWeight: '900', color: '#10b981' }} className="num-font">
              ৳ {cart.reduce((acc, i) => acc + i.totalPrice, 0).toLocaleString('en-US')}
            </div>
          </div>
          <button
            onClick={() => { setShowCartDrawer(true); triggerHaptic('medium'); }}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '10px 18px',
              fontWeight: '900',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
            }}
          >
            <span>🛒 বিল দেখুন</span>
            <span>➔</span>
          </button>
        </div>
      )}

      {/* 🧾 58mm / 80mm ESC/POS Thermal Receipt Print Modal */}
      {receipt && (
        <ThermalReceipt
          invoice={receipt}
          tenant={tenant}
          onClose={() => setReceipt(null)}
        />
      )}

      {/* 🎙️ Ultra Hands-Free Continuous Voice POS Calculator Modal */}
      {showVoiceCalculatorModal && (
        <VoicePOSCalculatorModal
          isOpen={showVoiceCalculatorModal}
          onClose={() => setShowVoiceCalculatorModal(false)}
          products={products}
          customers={customers}
          onProductAutoAdded={(newProd) => {
            setProducts(prev => [newProd, ...prev]);
          }}
          onCompleteSale={(saleData) => {
            setShowVoiceCalculatorModal(false);
            setReceipt(saleData.order || saleData);
            loadData();
          }}
        />
      )}

    </div>
  );
}
