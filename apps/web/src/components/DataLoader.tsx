'use client';
import React from 'react';

interface DataLoaderProps {
  type?: 'full' | 'card' | 'skeleton-list' | 'skeleton-grid' | 'inline' | 'overlay' | 'table';
  text?: string;
  subText?: string;
  count?: number;
  height?: number | string;
  icon?: string;
}

export default function DataLoader({
  type = 'inline',
  text = 'তথ্য লোড হচ্ছে...',
  subText,
  count = 3,
  height,
  icon = '⚡'
}: DataLoaderProps) {
  // 1. FULL PAGE / SCREEN LOADER
  if (type === 'full') {
    return (
      <div
        style={{
          minHeight: height || '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          textAlign: 'center'
        }}
      >
        <div style={{ position: 'relative', width: '72px', height: '72px', marginBottom: '16px' }}>
          {/* Animated Spinner Ring */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3.5px solid #e0e7ff',
              borderTopColor: '#4f46e5',
              borderRightColor: '#6366f1',
              animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }}
          />
          {/* Center Glowing Icon */}
          <div
            style={{
              position: 'absolute',
              inset: '8px',
              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)'
            }}
          >
            {icon}
          </div>
        </div>

        <strong style={{ fontSize: '15px', color: '#1e1b4b', fontWeight: '800', display: 'block' }}>
          {text}
        </strong>
        {subText && (
          <span style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px', maxWidth: '280px', display: 'block' }}>
            {subText}
          </span>
        )}

        {/* Shimmer Bar */}
        <div
          style={{
            width: '140px',
            height: '4px',
            background: '#e2e8f0',
            borderRadius: '999px',
            marginTop: '16px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '45%',
              background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
              borderRadius: '999px',
              animation: 'shimmerProgress 1.4s ease-in-out infinite'
            }}
          />
        </div>
      </div>
    );
  }

  // 2. OVERLAY LOADER (Blur Background)
  if (type === 'overlay') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px 32px',
            boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '320px',
            width: '100%',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3.5px solid #e0e7ff',
              borderTopColor: '#4f46e5',
              animation: 'spin 0.75s linear infinite',
              marginBottom: '14px'
            }}
          />
          <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: '800' }}>{text}</strong>
          {subText && (
            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{subText}</span>
          )}
        </div>
      </div>
    );
  }

  // 3. SKELETON LIST (For Lists, Memos, Customers, Expenses)
  if (type === 'skeleton-list') {
    return (
      <div style={{ display: 'grid', gap: '10px', width: '100%' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '14px 16px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Shimmer Effect */}
            <div className="shimmer-sweep" />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, display: 'grid', gap: '6px' }}>
                <div style={{ height: '14px', width: `${60 + (i % 3) * 15}%`, background: '#f1f5f9', borderRadius: '4px' }} />
                <div style={{ height: '11px', width: `${40 + (i % 2) * 20}%`, background: '#f8fafc', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <div style={{ height: '16px', width: '54px', background: '#f1f5f9', borderRadius: '4px' }} />
              <div style={{ height: '10px', width: '36px', background: '#f8fafc', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 4. SKELETON GRID (For Product POS Cards / Stock Grid)
  if (type === 'skeleton-grid') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '10px',
          width: '100%'
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '130px'
            }}
          >
            <div className="shimmer-sweep" />
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9' }} />
            <div style={{ height: '13px', width: '85%', background: '#f1f5f9', borderRadius: '4px', marginTop: 'auto' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ height: '14px', width: '40px', background: '#f1f5f9', borderRadius: '4px' }} />
              <div style={{ height: '14px', width: '28px', background: '#e0e7ff', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 5. TABLE SKELETON
  if (type === 'table') {
    return (
      <div style={{ width: '100%', background: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ height: '14px', width: '100px', background: '#e2e8f0', borderRadius: '4px' }} />
          <div style={{ height: '14px', width: '60px', background: '#e2e8f0', borderRadius: '4px' }} />
        </div>
        <div style={{ padding: '8px 16px', display: 'grid', gap: '12px' }}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < count - 1 ? '1px dashed #f1f5f9' : 'none', position: 'relative', overflow: 'hidden' }}>
              <div className="shimmer-sweep" />
              <div style={{ height: '12px', width: `${50 + (i % 3) * 15}%`, background: '#f1f5f9', borderRadius: '4px' }} />
              <div style={{ height: '12px', width: '50px', background: '#f1f5f9', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 6. INLINE / CARD SPINNER (Default)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: height ? '0px' : '20px 14px',
        height: height,
        color: '#475569',
        fontSize: '13px',
        fontWeight: '700'
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: '2.5px solid #e0e7ff',
          borderTopColor: '#4f46e5',
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0
        }}
      />
      <span>{text}</span>
    </div>
  );
}
