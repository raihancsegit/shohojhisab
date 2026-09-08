'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { parseVoicePOSCommand, ParsedVoiceItem, VoicePOSParseResult } from '../lib/voicePOSParser';
import { getIndustryVoiceConfig } from '../lib/industryConfig';

interface VoicePOSCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  customers: any[];
  onCompleteSale: (saleData: any) => void;
  onProductAutoAdded?: (newProduct: any) => void;
}

export default function VoicePOSCalculatorModal({
  isOpen,
  onClose,
  products,
  customers,
  onCompleteSale,
  onProductAutoAdded
}: VoicePOSCalculatorModalProps) {
  const { tenant, triggerHaptic, speakAnnouncement, isSoundboxEnabled } = useAuth();
  const currentTenantId = tenant?.id;
  const voiceConfig = getIndustryVoiceConfig(tenant?.industryId);

  const [items, setItems] = useState<ParsedVoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [lastActionMessage, setLastActionMessage] = useState<string>('মাইক চালু আছে। সরাসরি মুখে বলুন...');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const isComponentMounted = useRef<boolean>(true);
  const itemsRef = useRef<ParsedVoiceItem[]>([]);
  itemsRef.current = items;
  const debounceTimerRef = useRef<any>(null);
  const lastProcessedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const accumulatedTranscriptRef = useRef<string>('');

  // Sound generator
  const playBeep = (freq = 880) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  // Start / Maintain Continuous Hands-Free Listening Loop
  const startContinuousListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে বাংলা ভয়েস সাপোর্ট করে না। Google Chrome ব্যবহার করুন।');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (isComponentMounted.current) {
          setIsListening(true);
        }
      };

      recognition.onresult = (event: any) => {
        // Echo Prevention: Do not capture speech while the system itself is speaking TTS
        if (typeof window !== 'undefined' && (window as any).speechSynthesis?.speaking) {
          return;
        }

        let interimText = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + ' ';
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const currentSaid = (finalChunk || interimText).trim();
        if (currentSaid) {
          setLiveTranscript(currentSaid);
          accumulatedTranscriptRef.current = currentSaid;
        }

        // Debounce: Wait for user to finish speaking the whole phrase before parsing
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        const waitMs = finalChunk ? 450 : 750;
        debounceTimerRef.current = setTimeout(() => {
          const textToProcess = accumulatedTranscriptRef.current.trim();
          if (!textToProcess) return;

          const now = Date.now();
          // Deduplicate if identical phrase repeated within 2.5s
          if (
            lastProcessedRef.current.text === textToProcess &&
            now - lastProcessedRef.current.time < 2500
          ) {
            return;
          }

          lastProcessedRef.current = { text: textToProcess, time: now };
          accumulatedTranscriptRef.current = '';
          handleProcessVoiceInput(textToProcess);
        }, waitMs);
      };

      recognition.onerror = (event: any) => {
        console.log('Speech error:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
          setLastActionMessage('⚠️ মাইক্রোফোন ব্যবহারের অনুমতি দিন');
        }
      };

      recognition.onend = () => {
        // Auto-restart loop if still open and not muted
        if (isComponentMounted.current && !isMuted) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {}
          }, 300);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start continuous speech recognition', err);
    }
  };

  // Process Spoken Speech
  const handleProcessVoiceInput = (spokenText: string) => {
    const result: VoicePOSParseResult = parseVoicePOSCommand(spokenText, products);
    console.log('Voice POS Parsed:', result);

    if (result.type === 'noise_ignored') {
      setLastActionMessage(`🎙️ শুনছি... মুখে পণ্য ও দর বলুন (যেমন: "চিনি ১ কেজি")`);
      return;
    }

    // 1. ADD ITEMS TO LIVE MEMO (Strictly from current in-stock catalog only)
    if (result.type === 'add_items' && result.items && result.items.length > 0) {
      const validInStockItems: ParsedVoiceItem[] = [];
      const outOfStockNames: string[] = [];
      const notFoundNames: string[] = [];

      for (const item of result.items) {
        const qClean = (item.banglaName || item.name || '').toLowerCase().trim();
        // Tier 1: Exact match
        let prod = products.find(p =>
          (item.productId && p.id === item.productId) ||
          ((p.banglaName || '').toLowerCase().trim() === qClean) ||
          ((p.name || '').toLowerCase().trim() === qClean)
        );

        // Tier 2: Substring & candidate match
        if (!prod) {
          const candidates = products.filter(p => {
            const bName = (p.banglaName || '').toLowerCase().trim();
            const name = (p.name || '').toLowerCase().trim();
            const gName = (p.genericName || '').toLowerCase().trim();
            const brand = (p.brand || '').toLowerCase().trim();
            return (bName && (bName.includes(qClean) || qClean.includes(bName))) ||
                   (name && (name.includes(qClean) || qClean.includes(name))) ||
                   (gName && (gName.includes(qClean) || qClean.includes(gName))) ||
                   (brand && (brand.includes(qClean) || qClean.includes(brand)));
          });

          if (candidates.length > 0) {
            candidates.sort((a, b) => {
              const aInStock = Number(a.stock || 0) > 0 ? 1 : 0;
              const bInStock = Number(b.stock || 0) > 0 ? 1 : 0;
              if (aInStock !== bInStock) return bInStock - aInStock;
              return (a.banglaName || a.name || '').length - (b.banglaName || b.name || '').length;
            });
            prod = candidates[0];
          }
        }

        if (!prod) {
          notFoundNames.push(item.banglaName || item.name);
          continue;
        }

        const currentStock = Number(prod.stock || 0);
        if (currentStock <= 0) {
          outOfStockNames.push(prod.banglaName || prod.name);
          continue;
        }

        validInStockItems.push({
          ...item,
          productId: prod.id,
          name: prod.name,
          banglaName: prod.banglaName || prod.name,
          unit: item.unit || prod.unit || 'পিস',
          unitPrice: item.unitPrice || prod.sellingPrice || 0,
          stock: currentStock,
          isExistingProduct: true
        });
      }

      // If items not found or out of stock, announce clearly
      if (outOfStockNames.length > 0) {
        triggerHaptic('warning');
        playBeep(450);
        const nameList = outOfStockNames.join(', ');
        speakAnnouncement(`দুঃখিত, ${nameList} পণ্যটি বর্তমানে স্টকে নেই!`);
        setLastActionMessage(`⚠️ দুঃখিত, "${nameList}" পণ্যটি স্টকে নেই!`);
      }

      if (notFoundNames.length > 0) {
        triggerHaptic('warning');
        playBeep(450);
        const nameList = notFoundNames.join(', ');
        speakAnnouncement(`দুঃখিত, ${nameList} স্টকে পাওয়া যায়নি!`);
        setLastActionMessage(`⚠️ "${nameList}" স্টকে পাওয়া যায়নি!`);
      }

      // Only add verified items that actually exist in stock!
      if (validInStockItems.length > 0) {
        playBeep(1100);
        triggerHaptic('success');
        const newItems = [...itemsRef.current];

        validInStockItems.forEach((item) => {
          const existingIdx = newItems.findIndex(i =>
            (item.productId && i.productId === item.productId) ||
            ((i.banglaName || i.name).toLowerCase().trim() === (item.banglaName || item.name).toLowerCase().trim())
          );
          if (existingIdx >= 0) {
            newItems[existingIdx].quantity += item.quantity;
            newItems[existingIdx].totalPrice = Math.round(newItems[existingIdx].quantity * newItems[existingIdx].unitPrice * 100) / 100;
          } else {
            newItems.push({
              ...item,
              id: 'vitem-' + Date.now() + Math.random().toString().slice(-4)
            });
          }
        });

        setItems(newItems);
        const newTotal = newItems.reduce((acc, i) => acc + i.totalPrice, 0) - discount;
        const spokenSummary = validInStockItems.map(i => `${i.banglaName} ${i.quantity} ${i.unit}`).join(', ');

        setLastActionMessage(`✓ মেমোতে যোগ হয়েছে: ${spokenSummary} (মোট: ৳${newTotal})`);
        speakAnnouncement(`${spokenSummary} মেমোতে যোগ হয়েছে।`);
      }
      return;
    }

    // 2. CASH CHECKOUT
    if (result.type === 'cash_checkout') {
      if (itemsRef.current.length === 0) {
        setLastActionMessage('⚠️ কার্টে কোনো পণ্য নেই। আগে মুখে বলে পণ্য যোগ করুন।');
        return;
      }
      handleFinalizeSale('cash');
      return;
    }

    // 3. DUE / KHATA CHECKOUT
    if (result.type === 'due_checkout') {
      if (itemsRef.current.length === 0) {
        setLastActionMessage('⚠️ কার্টে কোনো পণ্য নেই। আগে মুখে বলে পণ্য যোগ করুন।');
        return;
      }
      const targetCustomer = result.customerName || selectedCustomerName || 'বাকি গ্রাহক';
      setSelectedCustomerName(targetCustomer);
      handleFinalizeSale('due', targetCustomer);
      return;
    }

    // 4. DISCOUNT
    if (result.type === 'discount' && result.discountAmount !== undefined) {
      setDiscount(result.discountAmount);
      playBeep(900);
      setLastActionMessage(`✓ ৳${result.discountAmount} ছাড় কার্যকর হয়েছে!`);
      return;
    }

    // 5. REMOVE ITEM
    if (result.type === 'remove_item' && result.removeItemName) {
      const searchRem = result.removeItemName.toLowerCase();
      const updated = itemsRef.current.filter(i => !i.banglaName.toLowerCase().includes(searchRem) && !i.name.toLowerCase().includes(searchRem));
      setItems(updated);
      playBeep(700);
      setLastActionMessage(`✓ "${result.removeItemName}" মেমো থেকে বাদ দেওয়া হয়েছে`);
      return;
    }

    // 6. CLEAR MEMO
    if (result.type === 'clear_memo') {
      setItems([]);
      setDiscount(0);
      setSelectedCustomerName('');
      playBeep(600);
      setLastActionMessage('✓ মেমো ক্লিয়ার করা হয়েছে। নতুন হিসাব শুরু করুন।');
      return;
    }
  };

  // Finalize Sale (Cash or Due)
  const handleFinalizeSale = async (method: 'cash' | 'due', custName = '') => {
    if (itemsRef.current.length === 0 || !currentTenantId) return;
    setIsSubmitting(true);
    triggerHaptic('medium');

    const subtotal = itemsRef.current.reduce((acc, i) => acc + i.totalPrice, 0);
    const finalAmount = Math.max(0, subtotal - discount);
    const paidAmount = method === 'cash' ? finalAmount : 0;
    const dueAmount = method === 'due' ? finalAmount : 0;
    const customer = custName || selectedCustomerName || (method === 'due' ? 'বাকি খরিদ্দার' : 'নগদ কাস্টমার');

    const payload = {
      tenantId: currentTenantId,
      customerName: customer,
      items: itemsRef.current.map(i => ({
        productId: i.productId || ('prod-' + Date.now().toString().slice(-6)),
        productName: i.banglaName || i.name,
        quantity: i.quantity,
        sellingPrice: i.unitPrice,
        purchasePrice: Math.round(i.unitPrice * 0.8),
        totalPrice: i.totalPrice
      })),
      discount,
      totalAmount: finalAmount,
      paidAmount,
      dueAmount,
      paymentMethod: method
    };

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        playBeep(1250);
        triggerHaptic('success');
        
        // Pass data to parent to show receipt
        onCompleteSale({
          order: data.order,
          invoiceNo: data.order?.invoiceNo || ('INV-' + Date.now().toString().slice(-6)),
          items: [...itemsRef.current],
          subtotal,
          discount,
          totalAmount: finalAmount,
          paidAmount,
          dueAmount,
          customerName: customer,
          paymentMethod: method
        });

        // Reset and close
        setItems([]);
        setDiscount(0);
        setSelectedCustomerName('');
        onClose();
      } else {
        alert('বিক্রি সম্পন্ন হতে সমস্যা হয়েছে!');
      }
    } catch (e) {
      alert('সার্ভার কানেকশন এরর!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Mute / Pause Mic
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startContinuousListening();
      setLastActionMessage('🎙️ মাইক আবার চালু হয়েছে। বলুন...');
    } else {
      setIsMuted(true);
      setIsListening(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      setLastActionMessage('⏸️ মাইক সাময়িকভাবে পজ করা হয়েছে।');
    }
  };

  useEffect(() => {
    if (isOpen) {
      isComponentMounted.current = true;
      setIsMuted(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      startContinuousListening();
    }

    return () => {
      isComponentMounted.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [isOpen]);

  const updateItemQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    const item = newItems[index];
    if (!item) return;

    const newQty = Math.max(0.1, Math.round((item.quantity + delta) * 100) / 100);
    item.quantity = newQty;
    item.totalPrice = Math.round(newQty * item.unitPrice * 100) / 100;
    setItems(newItems);
    triggerHaptic('light');
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    triggerHaptic('medium');
    playBeep(700);
  };

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, i) => acc + i.totalPrice, 0);
  const totalPayable = Math.max(0, subtotal - discount);

  return (
    <div className="voice-pos-modal-overlay">
      <style>{`
        .voice-pos-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }

        .voice-pos-modal-container {
          background: #ffffff;
          border-radius: 24px;
          max-width: 760px;
          width: 100%;
          max-height: 94vh;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4);
          border: 1.5px solid #e2e8f0;
          overflow: hidden;
        }

        .voice-shortcuts-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 4px;
        }
        .voice-shortcuts-scroll::-webkit-scrollbar {
          display: none;
        }

        /* Desktop Table View */
        .voice-desktop-table {
          display: block;
        }
        /* Mobile Cards View */
        .voice-mobile-cards {
          display: none;
        }

        @media (max-width: 640px) {
          .voice-pos-modal-overlay {
            padding: 0 !important;
            align-items: flex-end !important;
          }
          .voice-pos-modal-container {
            max-height: 100dvh !important;
            height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
          }
          .voice-desktop-table {
            display: none !important;
          }
          .voice-mobile-cards {
            display: flex !important;
            flex-direction: column;
            gap: 10px;
          }
          .voice-header-subtitle {
            display: none !important;
          }
          .voice-bottom-actions {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .voice-bottom-btn-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .voice-primary-btn {
            width: 100% !important;
            justify-content: center !important;
            font-size: 16px !important;
            padding: 14px 16px !important;
          }
        }
      `}</style>

      <div className="voice-pos-modal-container">
        
        {/* Top Header & Live Soundwave Cockpit */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #334155',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              onClick={toggleMute}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: isMuted ? '#64748b' : isListening ? '#10b981' : '#f59e0b',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '20px',
                cursor: 'pointer',
                boxShadow: isListening && !isMuted ? '0 0 0 6px rgba(16, 185, 129, 0.25)' : 'none',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              title={isMuted ? 'মাইক অন করতে ক্লিক করুন' : 'পজ করতে ক্লিক করুন'}
            >
              {isMuted ? '🔇' : '🎙️'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.01em' }}>
                  আল্ট্রা লাইভ ভয়েস মেমো
                </h2>
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: '900',
                  padding: '2px 7px',
                  borderRadius: '99px',
                  background: isMuted ? '#475569' : '#10b981',
                  color: '#ffffff',
                  textTransform: 'uppercase'
                }}>
                  {isMuted ? 'Paused' : 'Continuous Live'}
                </span>
              </div>
              <p className="voice-header-subtitle" style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                মুখে বলুন: <em>&quot;{voiceConfig.quickSaleBannerHint}&quot;</em>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={toggleMute}
              style={{
                background: isMuted ? '#10b981' : '#334155',
                color: '#ffffff',
                border: 'none',
                padding: '7px 11px',
                borderRadius: '10px',
                fontSize: '11.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isMuted ? '▶ চালু' : '⏸ পজ'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#334155',
                color: '#ffffff',
                border: 'none',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '15px',
                display: 'grid',
                placeItems: 'center'
              }}
              title="বন্ধ করুন"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Live Audio Recognition Subtitle Banner */}
        <div style={{
          background: isMuted ? '#f8fafc' : '#eff6ff',
          borderBottom: '1.5px solid #dbeafe',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontSize: '15px', animation: isListening && !isMuted ? 'pulse 1.5s infinite' : 'none', flexShrink: 0 }}>
              {isMuted ? '⏸️' : '🗣️'}
            </span>
            <span style={{
              fontSize: '12.5px',
              fontWeight: '700',
              color: isMuted ? '#64748b' : '#1e40af',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {liveTranscript ? `"${liveTranscript}"` : lastActionMessage}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', flexShrink: 0 }}>
            আইটেম: {items.length} টি
          </span>
        </div>

        {/* Main Live Calculation Board */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          background: '#f8fafc'
        }}>
          {items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 14px',
              background: '#ffffff',
              borderRadius: '18px',
              border: '2px dashed #cbd5e1'
            }}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>🎙️ 🛒</div>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                মেমো খালি! মুখে পণ্য ও দর বলুন
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', maxWidth: '400px', margin: '0 auto 14px', lineHeight: 1.5 }}>
                কাস্টমার যেসব জিনিস নিচ্ছে মুখে বলুন। মেমোতে অটোমেটিক সব হিসাব হয়ে যাবে।
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                {voiceConfig.quickSaleSuggestions.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleProcessVoiceInput(sample)}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    🗣️ &quot;{sample}&quot;
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* DESKTOP TABLE VIEW */}
              <div className="voice-desktop-table" style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', color: '#475569', fontWeight: '900', fontSize: '11.5px' }}>
                      <th style={{ padding: '8px 12px' }}>নং</th>
                      <th style={{ padding: '8px 12px' }}>পণ্যের নাম</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>পরিমাণ ও একক</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>দর (টাকা)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>মোট টাকা</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#64748b' }}>
                          {idx + 1}.
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#0f172a' }}>
                          <span style={{ fontSize: '13.5px' }}>{it.banglaName || it.name}</span>
                          {it.stock !== undefined && (
                            <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: '700' }}>
                              স্টক: {it.stock} {it.unit}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#0369a1' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(idx, -1)}
                              style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}
                            >
                              -
                            </button>
                            <span>{it.quantity} {it.unit}</span>
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(idx, 1)}
                              style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: '900', fontSize: '12px' }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                          ৳{it.unitPrice}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: '#059669', fontSize: '14.5px' }}>
                          ৳{it.totalPrice}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            onClick={() => removeItem(idx)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#ef4444',
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '900',
                              fontSize: '11px'
                            }}
                            title="মুছে ফেলুন"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW (100% Mobile Optimized) */}
              <div className="voice-mobile-cards">
                {items.map((it, idx) => (
                  <div key={it.id || idx} style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>
                          {it.banglaName || it.name}
                        </span>
                        {it.stock !== undefined && (
                          <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            স্টক: {it.stock} {it.unit}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          color: '#ef4444',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '900',
                          fontSize: '14px',
                          display: 'grid',
                          placeItems: 'center'
                        }}
                        title="মুছে ফেলুন"
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(idx, -1)}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '16px',
                            display: 'grid',
                            placeItems: 'center'
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#0369a1', minWidth: '55px', textAlign: 'center' }}>
                          {it.quantity} {it.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQuantity(idx, 1)}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '16px',
                            display: 'grid',
                            placeItems: 'center'
                          }}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          দর ৳{it.unitPrice}
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '900', color: '#059669' }}>
                          ৳{it.totalPrice}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Bill Summary Cockpit */}
        <div style={{
          background: '#ffffff',
          borderTop: '2px solid #e2e8f0',
          padding: '12px 16px',
          boxShadow: '0 -4px 14px rgba(0,0,0,0.04)',
          flexShrink: 0
        }}>
          {/* Quick Voice Command Cheat Sheet Chips (Horizontal Scrollable) */}
          <div className="voice-shortcuts-scroll" style={{ marginBottom: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '10.5px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', paddingRight: '4px' }}>
              শর্টকাট:
            </span>
            <button
              onClick={() => handleProcessVoiceInput('নগদ বিক্রি')}
              style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              🟢 &quot;নগদ বিক্রি&quot;
            </button>
            <button
              onClick={() => handleProcessVoiceInput('করিম ভাইয়ের বাকি')}
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              🔴 &quot;করিম ভাইয়ের বাকি&quot;
            </button>
            <button
              onClick={() => handleProcessVoiceInput('২০ টাকা ছাড়')}
              style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              🟡 &quot;২০ টাকা ছাড়&quot;
            </button>
            <button
              onClick={() => handleProcessVoiceInput('নতুন মেমো')}
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              🔄 &quot;নতুন মেমো&quot;
            </button>
          </div>

          <div className="voice-bottom-actions" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '800' }}>
                মোট পণ্য: {items.length} টি {discount > 0 && `(ছাড়: ৳${discount})`}
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span>সর্বমোট:</span>
                <span style={{ color: '#059669', fontSize: '26px' }}>
                  ৳{totalPayable.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="voice-bottom-btn-row" style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setItems([]); setDiscount(0); }}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  রিসেট
                </button>

                <button
                  type="button"
                  onClick={() => handleFinalizeSale('due')}
                  disabled={items.length === 0 || isSubmitting}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontWeight: '900',
                    fontSize: '13px',
                    cursor: items.length === 0 || isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: 'center'
                  }}
                >
                  <span>🔴</span>
                  <span>বাকি খাতা</span>
                </button>
              </div>

              <button
                type="button"
                className="voice-primary-btn"
                onClick={() => handleFinalizeSale('cash')}
                disabled={items.length === 0 || isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: '900',
                  fontSize: '14.5px',
                  cursor: items.length === 0 || isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 16px rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>🟢</span>
                <span>{isSubmitting ? 'বিক্রি হচ্ছে...' : `৳${totalPayable} নগদ বিক্রি`}</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
