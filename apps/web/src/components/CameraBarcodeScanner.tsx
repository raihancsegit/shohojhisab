'use client';
import React, { useState, useEffect, useRef } from 'react';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = '📷 লাইভ বারকোড স্ক্যানার'
}: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let scanInterval: any = null;

    if (isOpen) {
      setCameraError('');
      // Request camera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        .then((s) => {
          mediaStream = s;
          setStream(s);
          setCameraActive(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }

          // Check if BarcodeDetector API is natively available in browser (Android Chrome / Edge / modern browsers)
          if ('BarcodeDetector' in window) {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
            });

            scanInterval = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    const rawValue = barcodes[0].rawValue;
                    if (rawValue) {
                      onScan(rawValue);
                      onClose();
                    }
                  }
                } catch (err) {}
              }
            }, 300);
          }
        })
        .catch((err) => {
          setCameraActive(false);
          setCameraError('ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ক্যামেরা পারমিশন চেক করুন অথবা নিচে কোড লিখুন।');
        });
      } else {
        setCameraError('আপনার ব্রাউজারে লাইভ ক্যামেরা সাপোর্ট নেই। নিচে সরাসরি কোড লিখুন।');
      }
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '22px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              {title}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              পণ্যের বারকোডের ওপর ক্যামেরা ধরুন
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* Live Camera Viewfinder */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          background: '#0f172a',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          border: '2px solid #10b981'
        }}>
          {cameraError ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#f87171', fontSize: '13px' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📷⚠️</span>
              {cameraError}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Aiming Reticle */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '75%',
                height: '55%',
                border: '2.5px dashed #10b981',
                borderRadius: '12px',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                pointerEvents: 'none'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: '#ef4444',
                  boxShadow: '0 0 8px #ef4444',
                  animation: 'pulse 1.5s infinite'
                }} />
              </div>
            </>
          )}
        </div>

        {/* Quick Manual Code Bar */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="বারকোড নম্বর লিখুন (যেমন: 89411001)..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="num-font"
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              fontSize: '14px',
              fontWeight: '700',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0 18px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ✓ যোগ
          </button>
        </form>

      </div>
    </div>
  );
}
