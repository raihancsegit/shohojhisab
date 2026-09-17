'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QuickSellRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pos?mode=numpad');
  }, [router]);

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', color: '#64748b' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>⚡</div>
        <div style={{ fontWeight: '800', fontSize: '17px', color: '#0f172a', marginBottom: '4px' }}>
          কুইক সেল চালু হচ্ছে...
        </div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>দয়া করে অপেক্ষা করুন</div>
      </div>
    </div>
  );
}
