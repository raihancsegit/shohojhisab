'use client';
import React, { useState, useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export default function CameraBarcodeScannerModal({ isOpen, onClose, onScanSuccess }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          setErrorMsg('আপনার ডিভাইসে ক্যামেরা সাপোর্ট পাওয়া যায়নি');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        // Try using native BarcodeDetector API if supported (Chrome Android)
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
          });

          const interval = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detected = barcodes[0].rawValue;
                if (detected) {
                  clearInterval(interval);
                  onScanSuccess(detected);
                  onClose();
                }
              }
            } catch (e) {}
          }, 300);

          return () => clearInterval(interval);
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setHasCamera(false);
        setErrorMsg('ক্যামেরা পারমিশন পাওয়া যায়নি। ম্যানুয়ালি কোড লিখুন।');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, onClose, onScanSuccess]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScanSuccess(manualCode.trim());
    setManualCode('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      <div style={{
        position: 'relative',
        background: '#ffffff',
        borderTopLeftRadius: '28px',
        borderTopRightRadius: '28px',
        padding: '16px 20px 32px',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.3)',
        zIndex: 2,
        animation: 'slideUp 0.25s ease-out'
      }}>
        {/* Drag Pill */}
        <div style={{ width: '40px', height: '4px', borderRadius: '99px', background: '#cbd5e1', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📷</span>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
              মোবাইল ক্যামেরা বারকোড স্ক্যানার
            </h3>
          </div>
          <button
            onClick={onClose}
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

        {/* Video Viewport with Targeting Laser Box */}
        {hasCamera ? (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            background: '#0f172a',
            borderRadius: '20px',
            overflow: 'hidden',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Target Reticle */}
            <div style={{
              position: 'absolute',
              width: '200px',
              height: '110px',
              border: '2px dashed #6366f1',
              borderRadius: '12px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              display: 'grid',
              placeItems: 'center'
            }}>
              <div style={{
                width: '90%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
                animation: 'soft-pulse 1.2s infinite'
              }} />
            </div>

            <span style={{
              position: 'absolute',
              bottom: '10px',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              background: 'rgba(0,0,0,0.6)',
              padding: '3px 10px',
              borderRadius: '6px'
            }}>
              পণ্যের বারকোড বক্সের ভেতরে ধরুন
            </span>
          </div>
        ) : (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '16px',
            color: '#991b1b',
            fontSize: '13px'
          }}>
            ⚠️ {errorMsg || 'ক্যামেরা চালু করা সম্ভব হয়নি'}
          </div>
        )}

        {/* Manual Barcode Fallback Input */}
        <form onSubmit={handleManualSubmit} style={{ display: 'grid', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>
            ক্যামেরায় না আসলে ম্যানুয়ালি কোড লিখুন:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="বারকোড বা পণ্যের কোড..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="num-font"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                outline: 'none',
                fontSize: '15px'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              যোগ করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
