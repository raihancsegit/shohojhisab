'use client';
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

interface FeatureGateProps {
  children: React.ReactNode;
  featureKey?: string;
  requiredPlan?: 'basic' | 'pro' | 'enterprise';
  requiredPermission?: string;
  title?: string;
  description?: string;
  fallback?: React.ReactNode;
  inline?: boolean;
}

export default function FeatureGate({
  children,
  featureKey,
  requiredPlan,
  requiredPermission,
  title,
  description,
  fallback,
  inline = false
}: FeatureGateProps) {
  const { tenant, userRole, activeRoleMode, hasPlanAccess, isFeatureEnabled, hasPermission } = useAuth();

  // Admin always has full access
  if (userRole === 'admin') {
    return <>{children}</>;
  }

  // If role is staff, check permission
  if (requiredPermission && activeRoleMode === 'staff') {
    if (!hasPermission(requiredPermission)) {
      if (fallback) return <>{fallback}</>;
      return (
        <div style={{
          padding: '24px',
          background: '#fef2f2',
          border: '1.5px solid #fecaca',
          borderRadius: '16px',
          color: '#991b1b',
          textAlign: 'center',
          margin: '20px 0'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>
            অনুমতি নেই (Staff Restricted)
          </h3>
          <p style={{ fontSize: '14px', color: '#b91c1c' }}>
            এই অপশনটি ব্যবহার করার অনুমতি আপনার কর্মচারী একাউন্টে দেওয়া হয়নি। দোকান মালিকের সাথে যোগাযোগ করুন।
          </p>
        </div>
      );
    }
  }

  // Check Plan Access
  if (requiredPlan && !hasPlanAccess(requiredPlan)) {
    if (fallback) return <>{fallback}</>;

    const planNames: Record<string, string> = {
      basic: 'বেসিক দোকান (Starter)',
      pro: 'প্রো শপ (Pro Shop)',
      enterprise: 'মাল্টি-ব্রাঞ্চ (Enterprise)'
    };

    const targetPlanName = planNames[requiredPlan] || requiredPlan;

    if (inline) {
      return (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#64748b'
        }}>
          <span>🔒 {targetPlanName} প্ল্যান প্রয়োজন</span>
          <Link
            href="/subscription"
            style={{
              color: '#4f46e5',
              fontWeight: '700',
              textDecoration: 'underline'
            }}
          >
            আপগ্রেড
          </Link>
        </div>
      );
    }

    return (
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '40px 24px',
        textAlign: 'center',
        margin: '24px 0',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          color: '#b45309',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          marginBottom: '16px',
          border: '1.5px solid #fcd34d'
        }}>
          👑
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
          {title || `এই ফিচারটির জন্য "${targetPlanName}" লাইসেন্স প্রয়োজন`}
        </h2>

        <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '520px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
          {description || `আপনার বর্তমান প্ল্যানে এই ফিচারটি সক্রিয় নেই। সহজে বিকাশ বা নগদ পেমেন্ট করে তাৎক্ষণিক ১ মিনিটে ${targetPlanName} লাইসেন্সে আপগ্রেড করুন।`}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href="/subscription"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              padding: '12px 28px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '800',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>💎 লাইসেন্স আপগ্রেড করুন</span>
            <span>→</span>
          </Link>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              color: '#475569',
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              textDecoration: 'none'
            }}
          >
            হোমে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  // Check specific feature toggle
  if (featureKey && !isFeatureEnabled(featureKey as any)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div style={{
        background: '#f8fafc',
        border: '1.5px dashed #cbd5e1',
        borderRadius: '16px',
        padding: '30px 20px',
        textAlign: 'center',
        margin: '20px 0'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚙️</div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
          {title || 'এই ফিচারটি বর্তমানে বন্ধ আছে'}
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '460px', margin: '0 auto 16px auto' }}>
          {description || 'ফিচার সেটিংসে গিয়ে এই সুবিধাটি চালু করতে পারেন অথবা সুপার অ্যাডমিনের সহায়তা নিতে পারেন।'}
        </p>
        <Link
          href="/settings"
          style={{
            display: 'inline-block',
            background: '#0f172a',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            textDecoration: 'none'
          }}
        >
          সেটিংস দেখুন
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
