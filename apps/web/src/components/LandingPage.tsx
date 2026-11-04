'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  // Scroll Spy Active Section Tracking
  const [activeSection, setActiveSection] = useState<string>('features');

  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // App Install System & Modal State
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installDeviceTab, setInstallDeviceTab] = useState<'android' | 'ios' | 'pc'>('android');
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);

  // Active Interactive Demo Tab (POS / Voice / WhatsApp Khata / Day-End)
  const [activeDemoTab, setActiveDemoTab] = useState<'pos' | 'voice' | 'khata' | 'dayEnd'>('pos');

  // Interactive POS Simulator State
  const [simCart, setSimCart] = useState([
    { id: 1, name: 'তীর সয়াবিন তেল ১ লিটার', price: 185, qty: 1, unit: 'বোতল' },
    { id: 2, name: 'মিনিকেট চাল প্রিমিয়াম', price: 72, qty: 2, unit: 'কেজি' },
  ]);
  const [simCustomerName, setSimCustomerName] = useState('করিম সাহেব (নিয়মিত)');
  const [simPaidAmount, setSimPaidAmount] = useState(300);
  const [simOrderSuccess, setSimOrderSuccess] = useState(false);

  // Simulated Voice Input State
  const [voiceSimStep, setVoiceSimStep] = useState<'idle' | 'listening' | 'parsed'>('idle');
  const [voiceSimPhrase, setVoiceSimPhrase] = useState('');

  // Industry Selector State
  const [activeIndustryTab, setActiveIndustryTab] = useState<number>(0);

  // Pricing Plan Toggle: 'monthly' | 'yearly'
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Helper for POS Sim calculation
  const simSubtotal = simCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const simDue = Math.max(0, simSubtotal - simPaidAmount);

  // Scroll Spy Effect for Active Menu Link Tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const sections = ['demo', 'features', 'comparison', 'industries', 'pricing', 'faq'];
      const scrollPos = window.scrollY + 160;

      if (window.scrollY < 200) {
        setActiveSection('');
        return;
      }

      let current = '';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && scrollPos >= el.offsetTop) {
          current = id;
        }
      }
      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (typeof window === 'undefined') return;
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -72;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  // Check PWA prompt availability
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__pwaInstallPrompt) {
      setIsPwaInstallable(true);
    }
    const readyListener = () => setIsPwaInstallable(true);
    window.addEventListener('lbos-pwa-ready', readyListener);
    return () => window.removeEventListener('lbos-pwa-ready', readyListener);
  }, []);

  const handleInstallAppClick = async () => {
    if (typeof window !== 'undefined') {
      const prompt = (window as any).__pwaInstallPrompt;
      if (prompt) {
        try {
          prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === 'accepted') {
            (window as any).__pwaInstallPrompt = null;
            setIsPwaInstallable(false);
            setShowInstallModal(false);
            return;
          }
        } catch (e) {}
      }
    }
    setShowInstallModal(true);
  };

  const addSimItem = (item: { id: number; name: string; price: number; unit: string }) => {
    setSimCart(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setSimOrderSuccess(false);
  };

  const removeSimItem = (id: number) => {
    setSimCart(prev => prev.filter(p => p.id !== id));
    setSimOrderSuccess(false);
  };

  const triggerVoiceSim = (phrase: string, parsedItems: Array<{ id: number; name: string; price: number; qty: number; unit: string }>) => {
    setVoiceSimPhrase(phrase);
    setVoiceSimStep('listening');
    setTimeout(() => {
      setVoiceSimStep('parsed');
      setSimCart(prev => {
        let next = [...prev];
        parsedItems.forEach(item => {
          const idx = next.findIndex(p => p.id === item.id);
          if (idx >= 0) {
            next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
          } else {
            next.push(item);
          }
        });
        return next;
      });
    }, 1100);
  };

  // Industries Data
  const industries = [
    {
      id: 'grocery',
      name: 'মুদি ও সুপারশপ',
      badge: 'জনপ্রিয়',
      tagline: 'পোয়া, গ্রাম, কেজি ও ড্রয়ারের সঠিক হিসাব',
      features: [
        'চাল, ডাল, তেলসহ খোলা পণ্যের ভগ্নাংশ (কেজি, গ্রাম, পোয়া) দ্রুত হিসাব',
        'বারকোড স্ক্যানার ও কিবোর্ড শর্টকাট দিয়ে চোখের পলকে মেমো তৈরি',
        'বাকি খাতা আপডেট এবং অটো WhatsApp বকেয়া তাগাদা',
        'সন্ধ্যায় নগদ ক্যাশ ড্রয়ার মিল ও নিট দৈনিক লাভ রিপোর্ট'
      ],
      sampleItems: ['তীর সয়াবিন তেল', 'মিনিকেট চাল', 'ডানো গুঁড়ো দুধ', 'চিনি']
    },
    {
      id: 'pharmacy',
      name: 'ফার্মেসি ও ড্রাগ স্টোর',
      badge: 'মেয়াদ রাডার',
      tagline: 'জেনেরিক নাম ও মেয়াদোত্তীর্ণ ঔষধ অ্যালার্ট',
      features: [
        'ঔষধের ব্র্যান্ড নাম ও জেনেরিক নাম দিয়ে নিমেষে সার্চ',
        'মেয়াদোত্তীর্ণ রাডার: মেয়াদ শেষ হওয়ার ৩০ দিন আগেই লাল সংকেত',
        'পাতা (Strip), বক্স বা পিস হিসেবে সঠিক ও নির্ভুল বিলিং',
        'প্রেসক্রিপশন কাস্টমার হিস্ট্রি ও বাকি খাতা সুরক্ষা'
      ],
      sampleItems: ['Napa Extra 500mg', 'Seclo 20mg Capsule', 'Monas 10mg', 'Almex 400mg']
    },
    {
      id: 'fashion',
      name: 'পোশাক ও ফ্যাশন শপ',
      badge: 'বারকোড রেডি',
      tagline: 'সাইজ ও কালার ভ্যারিয়েন্ট বারকোড স্টিকার',
      features: [
        'একই পোশাকের সাইজ (S, M, L, XL, XXL) ও কালার স্টক আলাদা ট্র্যাকিং',
        'থার্মাল প্রিন্টারে কাপড়ের ট্যাগের নিজস্ব বারকোড স্টিকার প্রিন্ট',
        'বুটিক ও টেইলারিং কাস্টমারদের অ্যাডভান্স জমা ও বকেয়া হিসাব',
        'ঋতুভিত্তিক বিক্রি ও লাভ-ক্ষতির পূর্ণাঙ্গ অ্যানালিটিক্স'
      ],
      sampleItems: ['প্রিমিয়াম পাঞ্জাবি (XL)', 'কটন থ্রি-পিস', 'জিন্স প্যান্ট (32)', 'টি-শার্ট']
    },
    {
      id: 'restaurant',
      name: 'রেস্তোরাঁ ও ক্যাফে',
      badge: 'কিচেন স্লিপ',
      tagline: 'টেবিল অর্ডার ও দ্রুত কিচেন প্রিন্ট স্লিপ',
      features: [
        'টেবিল ভিত্তিক কাস্টমার অর্ডার ও ডাইন-ইন / পার্সেল বিলিং',
        'রান্নাঘরে সরাসরি দ্রুত KOT (Kitchen Order Ticket) প্রিন্ট',
        'ফুড আইটেম ও কাঁচামালের (চাল, মাংস, তেল) স্টক পর্যবেক্ষণ',
        'বিকাশ/নগদ ও ক্যাশ বিল আলাদা হিসাব ও ভ্যাট/ডিসকাউন্ট'
      ],
      sampleItems: ['বিফ কাচ্চি বিরিয়ানি', 'স্পেশাল চিকেন ফ্রাই', 'কোল্ড কফি', 'মমো স্পেশাল']
    },
    {
      id: 'hardware',
      name: 'হার্ডওয়্যার ও স্যানিটারি',
      badge: 'পাইকারি লেজার',
      tagline: 'ফুট, মিটার ও পাইকারি মহাজন চালান খাতা',
      features: [
        'রড, সিমেন্ট, পাইপ ও স্যানিটারি ফিটিংসের জটিল পরিমাপ হিসাব',
        'মহাজন ও ডিলারদের সাথে বাকির চালান ও লেজার কালেকশন',
        'ঠিকাদার ও মিস্ত্রীদের জন্য আলাদা স্পেশাল রেট ক্যাটালগ',
        'ট্রাক বা পিক-আপ ডেলিভারি চালান ও আনলোড ট্র্যাকিং'
      ],
      sampleItems: ['শাহ সিমেন্ট (ব্যাগ)', 'PVC পাইপ ৪ ইঞ্চি', 'এনার্জি লাইট ২০ ওয়াট', 'সুইচ বোর্ড']
    },
    {
      id: 'electronics',
      name: 'মোবাইল ও গ্যাজেট',
      badge: 'IMEI ট্র্যাকিং',
      tagline: 'IMEI, সিরিয়াল নম্বর ও ওয়ারেন্টি কার্ড প্রিন্ট',
      features: [
        'প্রতিটি ফোনের আলাদা ইউনিক IMEI নম্বর ও সিরিয়াল রেকর্ড',
        'কাস্টমারকে ডিজিটাল ওয়ারেন্টি কার্ড ও সার্ভিস স্লিপ প্রিন্ট প্রদান',
        'সার্ভিসিং ও রিপেয়ারিং পার্টস ট্র্যাকিং ও বিলিং',
        'মোবাইল এক্সেসরিজ ও গ্যাজেটের দ্রুত বারকোড সেলস'
      ],
      sampleItems: ['Realme C53', 'Samsung 25W Adapter', 'Boat Wireless Earbuds', '10000mAh Powerbank']
    }
  ];

  // 6 Core Features
  const coreFeatures = [
    {
      title: 'অতিদ্রুত POS কাউন্টার ও বারকোড বিলিং',
      desc: 'কিবোর্ড, মাউস, টাচস্ক্রিন বা বারকোড স্ক্যানার—যেকোনো উপায়ে চোখের পলকে ক্যাশ মেমো তৈরি। ৫০ মিমি ও ৮০ মিমি ব্লুটুথ থার্মাল প্রিন্টারে সরাসরি স্লিপ প্রিন্ট হয়।',
      badge: 'কাউন্টার স্পিড',
      accentColor: '#10b981'
    },
    {
      title: 'বাংলা এআই ভয়েস বিলিং (AI Voice Memo)',
      desc: 'কোনো টাইপিং বা খোঁজাখুঁজি ছাড়া মুখে বলুন "চাল ২ কেজি, তেল ১ বোতল"—সফটওয়্যার নিজ থেকেই শুনে মেমো তৈরি করে দেবে। ব্যস্ত দোকানে সময় বাঁচবে দ্বিগুণ।',
      badge: 'এআই প্রযুক্তি',
      accentColor: '#10b981'
    },
    {
      title: 'স্মার্ট বাকি খাতা ও WhatsApp অটো রসিদ',
      desc: 'কোন গ্রাহকের কত টাকা বাকি, জমার ইতিহাস ও বকেয়া সীমা। এক ক্লিকেই গ্রাহকের হোয়াটসঅ্যাপে সম্মানজনক তাগাদা এসএমএস ও ডিজিটাল রসিদ পাঠানো যায়।',
      badge: 'বকেয়া সুরক্ষা',
      accentColor: '#ea580c'
    },
    {
      title: '১০০% নিরবচ্ছিন্ন অফলাইন মোড (নেট ছাড়াও চলবে)',
      desc: 'বিদ্যুৎ চলে গেলে বা ইন্টারনেট না থাকলেও দোকানে কোনো কাজ থামবে না। বিলিং, বারকোড স্ক্যান ও খাতা চলবে ফুল স্পিডে। নেট আসলে স্বয়ংক্রিয় ক্লাউড ব্যাকআপ হবে।',
      badge: 'অফলাইন ফার্স্ট',
      accentColor: '#059669'
    },
    {
      title: 'স্টক অ্যালার্ট ও ফার্মেসি মেয়াদ রাডার',
      desc: 'দোকানের কোনো পণ্য কমে আসলে আগেই নোটিফিকেশন। ফার্মেসির ক্ষেত্রে মেয়াদ শেষ হওয়ার আগেই কালার কোডেড সতর্কবার্তা, ফলে নষ্ট মালের লোকসান হবে শূন্য।',
      badge: 'জিরো লোকসান',
      accentColor: '#10b981'
    },
    {
      title: 'প্রতি সন্ধ্যার ক্যাশ মিল ও নিট লাভ রিপোর্ট',
      desc: 'সারাদিন শেষে নগদ টাকা, বাকি বিক্রি, খরচ ও ক্যাশ ড্রয়ারের টাকা মিলিয়ে নিন মাত্র ২ মিনিটে। প্রতিদিনের নিট লাভ ও বিক্রির গ্রাফ এক নজরেই দেখতে পাবেন।',
      badge: 'আর্থিক স্বচ্ছতা',
      accentColor: '#10b981'
    }
  ];

  // Testimonials
  const testimonials = [
    {
      name: 'মো: রফিকুল ইসলাম',
      shop: 'ভাই ভাই জেনারেল স্টোর',
      location: 'মিরপুর-১০, ঢাকা',
      quote: 'আগে প্রতিদিন রাতে খাতা নিয়ে বসতে হত, হিসাব মিলত না। সহজ হিসাব নেয়ার পর দোকানে হিসাব এখন পানির মতো সহজ। ক্যাশ কাউন্টারের কাজ এখন চোখের পলকে শেষ হয়!',
      tag: 'মুদি ও সুপারশপ'
    },
    {
      name: 'ডা: আসাদুজ্জামান ভূঁইয়া',
      location: 'জিন্দাবাজার, সিলেট',
      shop: 'জনসেবা ফার্মেসি',
      quote: 'মেয়াদোত্তীর্ণ ঔষধের রাডার ফিচারটা আমাকে প্রতি মাসে ১৫-২০ হাজার টাকার লোকসান থেকে বাঁচিয়ে দিচ্ছে। কাস্টমারকে থার্মাল প্রিন্টেড স্লিপ দিতে পেরে তারা খুবই খুশি।',
      tag: 'ফার্মেসি ও ড্রাগ'
    },
    {
      name: 'সুজন মজুমদার',
      location: 'নিউ মার্কেট, চট্টগ্রাম',
      shop: 'সুজন ফ্যাশন হাউস',
      quote: 'পোশাকের জন্য নিজস্ব বারকোড স্টিকার প্রিন্ট করতে পারছি। বকেয়া কাস্টমারদের হোয়াটসঅ্যাপে রসিদ পাঠালে এখন আর লজ্জা পেতে হয় না, দ্রুত টাকা চলে আসে।',
      tag: 'পোশাক ও ফ্যাশন'
    }
  ];

  // Comparison Matrix Data
  const comparisonItems = [
    {
      feature: 'বিদ্যুৎ বা নেট না থাকলে সফটওয়্যার চালু থাকে?',
      traditional: 'বন্ধ হয়ে যায় (দোকানের কাজ আটকে থাকে)',
      shohoj: '১০০% অফলাইনে ফুল স্পিডে চলবে'
    },
    {
      feature: 'টাইপিং ছাড়া মুখে বাংলায় কথা বলে বিলিং?',
      traditional: 'কোনো অপশন নেই',
      shohoj: 'মুখে বললেই নিমেষে অটো মেমো (AI)'
    },
    {
      feature: 'হোয়াটসঅ্যাপে ডিজিটাল রসিদ ও বকেয়া তাগাদা?',
      traditional: 'নেই বা আলাদা সফটওয়্যার লাগে',
      shohoj: '১ ক্লিকেই প্রফেশনাল স্লিপ ও তাগাদা সেন্ড'
    },
    {
      feature: 'প্রতি সন্ধ্যায় ক্যাশ ড্রয়ার ও নিট লাভ মিল?',
      traditional: 'জটিল ও সময়সাপেক্ষ',
      shohoj: 'ক্যাশ মিল ককপিটে মাত্র ২ মিনিটে'
    },
    {
      feature: 'মোবাইল ও কম্পিউটার উভয়েই চলে?',
      traditional: 'অধিকাংশ শুধু কম্পিউটারে চলে',
      shohoj: 'মোবাইল, ট্যাব ও পিসিতে একই সাথে'
    },
    {
      feature: 'মাসিক খরচ ও সাবস্ক্রিপশন ফি?',
      traditional: '৳৫০০ থেকে ৳২,৫০০ / মাস',
      shohoj: 'মাত্র ৳১৪৯ / মাস (৭ দিন সম্পূর্ণ ফ্রি)'
    }
  ];

  // FAQs
  const faqs = [
    {
      q: 'দোকানে বিদ্যুৎ বা ইন্টারনেট না থাকলে কি সহজ হিসাব চলবে?',
      a: 'হ্যাঁ, ১০০% চলবে! সহজ হিসাব সম্পূর্ণ অফলাইন-ফার্স্ট প্রযুক্তিতে তৈরি। বিদ্যুৎ বা ওয়াইফাই সংযোগ চলে গেলেও আপনার দোকানে বিক্রি, বারকোড স্ক্যান এবং বাকি খাতা সম্পূর্ণ স্বাভাবিকভাবেই চলবে। নেট আসলে স্বয়ংক্রিয়ভাবে সব ডাটা ক্লাউডে সুরক্ষিত হয়ে যাবে।'
    },
    {
      q: 'মোবাইলে অ্যাপ ইনস্টল করব কীভাবে? প্লে-স্টোরে আছে কি?',
      a: 'সহজ হিসাব হচ্ছে একটি আল্ট্রা-লাইটওয়েট PWA অ্যাপ। প্লে-স্টোরে না গিয়েও সরাসরি ব্রাউজার থেকেই মাত্র ১ ক্লিকে আপনার ফোনের হোমস্ক্রিনে ইনস্টল হয়ে যায়। কোনো অতিরিক্ত মেগাবাইট খরচ হয় না এবং সাধারণ অ্যাপের মতোই কাজ করে।'
    },
    {
      q: 'মোবাইল এবং কম্পিউটার উভয় থেকেই কি ব্যবহার করা যাবে?',
      a: 'অবশ্যই! আপনার যেকোনো অ্যান্ড্রয়েড ফোন, ট্যাবলেট, ল্যাপটপ বা ডেস্কটপ কম্পিউটার—সব ডিভাইসেই সহজ হিসাব সমান গতিতে কাজ করে। মোবাইল ও ডেস্কটপের জন্য আলাদা বিশেষায়িত ইন্টারফেস রয়েছে।'
    },
    {
      q: 'আমার দোকানের হিসাব ও কাস্টমার ডাটা কি নিরাপদ থাকবে?',
      a: 'শতভাগ নিরাপদ! আপনার সমস্ত হিসাব এনক্রিপ্টেড ডাটাবেজ এবং নিরাপদ ক্লাউড ভল্টে প্রতিদিন স্বয়ংক্রিয়ভাবে ব্যাকআপ রাখা হয়। মোবাইল নষ্ট বা চুরি হলেও নতুন ফোনে লগইন করলেই আপনার সমস্ত হিসাব অক্ষত ফিরে পাবেন।'
    },
    {
      q: 'থার্মাল প্রিন্টার দিয়ে কি ক্যাশ মেমো প্রিন্ট করা যাবে?',
      a: 'হ্যাঁ! ব্লুটুথ থার্মাল প্রিন্টার (58mm ও 80mm) এবং সাধারণ যেকোনো ডেস্কটপ প্রিন্টারে চোখের পলকে মেমো প্রিন্ট করতে পারবেন। এছাড়া কোনো প্রিন্টার না থাকলেও হোয়াটসঅ্যাপে সরাসরি ডিজিটাল রসিদ পাঠানো যায়।'
    },
    {
      q: 'আমি কীভাবে শুরু করতে পারি? কোনো ক্রেডিট কার্ড লাগবে কি?',
      a: 'না, কোনো ক্রেডিট কার্ড লাগবে না। মাত্র ১ মিনিটে আপনার মোবাইল নাম্বার ও দোকানের নাম দিয়ে অ্যাকাউন্ট খুলে এখনই ৭ দিনের সম্পূর্ণ ফ্রি ট্রায়াল শুরু করতে পারবেন।'
    }
  ];

  const navLinks = [
    { id: 'features', label: 'ফিচারসমূহ' },
    { id: 'demo', label: 'লাইভ ডেমো' },
    { id: 'industries', label: 'ব্যবসার ধরন' },
    { id: 'comparison', label: 'তুলনা' },
    { id: 'pricing', label: 'প্যাকেজ ও খরচ' },
    { id: 'faq', label: 'প্রশ্নোত্তর' }
  ];

  return (
    <div style={{ background: '#f8fafc', color: '#0f172a', minHeight: '100vh', fontFamily: "'Hind Siliguri', 'Outfit', sans-serif" }}>
      
      {/* 🎨 GLOBAL STYLES & DYNAMIC KEYFRAME ANIMATIONS */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        /* Nav Link Hover & Active Styles */
        .landing-nav-link {
          text-decoration: none;
          color: #475569;
          font-size: 14.5px;
          font-weight: 700;
          white-space: nowrap;
          padding: 8px 14px;
          border-radius: 8px;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          display: inline-block;
        }
        .landing-nav-link:hover {
          color: #059669 !important;
          background: #f0fdf4 !important;
          transform: translateY(-1px);
        }
        .landing-nav-link.active {
          color: #059669 !important;
          background: #ecfdf5 !important;
          font-weight: 800 !important;
        }
        .landing-nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2.5px;
          background: #059669;
          border-radius: 99px;
          animation: pillGrow 0.25s ease-out;
        }

        @keyframes pillGrow {
          from { width: 0; opacity: 0; }
          to { width: 20px; opacity: 1; }
        }

        /* Action Buttons Hover Transitions */
        .landing-btn-install {
          background: #f8fafc;
          border: 1.5px solid #cbd5e1;
          color: #0f172a;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .landing-btn-install:hover {
          border-color: #059669;
          color: #059669;
          background: #f0fdf4;
          transform: translateY(-1.5px);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.12);
        }

        .landing-btn-login {
          text-decoration: none;
          color: #334155;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 800;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .landing-btn-login:hover {
          color: #059669;
          background: #f0fdf4;
        }

        .landing-btn-primary {
          text-decoration: none;
          background: #059669;
          color: #ffffff;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.28);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-block;
        }
        .landing-btn-primary:hover {
          background: #047857;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
        }

        /* Section Cards Hover & Transitions */
        .feature-box-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          padding: 26px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .feature-box-card:hover {
          transform: translateY(-6px);
          border-color: #10b981;
          box-shadow: 0 20px 40px -10px rgba(5, 150, 105, 0.12);
        }

        .interactive-sim-card {
          transition: all 0.25s ease;
        }
        .interactive-sim-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.06);
          border-color: #10b981;
        }

        .pricing-box-card {
          background: #ffffff;
          border-radius: 24px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pricing-box-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.12);
        }

        .compare-row {
          transition: background 0.18s ease;
        }
        .compare-row:hover {
          background: #f0fdf4 !important;
        }

        /* Gentle Floating Ambient Animation */
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .hero-floating-element {
          animation: subtleFloat 6s ease-in-out infinite;
        }

        /* Pulsing Dot Animation */
        @keyframes statusBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        .live-status-dot {
          animation: statusBlink 2s infinite ease-in-out;
        }
      `}</style>
      
      {/* 🌟 REFINED MINIMALIST NAVBAR (Clean Text, No Emojis, Active & Hover Highlighting) */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          {/* Brand Logo (Clean Modern Text Mark - Pure Typography) */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: '#059669',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '17px',
              fontWeight: '900',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}>
              S
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '19px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                ShohojHisab
              </span>
              <span style={{
                fontSize: '11px',
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '800',
                whiteSpace: 'nowrap'
              }}>
                সহজ হিসাব
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links with Dynamic Active & Hover Colors */}
          <div className="desktop-only" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0
          }}>
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => scrollToSection(e, link.id)}
                className={`landing-nav-link ${activeSection === link.id ? 'active' : ''}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Action Elements (App Install, Login, Primary CTA - Pure Text) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            
            {/* Clean App Install Button */}
            <button
              type="button"
              onClick={handleInstallAppClick}
              className="landing-btn-install"
              title="ফোনে বা কম্পিউটারে অ্যাপ ইনস্টল করুন"
            >
              অ্যাপ ইনস্টল
            </button>

            {/* Login Link */}
            <Link
              href="/login"
              className="landing-btn-login"
            >
              লগইন
            </Link>

            {/* Primary Action Button */}
            <Link
              href="/login?tab=register"
              className="landing-btn-primary"
            >
              ফ্রি শুরু করুন
            </Link>

            {/* Mobile Menu Hamburger (Mobile Only) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-only"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 10px',
                fontSize: '18px',
                color: '#0f172a',
                cursor: 'pointer'
              }}
              aria-label="Open Mobile Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* 📱 MOBILE NAVIGATION DRAWER (Slide-over - Pure Text, No Emojis) */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Backdrop Click */}
          <div style={{ flex: 1 }} onClick={() => setMobileMenuOpen(false)} />

          {/* Drawer Body */}
          <div style={{
            width: '85%',
            maxWidth: '340px',
            background: '#ffffff',
            height: '100%',
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.15)'
          }}>
            <div>
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#059669', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '15px', fontWeight: '900' }}>
                    S
                  </div>
                  <div>
                    <strong style={{ fontSize: '16px', color: '#0f172a' }}>ShohojHisab</strong>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800' }}>সহজ হিসাব ওএস</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', color: '#64748b', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Install App Button in Mobile Menu (No Emojis) */}
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); handleInstallAppClick(); }}
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '18px',
                  fontSize: '13.5px',
                  fontWeight: '800'
                }}
              >
                ফোনে অ্যাপ ইনস্টল করুন
              </button>

              {/* Drawer Links (Pure Text with Active Highlights) */}
              <div style={{ display: 'grid', gap: '8px' }}>
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      scrollToSection(e, link.id);
                    }}
                    style={{
                      textDecoration: 'none',
                      color: activeSection === link.id ? '#059669' : '#0f172a',
                      background: activeSection === link.id ? '#ecfdf5' : '#f8fafc',
                      fontWeight: activeSection === link.id ? '800' : '700',
                      fontSize: '14px',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      display: 'block',
                      borderLeft: activeSection === link.id ? '3px solid #059669' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'grid', gap: '10px' }}>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  textDecoration: 'none',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '11px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  textAlign: 'center'
                }}
              >
                দোকানে লগইন
              </Link>

              <Link
                href="/login?tab=register"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  textDecoration: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '900',
                  fontSize: '14px',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}
              >
                ফ্রি ট্রায়াল শুরু করুন
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 HERO SECTION WITH ANIMATED AMBIENT GLOW */}
      <section style={{
        padding: '50px 20px 70px',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16, 185, 129, 0.18) 0%, rgba(255, 255, 255, 0.8) 50%, #f8fafc 100%)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Ambient Floating Glow Orbs */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '420px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.08) 50%, transparent 70%)',
          filter: 'blur(55px)',
          zIndex: 1,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          top: '25%',
          right: '8%',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, transparent 70%)',
          filter: 'blur(45px)',
          zIndex: 1,
          pointerEvents: 'none',
          animation: 'orbFloatSlow 9s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '6%',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          zIndex: 1,
          pointerEvents: 'none',
          animation: 'orbFloatSlow 11s ease-in-out infinite reverse'
        }} />
        <div style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          
          {/* Top Announcement Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            border: '1px solid #a7f3d0',
            padding: '6px 18px',
            borderRadius: '99px',
            marginBottom: '22px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)'
          }}>
            <span className="live-status-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#065f46' }}>
              নতুন সংস্করণ: বাংলা এআই ভয়েস বিলিং ও ১০০% অফলাইন কাউন্টার ৩.০
            </span>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(30px, 5.8vw, 54px)',
            fontWeight: '900',
            color: '#0f172a',
            lineHeight: 1.2,
            margin: '0 0 18px',
            letterSpacing: '-0.5px'
          }}>
            দোকানের হিসাব, বাকি খাতা ও POS—<br />
            <span style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 40%, #059669 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              সব চলবে বিদ্যুৎ বা ইন্টারনেট ছাড়াই!
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(15px, 2.2vw, 18px)',
            color: '#475569',
            maxWidth: '760px',
            margin: '0 auto 32px',
            lineHeight: 1.65
          }}>
            মুদি, ফার্মেসি, পোশাক কিংবা যেকোনো স্থানীয় রিটেইল ব্যবসার সম্পূর্ণ ডিজিটাল সমাধান। 
            <strong> অতিদ্রুত POS কাউন্টার</strong>, <strong>বাংলা ভয়েস মেমো</strong>, 
            <strong> WhatsApp বকেয়া তাগাদা</strong> এবং <strong>১০০% অফলাইন সাপোর্ট</strong>—নেট ছাড়াও চলবে নিরবচ্ছিন্নভাবে।
          </p>

          {/* Hero Action CTA Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '36px'
          }}>
            <Link
              href="/login?tab=register"
              style={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ffffff',
                padding: '14px 30px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '16px',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              ৭ দিনের ফ্রি ট্রায়াল শুরু করুন
            </Link>

            {/* Direct App Install Trigger in Hero */}
            <button
              type="button"
              onClick={handleInstallAppClick}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                padding: '14px 26px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#059669';
                e.currentTarget.style.color = '#059669';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#0f172a';
                e.currentTarget.style.transform = 'none';
              }}
            >
              ফোনে অ্যাপ ইনস্টল করুন
            </button>

            <a
              href="#demo"
              style={{
                textDecoration: 'none',
                background: '#f1f5f9',
                color: '#334155',
                padding: '14px 22px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14.5px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#334155';
              }}
            >
              লাইভ ডেমো পরীক্ষা করুন
            </a>
          </div>

          {/* Trust points */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            fontSize: '13px',
            color: '#64748b',
            fontWeight: '700'
          }}>
            <span>✓ ক্রেডিট কার্ড ছাড়াই চালু</span>
            <span>✓ ১ মিনিটে ফ্রি রেজিস্ট্রেশন</span>
            <span>✓ ১০০% বাংলায় ব্যবহারযোগ্য</span>
            <span>✓ কোনো ট্রেনিং ছাড়াই সহজ</span>
          </div>
        </div>

        {/* 🎮 LIVE INTERACTIVE WORKSTATION SIMULATOR (Subtle Ambient Glow) */}
        <div id="demo" className="hero-floating-element" style={{
          maxWidth: '1080px',
          margin: '46px auto 0',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1.5px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 25px 65px -12px rgba(5, 150, 105, 0.22), 0 0 0 1px rgba(16, 185, 129, 0.2)',
          overflow: 'hidden'
        }}>
          {/* Workstation Top Bar */}
          <div style={{
            background: '#090d16',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: '10px', fontWeight: '800' }}>
                ShohojHisab Live Interactive Station
              </span>
            </div>

            {/* Interactive Feature Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveDemoTab('pos')}
                style={{
                  background: activeDemoTab === 'pos' ? '#059669' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: activeDemoTab === 'pos' ? '0 2px 10px rgba(5, 150, 105, 0.4)' : 'none'
                }}
              >
                POS বিলিং
              </button>
              <button
                type="button"
                onClick={() => setActiveDemoTab('voice')}
                style={{
                  background: activeDemoTab === 'voice' ? '#10b981' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: activeDemoTab === 'voice' ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none'
                }}
              >
                ভয়েস এআই
              </button>
              <button
                type="button"
                onClick={() => setActiveDemoTab('khata')}
                style={{
                  background: activeDemoTab === 'khata' ? '#ea580c' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: activeDemoTab === 'khata' ? '0 2px 10px rgba(234, 88, 12, 0.4)' : 'none'
                }}
              >
                WhatsApp খাতা
              </button>
              <button
                type="button"
                onClick={() => setActiveDemoTab('dayEnd')}
                style={{
                  background: activeDemoTab === 'dayEnd' ? '#10b981' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: activeDemoTab === 'dayEnd' ? '0 2px 10px rgba(139, 92, 246, 0.4)' : 'none'
                }}
              >
                ক্যাশ মিল
              </button>
            </div>
          </div>

          {/* TAB 1: POS BILLING SIMULATOR */}
          {activeDemoTab === 'pos' && (
            <div style={{ padding: '22px', background: '#f8fafc', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* Left: Quick Catalog Add */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      পণ্য নির্বাচন করে লাইভ মেমোতে যোগ করুন:
                    </span>
                    <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                      লাইভ সিমুলেটর
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { id: 1, name: 'তীর সয়াবিন তেল ১ লিটার', price: 185, unit: 'বোতল' },
                      { id: 2, name: 'মিনিকেট চাল প্রিমিয়াম', price: 72, unit: 'কেজি' },
                      { id: 3, name: 'ডানো গুঁড়ো দুধ ৫০০ গ্রাম', price: 460, unit: 'প্যাকেট' },
                      { id: 4, name: 'এসআই পিওর সাদা চিনি', price: 135, unit: 'কেজি' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addSimItem(p)}
                        className="interactive-sim-card"
                        style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '12.5px', fontWeight: '900', color: '#059669' }}>৳ {p.price}</div>
                      </button>
                    ))}
                  </div>

                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#059669',
                    lineHeight: 1.5
                  }}>
                    বারকোড স্ক্যানার দিয়ে স্ক্যান করলেও নিমেষে সরাসরি এই লাইভ মেমোতে আইটেম যুক্ত হয়ে যাবে।
                  </div>
                </div>

                {/* Right: Live Bill Station Preview */}
                <div style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '12px' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>ক্যাশ মেমো (কাউন্টার ১)</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>কাস্টমার: {simCustomerName}</div>
                    </div>
                    <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                      সক্রিয়
                    </span>
                  </div>

                  {/* Cart Items List */}
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '14px' }}>
                    {simCart.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px' }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{item.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                            ({item.qty} {item.unit} × ৳{item.price})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: '#0f172a' }}>৳ {item.qty * item.price}</strong>
                          <button
                            type="button"
                            onClick={() => removeSimItem(item.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
                            title="মুছে ফেলুন"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                    {simCart.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '13px' }}>
                        বামে পণ্যের উপর চাপ দিন!
                      </div>
                    )}
                  </div>

                  {/* Calculations */}
                  <div style={{ borderTop: '1.5px solid #e2e8f0', paddingTop: '10px', display: 'grid', gap: '4px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>মোট মূল্য:</span>
                      <strong style={{ color: '#0f172a' }}>৳ {simSubtotal}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>নগদ জমা:</span>
                      <input
                        type="number"
                        value={simPaidAmount}
                        onChange={(e) => setSimPaidAmount(Number(e.target.value) || 0)}
                        style={{ width: '80px', textAlign: 'right', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '13px' }}
                      />
                    </div>
                    {simDue > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ea580c', fontWeight: '800' }}>
                        <span>বাকি খাতায় যোগ হবে:</span>
                        <span>৳ {simDue}</span>
                      </div>
                    )}
                  </div>

                  {/* Complete button */}
                  <button
                    type="button"
                    onClick={() => setSimOrderSuccess(true)}
                    style={{
                      width: '100%',
                      marginTop: '14px',
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      padding: '11px',
                      borderRadius: '10px',
                      fontWeight: '900',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    ক্যাশ মেমো প্রিন্ট ও সমাপ্ত
                  </button>

                  {simOrderSuccess && (
                    <div style={{ marginTop: '10px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', textAlign: 'center' }}>
                      মেমো সফলভাবে প্রিন্ট ও খাতা আপডেট হয়েছে!
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: VOICE AI MEMO SIMULATOR */}
          {activeDemoTab === 'voice' && (
            <div style={{ padding: '26px 22px', background: '#0f172a', color: '#ffffff', textAlign: 'center' }}>
              <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                <span style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.25)', color: '#34d399', padding: '4px 12px', borderRadius: '99px', fontWeight: '800' }}>
                  বাংলা কথা থেকে ডিজিটাল মেমো তৈরি
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: '900', margin: '12px 0 8px' }}>
                  মুখে বলুন—সফটওয়্যার নিজ থেকেই শুনে মেমো লিখে ফেলবে!
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px' }}>
                  নিচের যে কোনো একটি বাক্যে ক্লিক করে দেখুন কিভাবে সেকেন্ডের মধ্যে স্বয়ংক্রিয়ভাবে পণ্য ও দাম বের করে বিলে যুক্ত হয়ে যায়:
                </p>

                {/* Clickable Voice Pills */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <button
                    type="button"
                    onClick={() => triggerVoiceSim('চাল ৫ কেজি, তেল ২ লিটার', [
                      { id: 201, name: 'নাজিরশাইল চাল', price: 80, qty: 5, unit: 'কেজি' },
                      { id: 202, name: 'রূপচাঁদা সয়াবিন তেল', price: 185, qty: 2, unit: 'লিটার' }
                    ])}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '99px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    "চাল ৫ কেজি, তেল ২ লিটার"
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerVoiceSim('ডানো দুধ ৫০০ গ্রাম, চিনি ২ কেজি', [
                      { id: 203, name: 'ডানো গুঁড়ো দুধ ৫০০ গ্রাম', price: 460, qty: 1, unit: 'প্যাকেট' },
                      { id: 204, name: 'সাদা চিনি', price: 135, qty: 2, unit: 'কেজি' }
                    ])}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '99px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    "ডানো দুধ ৫০০ গ্রাম, চিনি ২ কেজি"
                  </button>
                </div>

                {/* Speech Recognition Status */}
                {voiceSimStep === 'listening' && (
                  <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid #10b981', borderRadius: '16px', padding: '18px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '14px', color: '#34d399', marginBottom: '8px', fontWeight: '800' }}>
                      কথা শোনা হচ্ছে: "{voiceSimPhrase}"
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block' }}>
                      এআই বাংলা বাক্য বিশ্লেষণ করে পণ্য ও পরিমাপ আলাদা করছে...
                    </span>
                  </div>
                )}

                {voiceSimStep === 'parsed' && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '16px', padding: '16px', marginBottom: '14px', textAlign: 'left' }}>
                    <div style={{ color: '#34d399', fontWeight: '800', fontSize: '13.5px', marginBottom: '4px' }}>
                      সফলভাবে পার্স করা হয়েছে ও বিলে যুক্ত হয়েছে!
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#e2e8f0' }}>
                      কথা: <em>"{voiceSimPhrase}"</em>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  মুদি ও ফার্মেসির ভিড়ে কাস্টমারের সামনে কথা বলেই সেকেন্ডে বিল করা সম্ভব।
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WHATSAPP KHATA SIMULATOR */}
          {activeDemoTab === 'khata' && (
            <div style={{ padding: '22px', background: '#f8fafc', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* Due Khata Customer Card */}
                <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>করিম উদ্দিন</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>01712-345678 • নিয়মিত খরিদ্দার</span>
                  </div>

                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '700' }}>বর্তমান মোট বকেয়া:</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#dc2626' }}>৳ ৮৫০</div>
                    <div style={{ fontSize: '11.5px', color: '#7f1d1d', marginTop: '2px' }}>সর্বশেষ বাকি নেওয়া হয়েছে ৩ দিন আগে</div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    <strong>পূর্ববর্তী লেনদেন:</strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span>২৮ অক্টোবর - মুদি বাজার</span>
                      <strong style={{ color: '#dc2626' }}>+ ৳ ৪৫০ (বাকি)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span>২৫ অক্টোবর - নগদ জমা</span>
                      <strong style={{ color: '#059669' }}>- ৳ ৫০০ (জমা)</strong>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Message Preview */}
                <div style={{ background: '#efeae2', border: '1.5px solid #cbd5e1', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ background: '#075e54', color: '#ffffff', padding: '8px 12px', borderRadius: '10px', marginBottom: '14px', fontSize: '13px', fontWeight: '800' }}>
                      WhatsApp অটো তাগাদা বার্তা
                    </div>

                    {/* Chat Bubble */}
                    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontSize: '12.5px', color: '#111827', lineHeight: 1.55 }}>
                      আসসালামু আলাইকুম <strong>করিম ভাই</strong>,<br />
                      <strong>ভাই ভাই জেনারেল স্টোরে</strong> আপনার বকেয়া খাতার বর্তমান হিসাব <strong>৳ ৮৫০</strong>।<br /><br />
                      ক্যাশ মেমোর বিস্তারিত রসিদ দেখতে লিংকে চাপুন:<br />
                      <span style={{ color: '#10b981', textDecoration: 'underline' }}>memo.shohojhisab.com/v/8924</span><br /><br />
                      সুবিধামতো দোকানে এসে অথবা বিকাশে পরিশোধ করতে পারেন। ধন্যবাদ!
                    </div>
                  </div>

                  <div style={{ marginTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => alert('বাস্তব অ্যাপে এক ক্লিকেই গ্রাহকের হোয়াটসঅ্যাপ ওপেন হয়ে সরাসরি মেসেজ ও রসিদ সেন্ড হয়ে যাবে!')}
                      style={{
                        width: '100%',
                        background: '#25d366',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '10px',
                        fontWeight: '900',
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 3px 10px rgba(37, 211, 102, 0.3)'
                      }}
                    >
                      হোয়াটসঅ্যাপে তাগাদা পাঠান
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: DAILY CASH COCKPIT */}
          {activeDemoTab === 'dayEnd' && (
            <div style={{ padding: '22px', background: '#f8fafc', textAlign: 'left' }}>
              <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>দৈনিক ক্যাশ মিল ও নিট লাভ</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>আজকের দিনের সমাপ্তি হিসাব (Day-End Cockpit)</span>
                  </div>
                  <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#059669', padding: '4px 10px', borderRadius: '99px', fontWeight: '800' }}>
                    স্বয়ংক্রিয় গণনা
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700' }}>আজকের মোট বিক্রি</span>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>৳ ১৪,২৫০</div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700' }}>বাকি আদায় (নগদ)</span>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>+ ৳ ৩,৫০০</div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700' }}>দোকান খরচ (চা, বিদ্যুৎ)</span>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>- ৳ ৪২০</div>
                  </div>
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: '#065f46', fontWeight: '800' }}>আজকের নিট লাভ</span>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>৳ ২,৬৫০</div>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>ড্রয়ারে ক্যাশ টাকা থাকা উচিত:</strong>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>সকালের ওপেনিং ক্যাশ সহ সর্বমোট ক্যাশ ইন হ্যান্ড</div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#059669' }}>
                    ৳ ১৭,৩৩০
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 📊 LIVE IMPACT STATS BAR */}
      <section style={{
        background: '#090d16',
        color: '#ffffff',
        padding: '38px 20px',
        borderTop: '1px solid #1e293b',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: '900', color: '#10b981' }}>৫,০০০+</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginTop: '4px' }}>সফল স্থানীয় দোকানদার</div>
          </div>
          <div>
            <div style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: '900', color: '#34d399' }}>৳ ১৫ কোটি+</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginTop: '4px' }}>মাসিক ডিজিটাল লেনদেন</div>
          </div>
          <div>
            <div style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: '900', color: '#10b981' }}>১০০%</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginTop: '4px' }}>নিরবচ্ছিন্ন অফলাইন সুবিধা</div>
          </div>
          <div>
            <div style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: '900', color: '#10b981' }}>৩ গুণ</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700', marginTop: '4px' }}>দ্রুত বকেয়া টাকা আদায়</div>
          </div>
        </div>
      </section>

      {/* 🌟 6 CORE FEATURES SHOWCASE */}
      <section id="features" style={{ padding: '85px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '55px' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '5px 16px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            প্রধান বৈশিষ্ট্যসমূহ
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '900', color: '#0f172a', margin: '14px 0 8px' }}>
            দোকান পরিচালনার জন্য প্রয়োজনীয় সবকিছু এক জায়গায়
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '640px', margin: '0 auto' }}>
            খাতা-কলমের অনিশ্চয়তা বাদ দিয়ে আধুনিক সফটওয়্যারের মাধ্যমে ব্যবসার গতি, ক্যাশ কন্ট্রোল ও লাভ বহুগুণ বাড়িয়ে তুলুন।
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '22px'
        }}>
          {coreFeatures.map((f, i) => (
            <div
              key={i}
              className="feature-box-card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: f.accentColor,
                  background: `${f.accentColor}15`,
                  border: `1px solid ${f.accentColor}35`,
                  padding: '3px 10px',
                  borderRadius: '99px'
                }}>
                  {f.badge}
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800' }}>
                  ০{i + 1}
                </span>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', lineHeight: 1.35 }}>
                {f.title}
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 📲 DEDICATED APP DOWNLOAD & INSTALL SECTION */}
      <section id="install" style={{
        padding: '75px 20px',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #059669 100%)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '36px', alignItems: 'center' }}>
            
            {/* Left Content */}
            <div style={{ textAlign: 'left' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '4px 14px',
                borderRadius: '99px',
                fontSize: '12px',
                fontWeight: '800',
                marginBottom: '16px'
              }}>
                <span>প্লে-স্টোর ছাড়াই সরাসরি ইনস্টলযোগ্য অ্যাপ (PWA)</span>
              </div>

              <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: '900', margin: '0 0 16px', lineHeight: 1.25 }}>
                আপনার ফোনে ShohojHisab অ্যাপ ইনস্টল করুন
              </h2>

              <p style={{ fontSize: '15px', color: '#f1f5f9', lineHeight: 1.65, margin: '0 0 24px' }}>
                কোনো বড় ফাইলের মেগাবাইট খরচ নেই। মাত্র ২ সেকেন্ডে আপনার মোবাইল বা কম্পিউটারের হোমস্ক্রিনে ইনস্টল হয়ে যাবে এবং সাধারণ যেকোনো অ্যাপের মতোই ইন্টারনেট ছাড়াও ১০০% অফলাইনে কাজ করবে।
              </p>

              {/* Install Trigger Action */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={handleInstallAppClick}
                  style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                >
                  এখনই অ্যাপ ইনস্টল করুন
                </button>

                <button
                  type="button"
                  onClick={() => setShowInstallModal(true)}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    padding: '14px 22px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                >
                  ইনস্টল নিয়মাবলি দেখুন
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '12.5px', color: '#cbd5e1' }}>
                <span>✓ মাত্র ২ MB সাইজ</span>
                <span>✓ কোনো আপডেট ঝামেলা নেই</span>
                <span>✓ বিদ্যুৎ/নেট ছাড়াই অফলাইন সাপোর্ট</span>
              </div>
            </div>

            {/* Right: Interactive Device Cards */}
            <div style={{ display: 'grid', gap: '12px' }}>
              <div
                className="device-install-card"
                onClick={() => { setInstallDeviceTab('android'); setShowInstallModal(true); }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: '16px',
                  padding: '18px',
                  cursor: 'pointer'
                }}
              >
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '900' }}>অ্যান্ড্রয়েড ফোন (Android)</h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1' }}>Chrome মেনু থেকে "Install app" বা "Add to Home screen" চাপুন।</p>
              </div>

              <div
                className="device-install-card"
                onClick={() => { setInstallDeviceTab('ios'); setShowInstallModal(true); }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: '16px',
                  padding: '18px',
                  cursor: 'pointer'
                }}
              >
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '900' }}>আইফোন / আইপ্যাড (Apple iOS)</h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1' }}>Safari ব্রাউজারের Share বাটন থেকে "Add to Home Screen" দিন।</p>
              </div>

              <div
                className="device-install-card"
                onClick={() => { setInstallDeviceTab('pc'); setShowInstallModal(true); }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: '16px',
                  padding: '18px',
                  cursor: 'pointer'
                }}
              >
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '900' }}>কম্পিউটার (Windows / Mac)</h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1' }}>Chrome বা Edge ব্রাউজারের অ্যাড্রেস বারের ইনস্টল আইকনে চাপুন।</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ⚖️ COMPARISON MATRIX: OLD VS SHOHOJHISAB */}
      <section id="comparison" style={{ padding: '80px 20px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '45px' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#10b981', background: '#f8fafc', padding: '5px 16px', borderRadius: '99px' }}>
              সরাসরি তুলনা
            </span>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: '900', color: '#0f172a', margin: '12px 0 8px' }}>
              কেন সহজ হিসাব অন্যান্য সফটওয়্যারের চেয়ে সেরা?
            </h2>
            <p style={{ fontSize: '14.5px', color: '#64748b' }}>
              সাধারণ সফটওয়্যার বা কাগজের খাতার তুলনায় সহজ হিসাব ব্যবহারে আপনার দোকানের সময় ও টাকা দুটোই বাঁচবে।
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #cbd5e1',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
          }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr', background: '#090d16', color: '#ffffff', padding: '16px 20px', fontWeight: '900', fontSize: '13.5px' }}>
              <div>সুবিধাসমূহ</div>
              <div style={{ color: '#94a3b8' }}>পুরোনো খাতা / সাধারণ সফটওয়্যার</div>
              <div style={{ color: '#34d399' }}>সহজ হিসাব (ShohojHisab)</div>
            </div>

            {/* Table Rows */}
            {comparisonItems.map((c, i) => (
              <div
                key={i}
                className="compare-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 1.2fr',
                  padding: '16px 20px',
                  borderBottom: i !== comparisonItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                  fontSize: '13px',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontWeight: '800', color: '#0f172a' }}>{c.feature}</div>
                <div style={{ color: '#64748b', fontSize: '12.5px' }}>{c.traditional}</div>
                <div style={{ color: '#059669', fontWeight: '800', fontSize: '13.5px' }}>{c.shohoj}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🏪 MULTI-INDUSTRY ENGINE WITH INTERACTIVE TABS */}
      <section id="industries" style={{ padding: '85px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '5px 16px', borderRadius: '99px' }}>
            সকল ব্যবসার জন্য তৈরি
          </span>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '900', color: '#0f172a', margin: '14px 0 8px' }}>
            আপনার ব্যবসা যে ধরনেরই হোক—সহজ হিসাব আপনার সাথেই আছে
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '640px', margin: '0 auto' }}>
            প্রতিটি ব্যবসার ধরন অনুযায়ী রয়েছে বিশেষায়িত ফাংশন, স্বয়ংক্রিয় একক রূপান্তর ও কাস্টম ক্যাটালগ।
          </p>
        </div>

        {/* Industry Tabs Pills */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '32px'
        }}>
          {industries.map((ind, i) => (
            <button
              key={ind.id}
              type="button"
              className="industry-tab-pill"
              onClick={() => setActiveIndustryTab(i)}
              style={{
                background: activeIndustryTab === i ? '#059669' : '#ffffff',
                color: activeIndustryTab === i ? '#ffffff' : '#334155',
                border: activeIndustryTab === i ? '1.5px solid #059669' : '1.5px solid #cbd5e1',
                padding: '9px 18px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '13.5px',
                cursor: 'pointer',
                boxShadow: activeIndustryTab === i ? '0 4px 14px rgba(5, 150, 105, 0.3)' : '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {ind.name}
            </button>
          ))}
        </div>

        {/* Active Industry Detail Card */}
        {industries[activeIndustryTab] && (
          <div style={{
            background: '#ffffff',
            border: '2px solid #a7f3d0',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.08)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>
                  {industries[activeIndustryTab].name}
                </h3>
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: '800' }}>
                  {industries[activeIndustryTab].tagline}
                </span>

                <div style={{ display: 'grid', gap: '10px', margin: '22px 0' }}>
                  {industries[activeIndustryTab].features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: '#334155' }}>
                      <span style={{ color: '#059669', fontWeight: '900', fontSize: '15px' }}>✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/login?tab=register"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '11px 22px',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#0f172a')}
                >
                  {industries[activeIndustryTab].name}-এর জন্য ফ্রি ট্রায়াল নিন
                </Link>
              </div>

              {/* Sample Quick Inventory Box */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '12px' }}>
                  প্রি-কনফিগার্ড রেডি ক্যাটালগ নমুনা:
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {industries[activeIndustryTab].sampleItems.map((item, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <strong style={{ color: '#0f172a' }}>{item}</strong>
                      <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                        স্টক রেডি
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 💬 REAL SHOPKEEPER TESTIMONIALS */}
      <section style={{ padding: '80px 20px', maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '5px 16px', borderRadius: '99px' }}>
          বাস্তব দোকানদারদের অভিজ্ঞতা
        </span>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: '900', color: '#0f172a', margin: '14px 0 8px' }}>
          বাংলাদেশের ব্যবসায়ীরা কী বলছেন
        </h2>
        <p style={{ fontSize: '14.5px', color: '#64748b', maxWidth: '600px', margin: '0 auto 40px' }}>
          প্রতিদিন হাজারো ব্যবসায়ী সহজ হিসাবের মাধ্যমে তাদের সময় বাঁচাচ্ছেন এবং দোকানে লাভ বাড়াচ্ছেন।
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '22px', textAlign: 'left' }}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="feature-box-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ color: '#10b981', fontSize: '16px', marginBottom: '12px' }}>
                  ★★★★★
                </div>
                <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: '#334155', lineHeight: 1.6, fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '900', color: '#0f172a' }}>{t.name}</h4>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{t.shop} • {t.location}</div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: '800' }}>ভেরিফায়েড দোকানদার</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 💰 PRICING PLANS WITH MONTHLY / YEARLY TOGGLE */}
      <section id="pricing" style={{ padding: '85px 20px', maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '5px 16px', borderRadius: '99px' }}>
          স্বচ্ছ ও সাশ্রয়ী প্যাকেজ
        </span>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '900', color: '#0f172a', margin: '14px 0 8px' }}>
          দোকানের লাভ বাড়ান, কোনো লুকানো খরচ ছাড়াই
        </h2>
        <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '600px', margin: '0 auto 28px' }}>
          কোনো বড় সেটআপ ফি নেই। আপনার সুবিধা অনুযায়ী প্যাকেজ বেছে নিন।
        </p>

        {/* Monthly / Yearly Switcher */}
        <div style={{
          display: 'inline-flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '40px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 20px',
              borderRadius: '9px',
              border: 'none',
              background: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
              color: billingCycle === 'monthly' ? '#0f172a' : '#64748b',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: billingCycle === 'monthly' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            মাসিক বিলিং
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 20px',
              borderRadius: '9px',
              border: 'none',
              background: billingCycle === 'yearly' ? '#059669' : 'transparent',
              color: billingCycle === 'yearly' ? '#ffffff' : '#64748b',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: billingCycle === 'yearly' ? '0 2px 8px rgba(5, 150, 105, 0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>বার্ষিক প্যাকেজ</span>
            <span style={{ fontSize: '10px', background: '#ffffff', color: '#059669', padding: '1px 6px', borderRadius: '99px', fontWeight: '900' }}>
              ২০% ছাড়
            </span>
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          alignItems: 'stretch'
        }}>
          {/* Card 1: Free Trial */}
          <div className="pricing-box-card" style={{
            border: '1.5px solid #e2e8f0',
            padding: '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textAlign: 'left'
          }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '99px' }}>
                কোনো কার্ড লাগবে না
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '10px 0 6px' }}>
                ৭ দিনের ফ্রি ট্রায়াল
              </h3>
              <div style={{ margin: '14px 0 6px' }}>
                <span style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a' }}>৳ ০</span>
                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>/ ৭ দিন সম্পূর্ণ ফ্রি</span>
              </div>
              <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '16px 0' }} />
              <div style={{ display: 'grid', gap: '10px', marginBottom: '24px', fontSize: '13px', color: '#334155' }}>
                <div>✓ সব প্রিমিয়াম ফিচার আনলকড</div>
                <div>✓ আনলিমিটেড POS বিক্রি ও স্লিপ</div>
                <div>✓ ডিজিটাল বাকি খাতা ও কাস্টমার তালিকা</div>
                <div>✓ বাংলা এআই ভয়েস অ্যাসিস্ট্যান্ট</div>
                <div>✓ ১০০% অফলাইন সাপোর্ট</div>
              </div>
            </div>

            <Link
              href="/login?tab=register"
              style={{
                textDecoration: 'none',
                background: '#0f172a',
                color: '#ffffff',
                padding: '13px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '800',
                textAlign: 'center',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0f172a')}
            >
              ফ্রি অ্যাকাউন্ট খুলুন
            </Link>
          </div>

          {/* Card 2: Pro Package (Most Popular) */}
          <div className="pricing-box-card" style={{
            border: '2.5px solid #059669',
            padding: '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textAlign: 'left',
            position: 'relative',
            boxShadow: '0 12px 36px rgba(5, 150, 105, 0.16)'
          }}>
            <div
              className="pulse-glow-badge"
              style={{
                position: 'absolute',
                top: '-13px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#059669',
                color: '#ffffff',
                padding: '4px 16px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '900',
                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.4)'
              }}
            >
              সবচেয়ে জনপ্রিয় প্যাকেজ
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '99px' }}>
                সম্পূর্ণ আনলিমিটেড
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '10px 0 6px' }}>
                প্রো প্যাকেজ (ShohojPro)
              </h3>
              <div style={{ margin: '14px 0 6px' }}>
                <span style={{ fontSize: '36px', fontWeight: '900', color: '#059669' }}>
                  {billingCycle === 'yearly' ? '৳ ১,৩৯৯' : '৳ ১৪৯'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>
                  {billingCycle === 'yearly' ? '/ প্রতি বছর (২ মাস ফ্রি)' : '/ প্রতি মাস'}
                </span>
              </div>
              <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '16px 0' }} />
              <div style={{ display: 'grid', gap: '10px', marginBottom: '24px', fontSize: '13px', color: '#334155' }}>
                <div><strong>✓ সব ফিচার আজীবনের জন্য সক্রিয়</strong></div>
                <div>✓ আনলিমিটেড পণ্য, মেমো ও খাতা</div>
                <div>✓ অটোমেটিক ক্লাউড ব্যাকআপ ভল্ট</div>
                <div>✓ হোয়াটসঅ্যাপে ১-ক্লিক রসিদ ও তাগাদা</div>
                <div>✓ বারকোড স্টিকার প্রিন্ট সুবিধা</div>
                <div>✓ ২৪/৭ ডেডিকেটেড ফোন সাপোর্ট</div>
              </div>
            </div>

            <Link
              href="/login?tab=register"
              style={{
                textDecoration: 'none',
                background: '#059669',
                color: '#ffffff',
                padding: '13px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '900',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
            >
              প্রো প্যাকেজে যুক্ত হন
            </Link>
          </div>

          {/* Card 3: Multi-Shop / Enterprise */}
          <div className="pricing-box-card" style={{
            border: '1.5px solid #e2e8f0',
            padding: '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textAlign: 'left'
          }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#059669', background: '#f1f5f9', padding: '3px 10px', borderRadius: '99px' }}>
                একাধিক শাখা ও বড় ব্যবসা
              </span>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '10px 0 6px' }}>
                মাল্টি-শপ ও এন্টারপ্রাইজ
              </h3>
              <div style={{ margin: '14px 0 6px' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>কাস্টম</span>
                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>/ ব্রাঞ্চ ভিত্তিক</span>
              </div>
              <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '16px 0' }} />
              <div style={{ display: 'grid', gap: '10px', marginBottom: '24px', fontSize: '13px', color: '#334155' }}>
                <div>✓ একাধিক ব্রাঞ্চ সেন্ট্রাল কন্ট্রোল</div>
                <div>✓ আলাদা কর্মচারী পারমিশন ও রোলস</div>
                <div>✓ ওয়্যারহাউস ও মহাজন ডিলার নেটওয়ার্ক</div>
                <div>✓ কাস্টম ডোমেন ও এপিআই কানেকশন</div>
                <div>✓ অন-সাইট সরাসরি সেটআপ সহায়তা</div>
              </div>
            </div>

            <a
              href="tel:01986233234"
              style={{
                textDecoration: 'none',
                background: '#f8fafc',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                padding: '13px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '800',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#059669';
                e.currentTarget.style.color = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#0f172a';
              }}
            >
              কথা বলুন: 01986233234
            </a>
          </div>
        </div>
      </section>

      {/* ❓ FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" style={{ padding: '80px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '45px' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#059669', background: '#ecfdf5', padding: '5px 16px', borderRadius: '99px' }}>
              সাধারণ জিজ্ঞাসা
            </span>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '900', color: '#0f172a', margin: '12px 0 0' }}>
              দোকানদারদের সাধারণ প্রশ্নোত্তর
            </h2>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  background: '#f8fafc',
                  border: activeFaq === i ? '1.5px solid #059669' : '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(prev => prev === i ? null : i)}
                  style={{
                    width: '100%',
                    padding: '18px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '800',
                    color: activeFaq === i ? '#059669' : '#0f172a',
                    transition: 'color 0.15s ease'
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: '16px', color: activeFaq === i ? '#059669' : '#64748b' }}>
                    {activeFaq === i ? '▲' : '▼'}
                  </span>
                </button>
                {activeFaq === i && (
                  <div style={{ padding: '0 20px 20px', fontSize: '14px', color: '#475569', lineHeight: 1.65, borderTop: '1px solid #f1f5f9' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 FINAL CTA BANNER */}
      <section style={{
        padding: '75px 20px',
        background: 'linear-gradient(135deg, #065f46 0%, #059669 60%, #047857 100%)',
        color: '#ffffff',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '5px 16px', borderRadius: '99px', fontWeight: '800' }}>
            আজই আপনার দোকানকে ডিজিটাল করুন
          </span>
          <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 42px)', fontWeight: '900', margin: '16px 0 12px', lineHeight: 1.25 }}>
            খাতা-কলমের হিসাবের দিন শেষ!<br />
            সহজ হিসাব দিয়ে লাভ বাড়ান এখনই
          </h2>
          <p style={{ fontSize: '15px', color: '#d1fae5', margin: '0 auto 32px', maxWidth: '600px', lineHeight: 1.6 }}>
            কোনো জটিলতা নেই, কোনো চুক্তি নেই। আজই সম্পূর্ণ বিনামূল্যে আপনার দোকানের ডিজিটাল খাতা শুরু করুন।
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link
              href="/login?tab=register"
              style={{
                textDecoration: 'none',
                background: '#ffffff',
                color: '#065f46',
                padding: '14px 32px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '16px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              ৭ দিনের ফ্রি ট্রায়াল শুরু করুন
            </Link>

            <button
              type="button"
              onClick={handleInstallAppClick}
              style={{
                background: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.35)',
                padding: '14px 26px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            >
              মোবাইলে অ্যাপ ইনস্টল
            </button>
          </div>
        </div>
      </section>

      {/* 📞 FOOTER */}
      <footer style={{
        background: '#090d16',
        color: '#94a3b8',
        padding: '50px 20px 30px',
        borderTop: '1px solid #1e293b'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '30px',
          marginBottom: '40px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', marginBottom: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#059669', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: '900' }}>
                S
              </div>
              <strong style={{ fontSize: '19px' }}>ShohojHisab</strong>
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6, margin: '0 0 14px' }}>
              বাংলাদেশের সকল স্থানীয় খুচরা ও পাইকারি দোকানের জন্য তৈরি ১০০% নির্ভরযোগ্য ডিজিটাল বিজনেস অপারেটিং সিস্টেম।
            </p>
            <div style={{ fontSize: '12px', color: '#34d399' }}>
              ঢাকা, বাংলাদেশ • সর্বস্বত্ব সংরক্ষিত
            </div>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '800', margin: '0 0 12px' }}>
              প্রয়োজনীয় লিংক
            </h4>
            <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
              <button
                type="button"
                onClick={handleInstallAppClick}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: '#34d399', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
              >
                অ্যাপ ডাউনলোড ও ইনস্টল
              </button>
              <Link href="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>দোকানে লগইন</Link>
              <Link href="/login?tab=register" style={{ color: '#94a3b8', textDecoration: 'none' }}>নতুন দোকান রেজিস্ট্রেশন</Link>
              <Link href="/pos" style={{ color: '#94a3b8', textDecoration: 'none' }}>POS কাউন্টার ডেমো</Link>
              <Link href="/dealer-portal" style={{ color: '#94a3b8', textDecoration: 'none' }}>ডিলার ও মহাজন পোর্টাল</Link>
              <Link href="/login?role=admin" style={{ color: '#94a3b8', textDecoration: 'none' }}>সুপার অ্যাডমিন পোর্টাল</Link>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '800', margin: '0 0 12px' }}>
              যোগাযোগ ও সরাসরি সহায়তা
            </h4>
            <p style={{ fontSize: '13.5px', margin: '0 0 8px', color: '#ffffff' }}>
              সরাসরি কল: <strong>01986233234</strong>
            </p>
            <p style={{ fontSize: '13.5px', margin: '0 0 8px', color: '#34d399' }}>
              WhatsApp: <strong>01986233234</strong>
            </p>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              সকাল ৯টা থেকে রাত ১০টা পর্যন্ত যেকোনো প্রশ্ন বা সফটওয়্যার সেটআপ সহায়তার জন্য যোগাযোগ করুন।
            </p>
          </div>
        </div>

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          paddingTop: '20px',
          borderTop: '1px solid #1e293b',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b'
        }}>
          © ২০২৬ ShohojHisab (সহজ হিসাব)। মেড উইথ লাভ ইন বাংলাদেশ।
        </div>
      </footer>

      {/* 🟢 FLOATING WHATSAPP QUICK BUTTON */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <a
          href="https://wa.me/8801986233234?text=ShohojHisab%20somporke%20jante%20chai"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#25d366',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '99px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: '900',
            boxShadow: '0 6px 18px rgba(37, 211, 102, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
          title="WhatsApp এ সরাসরি কথা বলুন"
        >
          <span>WhatsApp সাহায্য</span>
        </a>
      </div>

      {/* 📲 INTERACTIVE APP INSTALLATION MODAL (Clean Step-by-Step Guide - No Emojis) */}
      {showInstallModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'backdropFadeIn 0.2s ease-out'
        }}>
          <div style={{
            position: 'relative',
            background: '#ffffff',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            padding: '26px 20px',
            boxShadow: '0 25px 60px -10px rgba(15, 23, 42, 0.3)',
            boxSizing: 'border-box',
            textAlign: 'center'
          }}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '15px',
                color: '#64748b',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              ✕
            </button>

            {/* App Branding */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#059669',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '28px',
              fontWeight: '900',
              margin: '0 auto 12px',
              boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35)'
            }}>
              S
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
              ShohojHisab অ্যাপ ইনস্টল করুন
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px', lineHeight: 1.45 }}>
              প্লে-স্টোর ছাড়াই সরাসরি ব্রাউজার থেকে আপনার ফোনে বা কম্পিউটারে হোমস্ক্রিন অ্যাপ হিসেবে সেভ করুন।
            </p>

            {/* Device Selector Tabs */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => setInstallDeviceTab('android')}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: installDeviceTab === 'android' ? '#ffffff' : 'transparent',
                  color: installDeviceTab === 'android' ? '#0f172a' : '#64748b',
                  fontWeight: '800',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: installDeviceTab === 'android' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                অ্যান্ড্রয়েড
              </button>
              <button
                type="button"
                onClick={() => setInstallDeviceTab('ios')}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: installDeviceTab === 'ios' ? '#ffffff' : 'transparent',
                  color: installDeviceTab === 'ios' ? '#0f172a' : '#64748b',
                  fontWeight: '800',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: installDeviceTab === 'ios' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                আইফোন
              </button>
              <button
                type="button"
                onClick={() => setInstallDeviceTab('pc')}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: installDeviceTab === 'pc' ? '#ffffff' : 'transparent',
                  color: installDeviceTab === 'pc' ? '#0f172a' : '#64748b',
                  fontWeight: '800',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  boxShadow: installDeviceTab === 'pc' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                কম্পিউটার
              </button>
            </div>

            {/* TAB 1: ANDROID INSTRUCTIONS */}
            {installDeviceTab === 'android' && (
              <div style={{ textAlign: 'left', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '20px', fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>১</div>
                  <div>ক্রোম ব্রাউজারের উপরে ডান পাশে ৩ ডট মেনু বাটনে চাপ দিন।</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>২</div>
                  <div>মেনু থেকে "Install app" অথবা "Add to Home screen" অপশনে চাপ দিন।</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>৩</div>
                  <div>"Install" বাটনে চাপ দিন—মুহূর্তেই ফোনের স্ক্রিনে অ্যাপ আইকন চলে আসবে!</div>
                </div>
              </div>
            )}

            {/* TAB 2: IOS (IPHONE/IPAD) INSTRUCTIONS */}
            {installDeviceTab === 'ios' && (
              <div style={{ textAlign: 'left', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '20px', fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>১</div>
                  <div>সাফারি (Safari) ব্রাউজারের নিচের মাঝখানে Share বাটনে চাপ দিন।</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>২</div>
                  <div>একটু নিচে স্ক্রোল করে "Add to Home Screen" অপশনটিতে চাপ দিন।</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>৩</div>
                  <div>উপরে ডানে "Add" এ চাপ দিলেই আইফোনের হোম পেজে অ্যাপটি চলে আসবে!</div>
                </div>
              </div>
            )}

            {/* TAB 3: PC / MAC INSTRUCTIONS */}
            {installDeviceTab === 'pc' && (
              <div style={{ textAlign: 'left', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '16px', marginBottom: '20px', fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#be123c', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>১</div>
                  <div>ক্রোম বা এজ ব্রাউজারের অ্যাড্রেস বারের ডানে ইনস্টল আইকন খুঁজুন।</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#be123c', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>২</div>
                  <div>"Install ShohojHisab" বাটনে ক্লিক করুন।</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#be123c', color: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: '900', flexShrink: 0 }}>৩</div>
                  <div>ডেস্কটপে শর্টকাট তৈরি হবে এবং ফুলস্ক্রিন সফটওয়্যার উইন্ডো চালু হয়ে যাবে!</div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  const prompt = (window as any).__pwaInstallPrompt;
                  if (prompt) {
                    prompt.prompt();
                  } else {
                    alert('আপনার ব্রাউজারটি ওপেন করে উপরের ধাপগুলো অনুসরণ করুন।');
                  }
                }}
                style={{
                  flex: 1,
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '10px',
                  fontWeight: '900',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                }}
              >
                এখনই ট্রাই করুন
              </button>

              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                style={{
                  padding: '12px 18px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
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
