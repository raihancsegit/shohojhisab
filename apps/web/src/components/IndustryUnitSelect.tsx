'use client';
import React, { useMemo } from 'react';
import { getIndustryUnits } from '../lib/industryConfig';

interface IndustryUnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  industryId?: string;
  style?: React.CSSProperties;
  className?: string;
  required?: boolean;
  name?: string;
  id?: string;
}

export default function IndustryUnitSelect({
  value,
  onChange,
  industryId,
  style,
  className,
  required,
  name,
  id
}: IndustryUnitSelectProps) {
  const { primaryUnits } = useMemo(() => getIndustryUnits(industryId), [industryId]);

  const hasCurrentValue = useMemo(() => {
    return primaryUnits.some(u => u.value === value);
  }, [primaryUnits, value]);

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      required={required}
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        padding: '10px 8px',
        borderRadius: '10px',
        border: '1.5px solid #cbd5e1',
        fontSize: '13px',
        outline: 'none',
        background: '#fff',
        fontWeight: '700',
        color: '#0f172a',
        boxSizing: 'border-box',
        cursor: 'pointer',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {primaryUnits.map((u) => (
        <option
          key={u.value}
          value={u.value}
          style={{ fontWeight: '600', color: '#0f172a', background: '#fff', padding: '6px' }}
        >
          {u.label}
        </option>
      ))}
      {value && !hasCurrentValue && (
        <option value={value} style={{ fontWeight: '600', color: '#0f172a' }}>
          {value} (কাস্টম একক)
        </option>
      )}
    </select>
  );
}

// 🧮 Multi-Unit Sub-Unit Breakdown & Price Calculator Widget
export interface UnitConversionRule {
  unit: string;
  defaultSubUnit: string;
  defaultRatio: number;
  ratioLabel: string;
  calculateBreakdown: (price: number, ratio: number) => Array<{ label: string; amount: number; desc: string }>;
}

export const UNIT_CONVERSIONS: Record<string, UnitConversionRule> = {
  'বস্তা': {
    unit: 'বস্তা',
    defaultSubUnit: 'কেজি',
    defaultRatio: 50,
    ratioLabel: '১ বস্তায় কত কেজি?',
    calculateBreakdown: (price, ratio) => {
      const perKg = ratio > 0 ? price / ratio : 0;
      return [
        { label: `১ বস্তা (${ratio} কেজি)`, amount: price, desc: 'সম্পূর্ণ বস্তা পাইকারি' },
        { label: '১ কেজি', amount: Math.round(perKg * 100) / 100, desc: 'খুচরা ১ কেজি' },
        { label: '৫০০ গ্রাম (হাফ কেজি)', amount: Math.round(perKg * 0.5 * 100) / 100, desc: 'অর্ধেক কেজি' },
        { label: '২৫০ গ্রাম (এক পোয়া)', amount: Math.round(perKg * 0.25 * 100) / 100, desc: 'এক পোয়া' }
      ];
    }
  },
  'বক্স': {
    unit: 'বক্স',
    defaultSubUnit: 'পাতা',
    defaultRatio: 10,
    ratioLabel: '১ বক্সে কত পাতা বা পিস?',
    calculateBreakdown: (price, ratio) => {
      const perStrip = ratio > 0 ? price / ratio : 0;
      const perTab = ratio > 0 ? (price / (ratio * 10)) : 0;
      return [
        { label: `১ বক্স (${ratio} পাতা)`, amount: price, desc: 'সম্পূর্ণ বক্স' },
        { label: '১ পাতা', amount: Math.round(perStrip * 100) / 100, desc: '১ পাতা (১০ ট্যাবলেট)' },
        { label: '১ পিস / ট্যাবলেট', amount: Math.round(perTab * 100) / 100, desc: 'খুচরা ১টি ট্যাবলেট' }
      ];
    }
  },
  'পাতা': {
    unit: 'পাতা',
    defaultSubUnit: 'ট্যাবলেট',
    defaultRatio: 10,
    ratioLabel: '১ পাতায় কতটি ট্যাবলেট/ক্যাপসুল?',
    calculateBreakdown: (price, ratio) => {
      const perTab = ratio > 0 ? price / ratio : 0;
      return [
        { label: `১ পাতা (${ratio} টি)`, amount: price, desc: '১টি সম্পূর্ণ পাতা' },
        { label: '১ পিস / ট্যাবলেট', amount: Math.round(perTab * 100) / 100, desc: 'খুচরা ১টি ট্যাবলেট' },
        { label: '২টি ট্যাবলেট', amount: Math.round(perTab * 2 * 100) / 100, desc: 'খুচরা ২টি' },
        { label: '৫টি ট্যাবলেট (হাফ পাতা)', amount: Math.round(perTab * 5 * 100) / 100, desc: 'অর্ধেক পাতা' }
      ];
    }
  },
  'কার্টন': {
    unit: 'কার্টন',
    defaultSubUnit: 'পিস',
    defaultRatio: 24,
    ratioLabel: '১ কার্টনে কত পিস বা প্যাকেট?',
    calculateBreakdown: (price, ratio) => {
      const perPcs = ratio > 0 ? price / ratio : 0;
      return [
        { label: `১ কার্টন (${ratio} পিস)`, amount: price, desc: 'সম্পূর্ণ কার্টন পাইকারি' },
        { label: '১ পিস / প্যাকেট', amount: Math.round(perPcs * 100) / 100, desc: 'খুচরা ১ পিস' },
        { label: '৬ পিস (হাফ ডজন)', amount: Math.round(perPcs * 6 * 100) / 100, desc: 'অর্ধেক ডজন' }
      ];
    }
  },
  'কেজি': {
    unit: 'কেজি',
    defaultSubUnit: 'গ্রাম',
    defaultRatio: 1000,
    ratioLabel: '১ কেজি = ১০০০ গ্রাম',
    calculateBreakdown: (price) => {
      return [
        { label: '১ কেজি', amount: price, desc: '১ কেজি খুচরা' },
        { label: '৫০০ গ্রাম (হাফ কেজি)', amount: Math.round(price * 0.5 * 100) / 100, desc: 'অর্ধেক কেজি' },
        { label: '২৫০ গ্রাম (এক পোয়া)', amount: Math.round(price * 0.25 * 100) / 100, desc: 'এক পোয়া' },
        { label: '১০০ গ্রাম', amount: Math.round(price * 0.1 * 100) / 100, desc: '১০০ গ্রাম' }
      ];
    }
  },
  'ডজন': {
    unit: 'ডজন',
    defaultSubUnit: 'পিস',
    defaultRatio: 12,
    ratioLabel: '১ ডজন = ১২ পিস',
    calculateBreakdown: (price) => {
      const perPcs = price / 12;
      return [
        { label: '১ ডজন (১২ পিস)', amount: price, desc: 'সম্পূর্ণ ১ ডজন' },
        { label: '৪ পিস (১ হালি)', amount: Math.round(perPcs * 4 * 100) / 100, desc: '১ হালি' },
        { label: '১ পিস', amount: Math.round(perPcs * 100) / 100, desc: 'খুচরা ১ পিস' }
      ];
    }
  },
  'হালি': {
    unit: 'হালি',
    defaultSubUnit: 'পিস',
    defaultRatio: 4,
    ratioLabel: '১ হালি = ৪ পিস',
    calculateBreakdown: (price) => {
      const perPcs = price / 4;
      return [
        { label: '১ হালি (৪ পিস)', amount: price, desc: '১ হালি' },
        { label: '২ পিস (অর্ধেক হালি)', amount: Math.round(perPcs * 2 * 100) / 100, desc: '২ পিস' },
        { label: '১ পিস', amount: Math.round(perPcs * 100) / 100, desc: 'খুচরা ১ পিস' }
      ];
    }
  },
  'থান': {
    unit: 'থান',
    defaultSubUnit: 'গজ',
    defaultRatio: 40,
    ratioLabel: '১ থানে কত গজ কাপড়?',
    calculateBreakdown: (price, ratio) => {
      const perGaj = ratio > 0 ? price / ratio : 0;
      return [
        { label: `১ থান (${ratio} গজ)`, amount: price, desc: 'সম্পূর্ণ থান পাইকারি' },
        { label: '১ গজ', amount: Math.round(perGaj * 100) / 100, desc: 'খুচরা ১ গজ' },
        { label: '২.৫ গজ (পাঞ্জাবি/থ্রি-পিস)', amount: Math.round(perGaj * 2.5 * 100) / 100, desc: 'আড়াই গজ' }
      ];
    }
  }
};

export function MultiUnitBreakdownPreview({
  unit,
  price,
  ratio,
  onApplyUnitPrice
}: {
  unit: string;
  price: number;
  ratio?: number;
  onApplyUnitPrice?: (unitPrice: number) => void;
}) {
  const rule = UNIT_CONVERSIONS[unit];
  if (!rule || !price || price <= 0) return null;

  const currentRatio = ratio || rule.defaultRatio;
  const breakdown = rule.calculateBreakdown(price, currentRatio);

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: '14px',
        padding: '12px 14px',
        marginTop: '10px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ fontSize: '12.5px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>💡</span>
          <span>{unit}-এর খুচরা ও সাব-ইউনিট বিক্রয় মূল্য:</span>
        </strong>
        <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: '800' }}>অটো হিসাব</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        {breakdown.map((item, idx) => (
          <div
            key={idx}
            style={{
              background: '#ffffff',
              border: idx === 0 ? '1.5px solid #c7d2fe' : '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '700' }}>
              {item.label}
            </span>
            <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', marginTop: '2px' }} className="num-font">
              ৳{item.amount.toLocaleString('en-US')}
            </strong>
            <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>{item.desc}</span>
            {onApplyUnitPrice && idx > 0 && (
              <button
                type="button"
                onClick={() => onApplyUnitPrice(item.amount)}
                style={{
                  background: '#eef2ff',
                  color: '#4f46e5',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: '800',
                  marginTop: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                মূল্য সেট করুন
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
