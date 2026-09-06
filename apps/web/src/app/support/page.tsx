'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HelpAndSupportPage() {
  const router = useRouter();

  const handleCall = () => {
    window.location.href = 'tel:09613660100';
  };

  const handleWhatsApp = () => {
    window.open('https://wa.me/8801986233234?text=' + encodeURIComponent('সালামু আলাইকুম, সহজ হিসাব (ShohojHisab) অ্যাপ ব্যবহারে আমার কিছু সহায়তা প্রয়োজন।'), '_blank');
  };

  const handleMessenger = () => {
    window.open('https://m.me/shohojhisab', '_blank');
  };

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
          হেল্প এন্ড সাপোর্ট
        </h1>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '20px 16px', display: 'grid', gap: '18px' }}>
        
        {/* Card 1: Emergency Call & Live Chat Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '22px',
          padding: '24px 20px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.05)',
          display: 'grid',
          gap: '20px'
        }}>
          {/* Section A: Emergency Call */}
          <div>
            <div style={{
              textAlign: 'center',
              fontSize: '13.5px',
              fontWeight: '700',
              color: '#64748b',
              marginBottom: '12px'
            }}>
              জরুরী প্রয়োজনে আমাদের কল করুন
            </div>

            <div
              onClick={handleCall}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                border: '1.5px solid #818cf8',
                borderRadius: '16px',
                padding: '12px 18px',
                background: '#f5f7ff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.08)'
              }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: '1.5px solid #6366f1',
                display: 'grid',
                placeItems: 'center',
                color: '#4f46e5',
                fontSize: '18px',
                background: '#ffffff'
              }}>
                📞
              </div>
              <div style={{
                fontSize: '22px',
                fontWeight: '900',
                color: '#312e81',
                letterSpacing: '0.5px'
              }}>
                ০৯৬১৩৬৬০১০০
              </div>
            </div>
          </div>

          {/* Section B: Live Chat Support */}
          <div>
            <div style={{
              textAlign: 'center',
              fontSize: '13.5px',
              fontWeight: '700',
              color: '#64748b',
              marginBottom: '12px'
            }}>
              লাইভ চ্যাট সাপোর্ট
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Messenger Button */}
              <button
                onClick={handleMessenger}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  border: '1.5px solid #e0e7ff',
                  borderRadius: '16px',
                  padding: '16px 12px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#0084ff',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#ffffff',
                  fontSize: '20px'
                }}>
                  💬
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e293b' }}>
                  ম্যাসেঞ্জার
                </span>
              </button>

              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsApp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  border: '1.5px solid #dcfce7',
                  borderRadius: '16px',
                  padding: '16px 12px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#25d366',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#ffffff',
                  fontSize: '20px'
                }}>
                  📱
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e293b' }}>
                  হোয়াটসঅ্যাপ
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* Card 2: Social Media Channels */}
        <div style={{
          background: '#ffffff',
          borderRadius: '22px',
          padding: '24px 20px',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.05)'
        }}>
          <div style={{
            textAlign: 'center',
            fontSize: '13.5px',
            fontWeight: '700',
            color: '#64748b',
            marginBottom: '16px'
          }}>
            আমাদের সামাজিক যোগাযোগ মাধ্যমে ফলো করুন
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 12px',
                textDecoration: 'none',
                background: '#ffffff',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#1877f2',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: '900'
              }}>
                f
              </div>
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 12px',
                textDecoration: 'none',
                background: '#ffffff',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#0a66c2',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '900'
              }}>
                in
              </div>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 12px',
                textDecoration: 'none',
                background: '#ffffff',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ff0000',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                fontSize: '18px'
              }}>
                ▶
              </div>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px 12px',
                textDecoration: 'none',
                background: '#ffffff',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                fontSize: '18px'
              }}>
                📷
              </div>
            </a>

          </div>
        </div>

        {/* Quick Help Links */}
        <div style={{ display: 'grid', gap: '10px' }}>
          <Link
            href="/tutorials"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: '14px',
              background: '#ede9fe',
              color: '#5b21b6',
              textDecoration: 'none',
              fontWeight: '800',
              fontSize: '13.5px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎬</span> ভিডিও দেখে শিখুন (টিউটোরিয়াল)
            </span>
            <span>→</span>
          </Link>

          <Link
            href="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: '14px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #e2e8f0',
              textDecoration: 'none',
              fontWeight: '800',
              fontSize: '13.5px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> দোকানের সকল সেটিংস
            </span>
            <span>→</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
