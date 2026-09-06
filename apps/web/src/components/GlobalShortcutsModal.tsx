'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function GlobalShortcutsModal() {
  const router = useRouter();
  const { triggerHaptic, speakAnnouncement } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Fast Barcode Gun Scanner Detection (Characters typed under 45ms ending with Enter)
      const now = Date.now();
      if (now - lastKeyTime > 60) {
        barcodeBuffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter' && barcodeBuffer.length >= 4) {
        // Detected barcode gun input!
        const finalBarcode = barcodeBuffer;
        barcodeBuffer = '';
        setScannedBarcode(finalBarcode);
        triggerHaptic('success');
        speakAnnouncement(`বারকোড স্ক্যান: ${finalBarcode}`);
        router.push(`/pos?barcode=${encodeURIComponent(finalBarcode)}`);
        return;
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }

      // Hotkey F1 -> POS
      if (e.key === 'F1' || (e.altKey && e.key === '1')) {
        e.preventDefault();
        triggerHaptic('light');
        router.push('/pos');
      }
      // Hotkey F2 -> Khata
      else if (e.key === 'F2' || (e.altKey && e.key === '2')) {
        e.preventDefault();
        triggerHaptic('light');
        router.push('/khata');
      }
      // Hotkey F3 -> Stock
      else if (e.key === 'F3' || (e.altKey && e.key === '3')) {
        e.preventDefault();
        triggerHaptic('light');
        router.push('/stock');
      }
      // Hotkey F4 -> Day End
      else if (e.key === 'F4' || (e.altKey && e.key === '4')) {
        e.preventDefault();
        triggerHaptic('light');
        router.push('/day-end');
      }
      // Hotkey Shift+? or F12 -> Shortcut Help
      else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, triggerHaptic, speakAnnouncement]);

  if (!showHelp) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(6px)',
      zIndex: 2000,
      display: 'grid',
      placeItems: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '480px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span> কি-বোর্ড শর্টকাট ও বারকোড গান
          </h3>
          <button
            onClick={() => setShowHelp(false)}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontWeight: '900'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: '10px', fontSize: '13.5px', marginBottom: '18px' }}>
          {[
            { key: 'F1 / Alt+1', desc: 'সরাসরি পিওএস (POS) বিক্রয় স্ক্রিন' },
            { key: 'F2 / Alt+2', desc: 'ডিজিটাল বাকি খাতা ও কাস্টমার লেজার' },
            { key: 'F3 / Alt+3', desc: 'দোকানের ইনভেন্টরি ও স্টক ম্যানেজমেন্ট' },
            { key: 'F4 / Alt+4', desc: 'ক্যাশ মিলানো ও ডে-এন্ড ক্লোজিং' },
            { key: 'বারকোড গান', desc: 'যেকোনো স্ক্রিনে বারকোড স্ক্যান করলেই অটোমেটিক কার্টে যোগ হবে' },
            { key: 'Shift + ?', desc: 'এই শর্টকাট গাইড ডায়লগ ওপেন / ক্লোজ' }
          ].map((s, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#334155', fontWeight: '600' }}>{s.desc}</span>
              <kbd style={{ background: '#0f172a', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '900', fontFamily: 'monospace' }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowHelp(false)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          বুঝেছি (Close)
        </button>
      </div>
    </div>
  );
}
