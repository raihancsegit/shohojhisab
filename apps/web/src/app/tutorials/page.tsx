'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TutorialItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  icon: string;
  color: string;
  steps: string[];
  videoUrl?: string;
}

const TUTORIALS: TutorialItem[] = [
  {
    id: 'tut-1',
    title: 'সহজহিসাব অ্যাপে পণ্য অ্যাড করবেন কীভাবে?',
    category: 'পণ্য ও স্টক',
    duration: '১ মিনিট ২০ সেকেন্ড',
    icon: '📦',
    color: '#4f46e5',
    steps: [
      '১. অ্যাপের মূল মেনু থেকে "পণ্য" অপশনে ট্যাপ করুন।',
      '২. উপরে ডানপাশের "+ নতুন পণ্য" বাটনে ক্লিক করুন।',
      '৩. পণ্যের নাম, ক্যাটাগরি, কেনা দাম, বিক্রয় মূল্য এবং প্রাথমিক স্টক লিখুন।',
      '৪. "সংরক্ষণ করুন" বাটনে চাপলে পণ্যটি সফলভাবে তালিকায় যুক্ত হয়ে যাবে।'
    ]
  },
  {
    id: 'tut-2',
    title: 'সহজহিসাব অ্যাপে পার্টি বা কাস্টমার অ্যাড করবেন কীভাবে?',
    category: 'বাকি খাতা ও পার্টি',
    duration: '১ মিনিট ৪৫ সেকেন্ড',
    icon: '👥',
    color: '#059669',
    steps: [
      '১. "খাতা" বা "পার্টি" ট্যাবে প্রবেশ করুন।',
      '২. "+ নতুন কাস্টমার / বাকিদার" বাটনে ট্যাপ করুন।',
      '৩. গ্রাহকের নাম, মোবাইল নাম্বার এবং ঠিকানা লিখুন।',
      '৪. পূর্বের কোনো বকেয়া থাকলে তা লিখুন এবং "সেভ করুন" এ চাপুন।'
    ]
  },
  {
    id: 'tut-3',
    title: 'সহজহিসাব-এ লেনদেনের তথ্য আপডেট বা ডিলিট করবেন কীভাবে?',
    category: 'লেনদেন ও বিক্রয়',
    duration: '২ মিনিট ১০ সেকেন্ড',
    icon: '📝',
    color: '#d97706',
    steps: [
      '১. মূল ড্যাশবোর্ড থেকে "রিপোর্ট" বা "বিক্রয় তালিকা" ওপেন করুন।',
      '২. নির্দিষ্ট মেমো বা ইনভয়েসের ওপর ক্লিক করুন।',
      '৩. এডিট অপশনে চাপ দিয়ে টাকার পরিমাণ বা পণ্যের সংখ্যা পরিবর্তন করুন।',
      '৪. মেমো ডিলিট করতে চাইলে "ডিলিট করুন" বাটনে চাপ দিয়ে পিন দিয়ে নিশ্চিত করুন।'
    ]
  },
  {
    id: 'tut-4',
    title: 'সহজহিসাব-এ অ্যাকাউন্ট ও পিন রিসেট করবেন কীভাবে?',
    category: 'নিরাপত্তা',
    duration: '১ মিনিট ১০ সেকেন্ড',
    icon: '🔑',
    color: '#dc2626',
    steps: [
      '১. "সেটিংস" মেনু থেকে "সাধারণ" সেটিংসে যান।',
      '২. "গোপন পিন পরিবর্তন" অপশনে ট্যাপ করুন।',
      '৩. বর্তমান পিন এবং নতুন ৪-ডিজিটের পিন দুইবার লিখে সংরক্ষণ করুন।'
    ]
  },
  {
    id: 'tut-5',
    title: 'সহজহিসাব-এর প্যাকেজ বা সাবস্ক্রিপশন কিনবেন কীভাবে?',
    category: 'বিলিং',
    duration: '২ মিনিট',
    icon: '💳',
    color: '#7c3aed',
    steps: [
      '১. মূল মেনু থেকে "সাবস্ক্রিপশন" বাটনে চাপুন।',
      '২. আপনার পছন্দের প্যাকেজ (মাসিক / বাৎসরিক) সিলেক্ট করুন।',
      '৩. বিকাশ বা নগদ সিলেক্ট করে পেমেন্ট করুন এবং ট্রানজেকশন আইডি দিয়ে সক্রিয় করুন।'
    ]
  },
  {
    id: 'tut-6',
    title: 'সহজহিসাব অ্যাপ থেকে এসএমএস বা মেসেজ কিনবেন কীভাবে?',
    category: 'এসএমএস মার্কেটিং',
    duration: '১ মিনিট ৩০ সেকেন্ড',
    icon: '💬',
    color: '#0284c7',
    steps: [
      '১. "মার্কেটিং ও এসএমএস" মেনুতে যান।',
      '২. "এসএমএস ব্যালেন্স রিচার্জ" বাটনে ক্লিক করুন।',
      '৩. এসএমএস বান্ডেল সিলেক্ট করে বিকাশ/নগদের মাধ্যমে পেমেন্ট সম্পন্ন করুন।'
    ]
  },
  {
    id: 'tut-7',
    title: 'সহজহিসাব-এ প্রোডাক্ট বা পণ্যের ক্যাটাগরি আপডেট করবেন কীভাবে?',
    category: 'পণ্য',
    duration: '১ মিনিট ১৫ সেকেন্ড',
    icon: '🏷️',
    color: '#0d9488',
    steps: [
      '১. "পণ্য" পেজে গিয়ে উপরে ক্যাটাগরি ফিল্টারে ট্যাপ করুন।',
      '২. "ক্যাটাগরি ম্যানেজমেন্ট" থেকে যেকোনো ক্যাটাগরি এডিট বা নতুন ক্যাটাগরি যোগ করুন।'
    ]
  },
  {
    id: 'tut-8',
    title: 'সহজহিসাব-এ ব্যয় বা খরচের ক্যাটাগরি আপডেট করবেন কীভাবে?',
    category: 'দৈনিক খরচ',
    duration: '১ মিনিট ২০ সেকেন্ড',
    icon: '💸',
    color: '#ea580c',
    steps: [
      '১. "খরচ খাতা" (Expenses) ট্যাবে ক্লিক করুন।',
      '২. "+ খরচ যোগ করুন" এ গিয়ে ক্যাটাগরি সিলেক্ট করুন (যেমন: দোকান ভাড়া, বিদ্যুৎ বিল, কর্মচারীর বেতন)।',
      '৩. প্রয়োজনে নতুন কাস্টম খরচের খাত তৈরি করুন।'
    ]
  },
  {
    id: 'tut-9',
    title: 'সহজহিসাব-এ পণ্যের স্টক আপডেট বা বৃদ্ধি করবেন কীভাবে?',
    category: 'স্টক ম্যানেজমেন্ট',
    duration: '১ মিনিট ৫০ সেকেন্ড',
    icon: '📊',
    color: '#16a34a',
    steps: [
      '১. "স্টক" মেনুতে প্রবেশ করুন।',
      '২. যে পণ্যের স্টক বাড়াতে চান তার পাশের "+ স্টক যোগ" বাটনে চাপুন।',
      '৩. কত পিস বা কেজি স্টক ঢুকলো তা লিখে "আপডেট" চাপুন।'
    ]
  },
  {
    id: 'tut-10',
    title: 'ব্লুটুথ থার্মাল প্রিন্টারে রসিদ প্রিন্ট করবেন কীভাবে?',
    category: 'হার্ডওয়্যার ও প্রিন্টিং',
    duration: '২ মিনিট ১৫ সেকেন্ড',
    icon: '🖨️',
    color: '#3b82f6',
    steps: [
      '১. থার্মাল প্রিন্টার অন করে মোবাইলের ব্লুটুথ চালু করুন।',
      '২. সহজহিসাব পিওএস স্ক্রিনে "ব্লুটুথ প্রিন্ট" বাটনে চাপুন।',
      '৩. লিস্ট থেকে আপনার ৫৮মিমি বা ৮০মিমি প্রিন্টার নির্বাচন করে পেয়ার করুন।',
      '৪. তাৎক্ষণিক বাংলা রসিদ প্রিন্ট বের হয়ে আসবে!'
    ]
  }
];

export default function TutorialsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialItem | null>(null);

  const filteredTutorials = TUTORIALS.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
      paddingBottom: '80px'
    }}>
      {/* Top Header matching App Reference */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#ffffff',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 4px 20px rgba(79, 70, 229, 0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'grid',
            placeItems: 'center',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', letterSpacing: '-0.2px' }}>
          টিউটোরিয়াল ভিডিও
        </h1>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
        
        {/* Search Filter */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            position: 'relative',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 14px'
          }}>
            <span style={{ fontSize: '16px', color: '#94a3b8', marginRight: '8px' }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="টিউটোরিয়াল খুঁজুন (যেমন: পণ্য, কাস্টমার, স্টক, প্রিন্টার)..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                padding: '10px 0',
                fontSize: '13.5px',
                fontFamily: 'inherit',
                color: '#0f172a'
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tutorial List matching Image 3 structure */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
          overflow: 'hidden'
        }}>
          {filteredTutorials.map((tut, idx) => (
            <div
              key={tut.id}
              onClick={() => setSelectedTutorial(tut)}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                borderBottom: idx !== filteredTutorials.length - 1 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              {/* Left Thumbnail Illustration Card */}
              <div style={{
                width: '92px',
                height: '62px',
                flexShrink: 0,
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${tut.color}15 0%, ${tut.color}30 100%)`,
                border: `1.5px solid ${tut.color}35`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <span style={{ fontSize: '20px' }}>{tut.icon}</span>
                <span style={{
                  position: 'absolute',
                  bottom: '3px',
                  right: '4px',
                  background: tut.color,
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: '800',
                  padding: '1px 5px',
                  borderRadius: '4px'
                }}>
                  ▶ প্লে
                </span>
              </div>

              {/* Right Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  margin: '0 0 4px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  color: '#1e293b',
                  lineHeight: 1.4
                }}>
                  {tut.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#64748b' }}>
                  <span style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '6px', fontWeight: '700' }}>
                    {tut.category}
                  </span>
                  <span>⏱️ {tut.duration}</span>
                </div>
              </div>

              {/* Right Arrow */}
              <div style={{ color: '#cbd5e1', fontSize: '18px', fontWeight: '900' }}>
                ›
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Tutorial Video / Steps Modal Player */}
      {selectedTutorial && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            maxWidth: '520px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              background: `linear-gradient(135deg, ${selectedTutorial.color} 0%, #1e1b4b 100%)`,
              color: '#ffffff',
              padding: '20px 22px',
              position: 'relative'
            }}>
              <button
                onClick={() => setSelectedTutorial(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                ✕
              </button>
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                {selectedTutorial.category} • {selectedTutorial.duration}
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: '900', margin: '8px 0 0', lineHeight: 1.3 }}>
                {selectedTutorial.title}
              </h2>
            </div>

            {/* Video Screen Representation */}
            <div style={{
              background: '#0f172a',
              padding: '32px 20px',
              textAlign: 'center',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: selectedTutorial.color,
                display: 'grid',
                placeItems: 'center',
                fontSize: '28px',
                boxShadow: '0 0 25px rgba(99, 102, 241, 0.6)',
                marginBottom: '12px'
              }}>
                ▶
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800' }}>
                ভিডিও টিউটোরিয়াল চালু আছে
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                নিচের সহজ ধাপগুলো অনুসরণ করুন
              </div>
            </div>

            {/* Step-by-Step Guidance */}
            <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', margin: '0 0 12px' }}>
                📋 ধাপে ধাপে নির্দেশিকা:
              </h4>

              <div style={{ display: 'grid', gap: '10px' }}>
                {selectedTutorial.steps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      fontSize: '13px',
                      color: '#334155',
                      fontWeight: '600',
                      lineHeight: 1.5
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer Action */}
            <div style={{ padding: '14px 22px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSelectedTutorial(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ✓ বুঝেছি, ধন্যবাদ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
