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
  const { categories } = useMemo(() => getIndustryUnits(industryId), [industryId]);

  const allKnownValues = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((cat) => {
      cat.units.forEach((u) => set.add(u.value));
    });
    return set;
  }, [categories]);

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
        padding: '10px 12px',
        borderRadius: '10px',
        border: '1.5px solid #cbd5e1',
        fontSize: '13.5px',
        outline: 'none',
        background: '#fff',
        fontWeight: '700',
        color: '#0f172a',
        boxSizing: 'border-box',
        cursor: 'pointer',
        ...style
      }}
    >
      {categories.map((cat) => (
        <optgroup
          key={cat.id}
          label={cat.name}
          style={{ fontWeight: '800', color: '#4338ca', background: '#f8fafc', padding: '4px' }}
        >
          {cat.units.map((u) => (
            <option
              key={`${cat.id}-${u.value}`}
              value={u.value}
              style={{ fontWeight: '600', color: '#0f172a', background: '#fff', padding: '6px' }}
            >
              {u.label}
            </option>
          ))}
        </optgroup>
      ))}
      {value && !allKnownValues.has(value) && (
        <optgroup label="✨ অন্যান্য / কাস্টম একক" style={{ fontWeight: '800', color: '#64748b' }}>
          <option value={value} style={{ fontWeight: '600', color: '#0f172a' }}>
            {value} (বর্তমান কাস্টম)
          </option>
        </optgroup>
      )}
    </select>
  );
}
