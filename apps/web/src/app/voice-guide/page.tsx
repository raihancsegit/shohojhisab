'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

interface VoiceCommandItem {
  id: string;
  category: 'inquiry' | 'sales' | 'due' | 'expense' | 'stock' | 'navigation' | 'tools';
  title: string;
  spokenPhrases: string[];
  actionDescription: string;
  expectedResult: string;
  icon: string;
  badge?: string;
  targetRoute?: string;
}

const COMMAND_GUIDE: VoiceCommandItem[] = [
  // 1. Financial Inquiries & Reports
  {
    id: 'cmd-sales-today',
    category: 'inquiry',
    title: 'আজকের বিক্রি ও লাভের হিসাব জানা',
    spokenPhrases: [
      'আজকে বিক্রি কত?',
      'আজকের বিক্রি ও লাভ কত?',
      'আজকে কত বিক্রি হলো?',
      'আজকে কত লাভ হয়েছে?'
    ],
    actionDescription: 'লাইভ ডেটাবেজ থেকে আজকের মোট মেমোর সংখ্যা, মোট বিক্রয়মূল্য এবং খরচ বাদে খাঁটি নিট লাভ গণনা করে সাউন্ডবক্সে ঘোষণা দেয়।',
    expectedResult: '"আজকে আপনার দোকানে মোট ৫টি মেমোতে ৳৪,২০০ টাকার বিক্রি হয়েছে এবং নিট লাভ ৳৭৫০ টাকা।"',
    icon: '📊',
    badge: 'জনপ্রিয়',
    targetRoute: '/reports'
  },
  {
    id: 'cmd-expense-today',
    category: 'inquiry',
    title: 'আজকের মোট খরচের হিসাব জানা',
    spokenPhrases: [
      'আজকের খরচ কত?',
      'আজকে কত খরচ হলো?',
      'আজকে কত টাকা খরচ হয়েছে?'
    ],
    actionDescription: 'আজকের দিনে সংরক্ষিত সকল চা-নাস্তা, দোকান ভাড়া, বিল ও বিবিধ খরচের মোট পরিমাণ ও খাতভিত্তিক তালিকা জানায়।',
    expectedResult: '"আজকে আপনার দোকানে মোট ৩টি খাতে ৳১২০ টাকা খরচ হয়েছে।"',
    icon: '💸',
    targetRoute: '/expenses'
  },
  {
    id: 'cmd-market-due',
    category: 'inquiry',
    title: 'মার্কেট বা কাস্টমারদের মোট বাকি জানা',
    spokenPhrases: [
      'মার্কেট বাকি কত?',
      'মোট বাকি কত?',
      'কাস্টমারদের কাছে কত বাকি?',
      'দোকানের মোট কত বাকি আছে?'
    ],
    actionDescription: 'দোকানের মোট কতজন দেনাদার কাস্টমারের কাছে সর্বমোট কত টাকা বকেয়া বাকি আছে তা তাৎক্ষণিক হিসাব করে শোনায়।',
    expectedResult: '"মার্কেটে মোট ৮ জন কাস্টমারের কাছে আপনার মোট বকেয়া পাওনা ৳১৮,৫০০ টাকা।"',
    icon: '📖',
    badge: 'জরুরি',
    targetRoute: '/khata'
  },
  {
    id: 'cmd-cash-drawer',
    category: 'inquiry',
    title: 'ক্যাশ ড্রয়ারের নগদ টাকা জানা',
    spokenPhrases: [
      'ড্রয়ারে কত ক্যাশ আছে?',
      'ক্যাশ ব্যালেন্স কত?',
      'নগদ কত টাকা আছে?',
      'ক্যাশ কত?'
    ],
    actionDescription: 'মোট নগদ বিক্রি ও বাকি আদায়ের টাকা থেকে খরচ বাদ দিয়ে বর্তমানে ক্যাশ বাক্সে কত টাকা নগদ জমা থাকার কথা তা জানায়।',
    expectedResult: '"বর্তমানে আপনার দোকানে নগদ ক্যাশ জমা আছে ৳৩,৯৮০ টাকা।"',
    icon: '💵',
    targetRoute: '/day-end'
  },
  {
    id: 'cmd-day-brief',
    category: 'inquiry',
    title: 'সারাদিনের সার্বিক হিসাব ও ব্রিফিং',
    spokenPhrases: [
      'আজকের হিসাব বলো',
      'সারাদিনের হিসাব বলো',
      'দোকানের অবস্থা কেমন?',
      'আজকের সার্বিক হিসাব বলো'
    ],
    actionDescription: 'বিক্রি, লাভ, খরচ, বাকি এবং ক্যাশ ব্যালেন্সের একটি পূর্ণাঙ্গ অডিও সারসংক্ষেপ প্রদান করে।',
    expectedResult: '"আজকের সারসংক্ষেপ: মোট বিক্রি ৳৪,২০০ টাকা, খরচ ৳১২০ টাকা, নিট লাভ ৳৭৫০ টাকা এবং মার্কেট বাকি ৳১৮,৫০০ টাকা।"',
    icon: '🏪',
    badge: 'পূর্ণাঙ্গ',
    targetRoute: '/'
  },
  {
    id: 'cmd-customer-due-query',
    category: 'inquiry',
    title: 'নির্দিষ্ট কাস্টমারের বাকি হিসাব জানা',
    spokenPhrases: [
      'রহিম ভাই কত পাবে?',
      'কালামের বাকি কত?',
      'রিয়ান ভাইয়ের কত বাকি আছে?'
    ],
    actionDescription: 'উক্ত কাস্টমারের বর্তমান বকেয়া খতিয়ান খুঁজে বের করে মুখে উত্তর দেয় এবং ওনার খাতার লিংক স্ক্রিনে প্রদর্শন করে।',
    expectedResult: '"রহিম ভাই এর দোকানে বর্তমান বকেয়া বাকি ৳৮২০ টাকা।"',
    icon: '👤',
    targetRoute: '/khata'
  },

  // 2. Sales & POS
  {
    id: 'cmd-cash-sale',
    category: 'sales',
    title: 'নগদ বিক্রি ও মেমো তৈরি',
    spokenPhrases: [
      'নাপা ২ পাতা বিক্রি',
      'চিনি ১ কেজি বিক্রি হলো',
      'ম্যাগি নুডুলস ২ প্যাকেট নগদ বিক্রি',
      'প্যারাসিটামল ১০ পিস এবং চিনি ২ কেজি বিক্রি'
    ],
    actionDescription: 'স্বয়ংক্রিয়ভাবে পণ্য সনাক্ত করে, মেমো তৈরি করে এবং গুদাম থেকে পণ্যের স্টক তাৎক্ষণিকভাবে কমিয়ে দেয়।',
    expectedResult: '"✓ নাপা ২ পাতা মোট ৳৪০ টাকা নগদ বিক্রি সফল হয়েছে। স্টক আপডেট করা হয়েছে।"',
    icon: '🛒',
    badge: 'মেমো',
    targetRoute: '/pos'
  },
  {
    id: 'cmd-credit-sale',
    category: 'sales',
    title: 'পণ্য দিয়ে বাকিতে বিক্রি লেখা',
    spokenPhrases: [
      'রহিম ভাই ২ পাতা নাপা বাকি নিল',
      'কালাম ১ কেজি চিনি বাকিতে নিল',
      'স্বপন ভাই ২ প্যাকেট বিস্কুট বাকি'
    ],
    actionDescription: 'একসাথে কাস্টমারের বাকি খাতায় টাকার অঙ্ক যোগ করে এবং একই সাথে গুদাম থেকে পণ্যটির স্টক কেটে নেয়।',
    expectedResult: '"✓ রহিম ভাই-এর বাকি খাতায় ৳৪০ টাকা (নাপা ২ পাতা) যোগ হয়েছে এবং গুদাম স্টক আপডেট সম্পন্ন হয়েছে।"',
    icon: '🧾',
    targetRoute: '/khata'
  },

  // 3. Customer Due & Ledger
  {
    id: 'cmd-due-add',
    category: 'due',
    title: 'কাস্টমারের বাকি খাতায় টাকা যোগ করা',
    spokenPhrases: [
      'রহিম ভাই ৫০০ টাকা বাকি লেখো',
      'কালাম ২০০ টাকা বাকি নিল',
      'রিয়ান ভাইয়ের আরো ২০ টাকা বাকি যোগ হবে',
      'স্বপন ভাই ১০০ টাকা বাকি'
    ],
    actionDescription: 'কাস্টমারের খাতা খুঁজে বের করে নতুন বকেয়া যোগ করে। ক্রেডিট লিমিট অতিক্রম করলে সাথে সাথে সতর্কবার্তা শোনায়।',
    expectedResult: '"✓ রহিম ভাই এর বাকি খাতায় ৳৫০০ টাকা যোগ করা হয়েছে। বর্তমান মোট বকেয়া ৳১,৩২০ টাকা।"',
    icon: '📒',
    badge: 'ক্রেডিট অ্যালার্ট',
    targetRoute: '/khata'
  },
  {
    id: 'cmd-due-collection',
    category: 'due',
    title: 'কাস্টমারের বকেয়া টাকা আদায় / জমা নেওয়া',
    spokenPhrases: [
      'রহিম ভাই ২০০ টাকা জমা দিল',
      'কালাম ৫০০ টাকা বাকি শোধ করল',
      'রিয়ান ৫০ টাকা দিল'
    ],
    actionDescription: 'কাস্টমারের বকেয়া থেকে উক্ত টাকা কমিয়ে দেয় এবং দোকানের ক্যাশ কালেকশনে নগদ জমা হিসেবে রেকর্ড করে।',
    expectedResult: '"আলহামদুলিল্লাহ! রহিম ভাই এর বাকি থেকে ৳২০০ টাকা জমা নেওয়া হয়েছে। বর্তমান অবশিষ্ট বকেয়া ৳১,১২০ টাকা।"',
    icon: '💵',
    badge: 'কালেকশন',
    targetRoute: '/khata'
  },

  // 4. Expenses & Spending
  {
    id: 'cmd-expense-add',
    category: 'expense',
    title: 'দৈনিক দোকান খরচ ও বিল লেখা',
    spokenPhrases: [
      'চা নাস্তা ৬০ টাকা খরচ',
      'দোকান ভাড়া ৫০০০ টাকা খরচ লেখো',
      'বিদ্যুৎ বিল ১২০০ টাকা খরচ',
      'কুলি খরচ ১০০ টাকা'
    ],
    actionDescription: 'স্বয়ংক্রিয়ভাবে খরচের খাত (আপ্যায়ন, ভাড়া, বিদ্যুৎ বিল, যাতায়াত) সনাক্ত করে আজকের খরচের খাতায় সেভ করে।',
    expectedResult: '"✓ চা নাস্তা ৳৬০ টাকা খরচ খাতায় সংরক্ষণ করা হয়েছে।"',
    icon: '☕',
    targetRoute: '/expenses'
  },

  // 5. Stock & Inventory
  {
    id: 'cmd-stock-query-product',
    category: 'stock',
    title: 'নির্দিষ্ট পণ্যের বর্তমান স্টক ও রেট জানা',
    spokenPhrases: [
      'নাপা কত পাতা আছে?',
      'চিনি কত কেজি আছে?',
      'সেকলো ক্যাপসুল আছে কিনা?',
      'সয়াবিন তেলের স্টক কত?'
    ],
    actionDescription: 'দোকানের গুদামে পণ্যটি কতটুকু মজুদ আছে, বিক্রয় দর কত এবং সর্বশেষ কবে রিস্টক হয়েছিল তা পুঙ্খানুপুঙ্খ জানায়।',
    expectedResult: '"নাপা বর্তমানে ৪৫ পাতা মজুদ আছে। সর্বশেষ ১২ সেপ্টেম্বর রিস্টক হয়েছিল। বিক্রয়মূল্য ৳২০ টাকা।"',
    icon: '📦',
    targetRoute: '/stock'
  },
  {
    id: 'cmd-low-stock-alert',
    category: 'stock',
    title: 'কম বা শেষ স্টকের পণ্য তালিকা জানা',
    spokenPhrases: [
      'কোন কোন মালের স্টক শেষ?',
      'কোন পণ্য কম আছে?',
      'স্টক শেষ কোনগুলোর?',
      'মালের ঘাটতি কী কী?'
    ],
    actionDescription: 'যেসব পণ্যের স্টক ফুরিয়ে গেছে বা সতর্কতার নিচে নেমে গেছে তাদের তালিকা অডিওতে বলে এবং স্ক্রিনে অর্ডার লিস্ট দেয়।',
    expectedResult: '"আপনার দোকানে ৩টি পণ্যের স্টক কম বা শেষ। যেমন: চিনি ২ কেজি, রূপচাঁদা তেল ১ বোতল। দ্রুত রিস্টক করুন।"',
    icon: '⚠️',
    badge: 'অ্যালার্ট',
    targetRoute: '/stock'
  },
  {
    id: 'cmd-stock-add-voice',
    category: 'stock',
    title: 'মুখে বলে নতুন চালান বা স্টক বাড়ানো',
    spokenPhrases: [
      'নাপা ৫০ পাতা আসছে কেনা দাম ২৫ টাকা',
      'চিনি ২ বস্তা ঢুকলো',
      'প্যারাসিটামল ১০০ পিস স্টক বাড়াও'
    ],
    actionDescription: 'পণ্যটির বর্তমান স্টক বাড়িয়ে দেয় এবং কেনা দর উল্লেখ থাকলে নতুন ক্রয়মূল্য আপডেট করে স্টক লেজারে এন্ট্রি করে।',
    expectedResult: '"✓ নাপা (+৫০ পাতা @ ৳২৫) সফলভাবে স্টক যোগ করা হয়েছে।"',
    icon: '➕',
    badge: 'রিস্টক',
    targetRoute: '/stock'
  },

  // 6. Navigation
  {
    id: 'cmd-nav-pos',
    category: 'navigation',
    title: 'ক্যাশ কাউন্টার / বিক্রি পেজে যাওয়া',
    spokenPhrases: ['মেমো পেজে যাও', 'কাউন্টারে চলো', 'নতুন মেমো কাটো', 'বিক্রি পেজে চলো'],
    actionDescription: 'সরাসরি দ্রুত বিক্রয় কাউন্টারে নিয়ে যায়।',
    expectedResult: '"ক্যাশ কাউন্টারে এসেছি। নতুন বিক্রি ও মেমো কাটার জন্য প্রস্তুত।"',
    icon: '🛒',
    targetRoute: '/pos'
  },
  {
    id: 'cmd-nav-khata',
    category: 'navigation',
    title: 'বাকির খাতা ও দেনাদার তালিকায় যাওয়া',
    spokenPhrases: ['বাকির খাতায় যাও', 'খাতায় চলো', 'দেনাদার তালিকা দেখাও'],
    actionDescription: 'বাকির খাতা পেজে নিয়ে যায় এবং মোট বকেয়া টাকার ঘোষণা দেয়।',
    expectedResult: '"বাকির খাতায় এসেছি। বর্তমানে মোট ৮ জন কাস্টমারের কাছে বকেয়া রয়েছে।"',
    icon: '📒',
    targetRoute: '/khata'
  },
  {
    id: 'cmd-nav-stock',
    category: 'navigation',
    title: 'স্টক ও গুদাম ইনভেন্টরি পেজে যাওয়া',
    spokenPhrases: ['স্টক পেজে যাও', 'গুদাম দেখাও', 'মালের খাতা খোলো'],
    actionDescription: 'স্টক তালিকায় নিয়ে যায় এবং মোট পণ্যের মজুদ মূল্যের তথ্য দেয়।',
    expectedResult: '"স্টক পেজে এসেছি। আপনার দোকানে মোট ৮৫টি পণ্য আছে।"',
    icon: '📦',
    targetRoute: '/stock'
  },
  {
    id: 'cmd-nav-dayend',
    category: 'navigation',
    title: 'দিন শেষ / ক্যাশ ক্লোজিং পেজে যাওয়া',
    spokenPhrases: ['দিন শেষ পেজে চলো', 'ক্যাশ ক্লোজিংয়ে যাও', 'হিসাব বন্ধ পেজে চলো'],
    actionDescription: 'সারাদিনের নগদ টাকা মিলিয়ে দিন সমাপ্ত করার পেজে নিয়ে যায়।',
    expectedResult: '"আজকের দিন শেষ ও ক্যাশ ক্লোজিং পেজে এসেছি। নগদ টাকা মিলিয়ে হিসাব ক্লোজ করুন।"',
    icon: '🌙',
    targetRoute: '/day-end'
  },

  // 7. Advanced Tools
  {
    id: 'cmd-tool-undo',
    category: 'tools',
    title: 'ভুল হলে মুখে বলে সাথে সাথে বাতিল (Undo)',
    spokenPhrases: [
      'আগেরটা ভুল হয়েছে কাটো',
      'আনডু করো',
      'বাতিল করো',
      'আগের হিসাবটা মোছো'
    ],
    actionDescription: 'সর্বশেষ ২ মিনিটের মধ্যে করা যেকোনো ভুল বিক্রি, ভুল বাকি বা ভুল খরচ সাথে সাথে ডাটাবেজ থেকে রিলিজ করে পূর্বের হিসাব ফিরিয়ে আনে।',
    expectedResult: '"✓ পূর্ববর্তী এন্ট্রিটি বাতিল করা হয়েছে এবং পণ্যের স্টক পূর্বাবস্থায় ফিরিয়ে আনা হয়েছে।"',
    icon: '↩️',
    badge: 'সুপার পাওয়ার'
  },
  {
    id: 'cmd-tool-whatsapp',
    category: 'tools',
    title: 'ভয়েসে হোয়াটসঅ্যাপে রসিদ ও তাগাদা পাঠানো',
    spokenPhrases: [
      'রহিম ভাইকে হোয়াটসঅ্যাপে তাগাদা পাঠাও',
      'কাস্টমারকে রসিদ পাঠাও',
      'হোয়াটসঅ্যাপে মেসেজ পাঠাও'
    ],
    actionDescription: 'কাস্টমারের নম্বরে দোকানের নাম, বকেয়া টাকার পরিমাণ ও পেমেন্ট লিঙ্ক সহ সুন্দর বাংলা ফরম্যাট করা হোয়াটসঅ্যাপ মেসেজ প্রস্তুত করে।',
    expectedResult: '"রহিম ভাই-কে হোয়াটসঅ্যাপে ৳৮২০ টাকার তাগাদা মেসেজ পাঠানোর লিংক তৈরি করা হয়েছে।"',
    icon: '📲',
    badge: 'ডিজিটাল স্লিপ',
    targetRoute: '/khata'
  },
  {
    id: 'cmd-tool-print',
    category: 'tools',
    title: 'ভয়েসে থার্মাল প্রিন্ট ও ক্যাশ ড্রয়ার ওপেন',
    spokenPhrases: [
      'মেমো প্রিন্ট করো',
      'বিল বের করো',
      'রসিদ প্রিন্ট করো',
      'ক্যাশ ড্রয়ার খোলো'
    ],
    actionDescription: 'স্ক্রিনে কোনো ক্লিক ছাড়াই সরাসরি থার্মাল প্রিন্টারে মেমো প্রিন্ট পাঠায় ও ড্রয়ার খোলার কমান্ড দেয়।',
    expectedResult: '"থার্মাল প্রিন্টারে মেমো প্রিন্ট ও ক্যাশ ড্রয়ার ওপেন করার নির্দেশ পাঠানো হয়েছে।"',
    icon: '🖨️',
    badge: 'থার্মাল প্রিন্ট'
  },
  {
    id: 'cmd-tool-review',
    category: 'tools',
    title: 'দৈনিক এআই বিজনেস অডিও পর্যালোচনা',
    spokenPhrases: [
      'আজকের বিজনেসের পর্যালোচনা বলো',
      'ব্যবসার রিভিউ দাও',
      'আজকের সারসংক্ষেপ কেমন?'
    ],
    actionDescription: 'দোকান বন্ধ করার সময় এআই সহকারী সারাদিনের বিক্রি, লাভ মার্জিন %, টপ সেলিং প্রোডাক্ট ও ব্যবসায়িক পরামর্শ অডিওতে পড়ে শোনায়।',
    expectedResult: '"আজকের ব্যবসায়িক পর্যালোচনা: সারাদিনে ৳১২,৪৫০ টাকা বিক্রি হয়েছে এবং নিট লাভ হয়েছে ৳২,১০০ টাকা (মার্জিন ১৭%)। মাশাল্লাহ! আজ বিক্রি ও লাভের মার্জিন চমৎকার ছিল।"',
    icon: '🎙️',
    badge: 'এআই পডকাস্ট',
    targetRoute: '/reports'
  }
];

export default function VoiceGuidePage() {
  const router = useRouter();
  const { tenant, speakAnnouncement, triggerHaptic } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: '🌟 সকল কমান্ড', count: COMMAND_GUIDE.length },
    { id: 'inquiry', label: '📊 হিসাব ও প্রশ্ন', count: COMMAND_GUIDE.filter(c => c.category === 'inquiry').length },
    { id: 'sales', label: '🛒 বিক্রি ও মেমো', count: COMMAND_GUIDE.filter(c => c.category === 'sales').length },
    { id: 'due', label: '📒 বাকি ও কালেকশন', count: COMMAND_GUIDE.filter(c => c.category === 'due').length },
    { id: 'expense', label: '💸 খরচ ও ব্যয়', count: COMMAND_GUIDE.filter(c => c.category === 'expense').length },
    { id: 'stock', label: '📦 স্টক ও মালামাল', count: COMMAND_GUIDE.filter(c => c.category === 'stock').length },
    { id: 'navigation', label: '🧭 পেজে যাওয়া', count: COMMAND_GUIDE.filter(c => c.category === 'navigation').length },
    { id: 'tools', label: '⚡ স্পেশাল টুলস (আনডু/প্রিন্ট)', count: COMMAND_GUIDE.filter(c => c.category === 'tools').length }
  ];

  const filteredCommands = COMMAND_GUIDE.filter(cmd => {
    const matchCat = selectedCategory === 'all' || cmd.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      cmd.title.toLowerCase().includes(q) ||
      cmd.actionDescription.toLowerCase().includes(q) ||
      cmd.spokenPhrases.some(p => p.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleCopy = (phrase: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(phrase);
      setCopiedId(id);
      if (triggerHaptic) triggerHaptic('light');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleTestVoice = async (cmd: VoiceCommandItem) => {
    setTestingId(cmd.id);
    if (triggerHaptic) triggerHaptic('medium');

    try {
      const testPhrase = cmd.spokenPhrases[0];
      const res = await fetch('/api/ai-assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant?.id || 'tenant-1',
          query: testPhrase
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.speech && speakAnnouncement) {
          speakAnnouncement(data.speech, undefined, true);
        }
        if (data.navigateTo) {
          setTimeout(() => {
            router.push(data.navigateTo);
          }, 1800);
        }
      }
    } catch (e) {
      console.error('Test voice query error', e);
    } finally {
      setTimeout(() => setTestingId(null), 1200);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 80px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '28px 24px',
        marginBottom: '24px',
        boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '650px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#a5b4fc',
            marginBottom: '12px'
          }}>
            <span>🎙️</span> সম্পূর্ণ ভয়েস নির্দেশিকা ও কমান্ড ডিরেক্টরি
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 10px', lineHeight: 1.3 }}>
            কী দেখতে বা করতে হলে <span style={{ color: '#38bdf8' }}>মুখে কী বলবেন?</span>
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', lineHeight: 1.5 }}>
            আপনার দোকানের ডিজিটাল হিসাব সহকারী সম্পূর্ণ বাংলা আঞ্চলিক কথ্য ভাষা বুঝতে পারে। নিচে দেওয়া নির্দেশিকা অনুযায়ী সরাসরি মুখে কথা বলুন।
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          minWidth: '200px'
        }}>
          <span style={{ fontSize: '32px', marginBottom: '4px' }}>⚡</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>১০০% ইনস্ট্যান্ট অ্যাকশন</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>কোনো টাইপিংয়ের দরকার নেই</span>
        </div>
      </div>

      {/* Best Practice Tips Box */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>💡</span> নিখুঁত ভয়েস ব্যবহারের সেরা ৫টি নিয়ম:
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px',
          fontSize: '13px',
          color: '#475569',
          lineHeight: 1.5
        }}>
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
            <strong style={{ color: '#0f172a' }}>১. স্বাভাবিক দূরত্ব:</strong> ফোনটি মুখ থেকে ২০-৩০ সেমি (১ হাত) দূরে রেখে স্বাভাবিক স্পষ্ট গলায় কথা বলুন।
          </div>
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
            <strong style={{ color: '#0f172a' }}>২. নাম ও পরিমাণ একসাথে:</strong> কাস্টমারের নাম এবং টাকার অঙ্ক একসাথে বলুন (যেমন: <em>"রহিম ভাই ৫০০ টাকা বাকি"</em> )।
          </div>
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
            <strong style={{ color: '#0f172a' }}>৩. আঞ্চলিক একক সমর্থন:</strong> <em>দেড়শো, আড়াই কেজি, এক পোয়া, পাতা, হালি, বস্তা</em> সবই স্বয়ংক্রিয়ভাবে গাণিতিক সংখ্যায় হিসাব হবে।
          </div>
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
            <strong style={{ color: '#0f172a' }}>৪. ভুল হলে আনডু:</strong> ভুল তথ্য বলে ফেললে সাথে সাথে বলুন: <em>"আগেরটা ভুল হয়েছে কাটো"</em> বা <em>"আনডু করো"</em>।
          </div>
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #edf2f7' }}>
            <strong style={{ color: '#0f172a' }}>৫. ক্যাশ ড্রয়ার ও প্রিন্ট:</strong> রসিদ বের করতে শুধু মুখে বলুন: <em>"মেমো প্রিন্ট করো"</em>।
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 কী করতে বা জানতে চান লিখে খুঁজুন (যেমন: বিক্রি, বাকি, খরচ, লাভ, আনডু, প্রিন্ট)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: '14px',
              border: '2px solid #cbd5e1',
              fontSize: '15px',
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#64748b'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '8px 16px',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#4338ca' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label} ({cat.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Commands Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {filteredCommands.map(cmd => (
          <div
            key={cmd.id}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {cmd.icon}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                      {cmd.title}
                    </h4>
                  </div>
                </div>
                {cmd.badge && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: cmd.badge === 'জরুরি' || cmd.badge === 'অ্যালার্ট' ? '#fef2f2' : '#f0fdf4',
                    color: cmd.badge === 'জরুরি' || cmd.badge === 'অ্যালার্ট' ? '#dc2626' : '#16a34a',
                    border: `1px solid ${cmd.badge === 'জরুরি' || cmd.badge === 'অ্যালার্ট' ? '#fecaca' : '#bbf7d0'}`
                  }}>
                    {cmd.badge}
                  </span>
                )}
              </div>

              {/* What to Say (Spoken Phrases) */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  🗣️ মুখে কী বলবেন:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cmd.spokenPhrases.map((phrase, pIdx) => (
                    <div
                      key={pIdx}
                      style={{
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <span>"{phrase}"</span>
                      <button
                        onClick={() => handleCopy(phrase, `${cmd.id}-${pIdx}`)}
                        title="কপি করুন"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: copiedId === `${cmd.id}-${pIdx}` ? '#16a34a' : '#94a3b8',
                          padding: '2px 4px'
                        }}
                      >
                        {copiedId === `${cmd.id}-${pIdx}` ? '✓ কপিড' : '📋'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* How it works */}
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', lineHeight: 1.5 }}>
                <strong style={{ color: '#334155' }}>কী ঘটবে:</strong> {cmd.actionDescription}
              </div>

              {/* Expected Result */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #dcfce7',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#166534',
                marginBottom: '16px',
                lineHeight: 1.4
              }}>
                <strong>🔊 সহকারী উত্তর দেবে:</strong><br />
                <em>{cmd.expectedResult}</em>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => handleTestVoice(cmd)}
                disabled={testingId === cmd.id}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: testingId === cmd.id ? '#cbd5e1' : '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: testingId === cmd.id ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>{testingId === cmd.id ? '⏳ প্রসেস হচ্ছে...' : '🎙️ টেস্ট করুন'}</span>
              </button>

              {cmd.targetRoute && (
                <Link
                  href={cmd.targetRoute}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  পেজে যান →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCommands.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🔍</span>
          <h3 style={{ fontSize: '18px', color: '#1e293b', margin: '0 0 6px' }}>কোনো কমান্ডের মিল পাওয়া যায়নি</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>অন্য শব্দ দিয়ে অনুসন্ধান করুন অথবা সকল ক্যাটাগরি ফিল্টার সিলেক্ট করুন।</p>
        </div>
      )}
    </div>
  );
}
