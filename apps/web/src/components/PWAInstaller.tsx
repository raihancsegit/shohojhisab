'use client';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PWAInstaller() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed previously
    try {
      if (localStorage.getItem('pwa_banner_dismissed') === '1') {
        setDismissed(true);
      }
    } catch (e) {}

    // Check if already installed & running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true);
      return;
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration failed: ', err);
      });
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('pwa_banner_dismissed', '1');
    } catch (e) {}
  };

  // Do not show on POS screen or if dismissed/standalone
  if (isStandalone || dismissed || pathname === '/pos') return null;

  return (
    <>
      {/* Sleek PWA Install Header Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #3730a3 0%, #312e81 100%)',
        color: '#ffffff',
        padding: '8px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12.5px',
        fontWeight: '700',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📲</span>
          <span>মোবাইলের হোমস্ক্রিনে অ্যাপটি ইনস্টল করুন</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleInstallClick}
            style={{
              background: '#ffffff',
              color: '#4338ca',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            <span>⬇️</span> ইনস্টল করুন
          </button>

          <button
            onClick={() => setShowInstructions(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '11.5px',
              cursor: 'pointer'
            }}
          >
            নিয়ম
          </button>

          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '2px 6px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Step-by-Step Mobile Installation Guide Modal */}
      {showInstructions && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 150,
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                📲 মোবাইলে যেভাবে ইনস্টল করবেন
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
              {/* Android Instructions */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#059669', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span>🤖</span> অ্যান্ড্রয়েড ফোন (Google Chrome):
                </strong>
                <ol style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '4px' }}>
                  <li>ব্রাউজারের উপরে ডানে <strong>তিন ডট (⋮)</strong> মেনুতে চাপুন।</li>
                  <li><strong>"Install app"</strong> বা <strong>"Add to Home screen"</strong> এ চাপুন।</li>
                  <li>এরপর <strong>"Install"</strong> বাটনে চাপলেই হোমস্ক্রিনে অ্যাপ আইকন চলে আসবে।</li>
                </ol>
              </div>

              {/* iPhone Instructions */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0284c7', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span>🍎</span> আইফোন / iOS (Safari Browser):
                </strong>
                <ol style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '4px' }}>
                  <li>সাফারি ব্রাউজারের নিচে <strong>শেয়ার বাটন (⎋)</strong> চাপুন।</li>
                  <li>একটু নিচে স্ক্রোল করে <strong>"Add to Home Screen" (+)</strong> এ চাপুন।</li>
                  <li>উপরে ডানে <strong>"Add"</strong> এ চাপুন।</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              style={{
                width: '100%',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                marginTop: '18px',
                cursor: 'pointer'
              }}
            >
              বুঝেছি, ধন্যবাদ!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
