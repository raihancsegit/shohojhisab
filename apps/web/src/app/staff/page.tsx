'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { getIndustryTheme } from '../../lib/industryConfig';

interface StaffMember {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  pin: string;
  role: 'manager' | 'cashier' | 'salesman' | 'pharmacist' | 'custom';
  permissions: string[];
  branchId?: string | null;
  branchName?: string;
  baseSalary?: number;
  commissionPercent?: number;
  earnedCommission?: number;
  maxDiscountPercent?: number;
  salesTarget?: number;
  isActive: boolean;
  createdAt: string;
  totalSalesCount?: number;
  totalSalesAmount?: number;
  todaySalesCount?: number;
  todaySalesAmount?: number;
  attendanceToday?: {
    status: string;
    checkInTime: string;
    checkOutTime?: string;
    workingHours?: number;
  } | null;
  hasActiveShift?: boolean;
}

const ROLE_DEFINITIONS: Record<string, {
  label: string;
  icon: string;
  badgeBg: string;
  badgeColor: string;
  description: string;
  defaultPermissions: string[];
}> = {
  manager: {
    label: 'ম্যানেজার',
    icon: '💼',
    badgeBg: '#e0e7ff',
    badgeColor: '#3730a3',
    description: 'দৈনিক বিক্রয়, স্টক, বাকি খাতা, খরচের ভাউচার, ডিলার কেনাকাটা ও সেলস রিপোর্ট (দোকানের মূল মালিক সেটিংস ছাড়া)',
    defaultPermissions: ['pos', 'stock', 'products_search', 'khata_view', 'khata_collect', 'dealers', 'expenses_create', 'expenses_view', 'reports_view', 'expiry', 'discount', 'soundbox']
  },
  cashier: {
    label: 'ক্যাশিয়ার',
    icon: '🛒',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    description: 'দ্রুত POS বিক্রি, মেমো প্রিন্ট, বকেয়া জমা উশুল, দৈনিক খরচের এন্ট্রি (কেনা দাম ও নিট লাভ সম্পূর্ণ গোপন থাকবে)',
    defaultPermissions: ['pos', 'products_search', 'khata_view', 'khata_collect', 'expenses_create', 'discount', 'soundbox']
  },
  pharmacist: {
    label: 'ফার্মাসিস্ট / স্টক ইনচার্জ',
    icon: '💊',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    description: 'মেয়াদ রাডার, শর্ট লিস্ট, স্টক ইন, চালান OCR ও নতুন ঔষধ যুক্ত (আসল আর্থিক লাভ ও ক্যাশ কাউন্টার গোপন)',
    defaultPermissions: ['pos', 'stock', 'products_search', 'expiry', 'dealers', 'soundbox']
  },
  salesman: {
    label: 'সেলসম্যান / বিক্রয়কর্মী',
    icon: '👔',
    badgeBg: '#f1f5f9',
    badgeColor: '#334155',
    description: 'POS মেমো তৈরি, পণ্য অনুসন্ধান ও দাম দেখা (বাকি খাতা বা ক্যাশ রেজিস্টার ক্লোজ অ্যাক্সেস থাকবে না)',
    defaultPermissions: ['pos', 'products_search', 'stock_view', 'soundbox']
  },
  custom: {
    label: 'কাস্টম পারমিশন',
    icon: '⚙️',
    badgeBg: '#fae8ff',
    badgeColor: '#86198f',
    description: 'আপনার প্রয়োজনমতো যেকোনো নির্দিষ্ট ফিচার বা পারমিশন চালু বা বন্ধ রাখুন।',
    defaultPermissions: ['pos', 'products_search']
  }
};

const ALL_PERMISSIONS = [
  { key: 'pos', label: '🛒 POS বিক্রি ও মেমো তৈরি', category: 'বিক্রয়' },
  { key: 'products_search', label: '🔍 পণ্য ও বর্তমান বিক্রয়মূল্য দেখা', category: 'বিক্রয়' },
  { key: 'discount', label: '🏷️ স্পেশাল ডিসকাউন্ট দেওয়ার ক্ষমতা', category: 'বিক্রয়' },
  { key: 'stock', label: '📦 স্টক ইনভেন্টরি যুক্ত ও পরিবর্তন', category: 'ইনভেন্টরি' },
  { key: 'stock_view', label: '👁️ শুধু স্টকে কত পণ্য আছে দেখা', category: 'ইনভেন্টরি' },
  { key: 'expiry', label: '⏳ মেয়াদ ট্র্যাকার ও ফার্মেসি রাডার', category: 'ইনভেন্টরি' },
  { key: 'khata_view', label: '📒 গ্রাহকের বাকি খাতা ও ব্যালেন্স দেখা', category: 'গ্রাহক খাতা' },
  { key: 'khata_collect', label: '💵 গ্রাহকের বকেয়া টাকা জমা ও উশুল', category: 'গ্রাহক খাতা' },
  { key: 'dealers', label: '🚚 ডিলার ও পাইকারি মহাজন খাতা', category: 'ডিলার' },
  { key: 'expenses_create', label: '💸 দৈনিক দোকান খরচের ভাউচার এন্ট্রি', category: 'খরচ' },
  { key: 'expenses_view', label: '📋 খরচের তালিকা ও মোট হিসাব দেখা', category: 'খরচ' },
  { key: 'reports_view', label: '📊 সেলস ও লাভ-ক্ষতি রিপোর্ট দেখা', category: 'রিপোর্ট' },
  { key: 'soundbox', label: '🔊 ডিজিটাল সাউন্ডবক্স নিয়ন্ত্রণ', category: 'ডিভাইস' }
];

export default function StaffManagementPage() {
  const { tenant, activeRoleMode, currentStaffUser, triggerHaptic, speakAnnouncement, formatPrice } = useAuth();
  const theme = getIndustryTheme(tenant?.industryId);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'staff' | 'shifts' | 'attendance' | 'commission' | 'salary' | 'audit'>('staff');

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // Shift States
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftList, setShiftList] = useState<any[]>([]);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState('1000');
  const [actualCashInput, setActualCashInput] = useState('');
  const [shiftNoteInput, setShiftNoteInput] = useState('');
  const [zReportData, setZReportData] = useState<any>(null);

  // Attendance States
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [checkInPin, setCheckInPin] = useState('');
  const [selectedStaffForAtt, setSelectedStaffForAtt] = useState('');
  const [attMessage, setAttMessage] = useState('');

  // Salary & Advances States
  const [salaryLedger, setSalaryLedger] = useState<any[]>([]);
  const [advancesList, setAdvancesList] = useState<any[]>([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advStaffId, setAdvStaffId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advReason, setAdvReason] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Add/Edit Staff Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showIdCardModal, setShowIdCardModal] = useState<StaffMember | null>(null);
  const [showPinVisibility, setShowPinVisibility] = useState<Record<string, boolean>>({});

  // Staff Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<'manager' | 'cashier' | 'salesman' | 'pharmacist' | 'custom'>('cashier');
  const [formBranchId, setFormBranchId] = useState('');
  const [formBaseSalary, setFormBaseSalary] = useState('15000');
  const [formCommissionPercent, setFormCommissionPercent] = useState('1.5');
  const [formMaxDiscountPercent, setFormMaxDiscountPercent] = useState('5');
  const [formSalesTarget, setFormSalesTarget] = useState('100000');
  const [formPermissions, setFormPermissions] = useState<string[]>(ROLE_DEFINITIONS.cashier.defaultPermissions);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load All Data
  const loadData = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      const [staffRes, branchRes, shiftActiveRes, shiftHistoryRes, attRes, salRes, advRes, auditRes] = await Promise.all([
        fetch(`/api/staff?tenantId=${tenant.id}`),
        fetch(`/api/branches?tenantId=${tenant.id}`),
        fetch(`/api/staff/shifts/active?tenantId=${tenant.id}`),
        fetch(`/api/staff/shifts?tenantId=${tenant.id}`),
        fetch(`/api/staff/attendance?tenantId=${tenant.id}`),
        fetch(`/api/staff/salary-ledger?tenantId=${tenant.id}&month=${selectedMonth}`),
        fetch(`/api/staff/advances?tenantId=${tenant.id}`),
        fetch(`/api/staff/audit-logs?tenantId=${tenant.id}`)
      ]);

      if (staffRes.ok) setStaffList(await staffRes.json());
      if (branchRes.ok) setBranches(await branchRes.json());
      if (shiftActiveRes.ok) {
        const sData = await shiftActiveRes.json();
        setActiveShift(sData.activeShift);
        if (sData.activeShift) {
          setActualCashInput(String(sData.activeShift.expectedCashInDrawer || ''));
        }
      }
      if (shiftHistoryRes.ok) setShiftList(await shiftHistoryRes.json());
      if (attRes.ok) setAttendanceList(await attRes.json());
      if (salRes.ok) setSalaryLedger(await salRes.json());
      if (advRes.ok) setAdvancesList(await advRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (e) {
      console.error('Failed to load staff data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant?.id, selectedMonth]);

  // Open Add Modal
  const handleOpenAdd = () => {
    triggerHaptic('light');
    setEditingStaff(null);
    setFormName('');
    setFormPhone('');
    setFormPin(Math.floor(1000 + Math.random() * 9000).toString());
    setFormRole(tenant?.industryId === 'cat-pharmacy' ? 'pharmacist' : 'cashier');
    setFormBranchId(branches.length > 0 ? branches[0].id : '');
    setFormBaseSalary('15000');
    setFormCommissionPercent('1');
    setFormMaxDiscountPercent('5');
    setFormSalesTarget('100000');
    setFormPermissions(
      tenant?.industryId === 'cat-pharmacy' 
        ? ROLE_DEFINITIONS.pharmacist.defaultPermissions 
        : ROLE_DEFINITIONS.cashier.defaultPermissions
    );
    setFormIsActive(true);
    setFormError('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (staff: StaffMember) => {
    triggerHaptic('light');
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormPhone(staff.phone || '');
    setFormPin(staff.pin);
    setFormRole(staff.role);
    setFormBranchId(staff.branchId || '');
    setFormBaseSalary(String(staff.baseSalary || 15000));
    setFormCommissionPercent(String(staff.commissionPercent || 0));
    setFormMaxDiscountPercent(String(staff.maxDiscountPercent || 10));
    setFormSalesTarget(String(staff.salesTarget || 0));
    setFormPermissions(staff.permissions || []);
    setFormIsActive(staff.isActive);
    setFormError('');
    setShowModal(true);
  };

  // Role Change in Form auto-populates defaults
  const handleRoleChange = (role: 'manager' | 'cashier' | 'salesman' | 'pharmacist' | 'custom') => {
    setFormRole(role);
    if (ROLE_DEFINITIONS[role]) {
      setFormPermissions(ROLE_DEFINITIONS[role].defaultPermissions);
      if (role === 'cashier') setFormMaxDiscountPercent('5');
      else if (role === 'manager') setFormMaxDiscountPercent('15');
      else setFormMaxDiscountPercent('0');
    }
  };

  // Toggle permission
  const handleTogglePermission = (permKey: string) => {
    triggerHaptic('light');
    setFormPermissions(prev =>
      prev.includes(permKey) ? prev.filter(k => k !== permKey) : [...prev, permKey]
    );
  };

  // Submit Staff Form
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('কর্মচারীর নাম আবশ্যক');
      return;
    }
    if (!formPin.trim() || formPin.trim().length < 4) {
      setFormError('দয়া করে ৪-ডিজিটের একটি গোপন লগইন পিন দিন');
      return;
    }

    try {
      setSaving(true);
      setFormError('');
      triggerHaptic('medium');

      const payload = {
        tenantId: tenant?.id,
        id: editingStaff ? editingStaff.id : undefined,
        name: formName.trim(),
        phone: formPhone.trim(),
        pin: formPin.trim(),
        role: formRole,
        branchId: formBranchId || null,
        baseSalary: Number(formBaseSalary) || 0,
        commissionPercent: Number(formCommissionPercent) || 0,
        maxDiscountPercent: Number(formMaxDiscountPercent) || 10,
        salesTarget: Number(formSalesTarget) || 0,
        permissions: formPermissions,
        isActive: formIsActive ? 1 : 0
      };

      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        speakAnnouncement(`${formName} এর তথ্য সফলভাবে সংরক্ষিত হয়েছে`);
        setShowModal(false);
        await loadData();
      } else {
        setFormError(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      setFormError('সার্ভারে যোগাযোগ করা যায়নি');
    } finally {
      setSaving(false);
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${name}" কে ডিলিট করতে চান?`)) return;
    try {
      triggerHaptic('warning');
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        speakAnnouncement(`${name} কে ডিলিট করা হয়েছে`);
        await loadData();
      }
    } catch (e) {
      alert('ডিলিট করা যায়নি');
    }
  };

  // Toggle PIN visibility
  const togglePin = (id: string) => {
    triggerHaptic('light');
    setShowPinVisibility(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Shift Handover Actions
  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    try {
      triggerHaptic('success');
      const res = await fetch('/api/staff/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          staffId: currentStaffUser?.id || 'owner',
          staffName: currentStaffUser?.name || tenant.ownerName,
          openingFloat: Number(openingFloatInput) || 0
        })
      });
      if (res.ok) {
        speakAnnouncement('ক্যাশ ড্রয়ার শিফট সফলভাবে শুরু হয়েছে');
        setShowOpenShiftModal(false);
        await loadData();
      }
    } catch (e) {}
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift?.id) return;
    try {
      triggerHaptic('success');
      const res = await fetch('/api/staff/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          actualCash: Number(actualCashInput) || 0,
          note: shiftNoteInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        speakAnnouncement('শিফট সমাপ্ত ও ক্যাশ মেলানো সম্পন্ন হয়েছে');
        setZReportData(data.zReport);
        setShowCloseShiftModal(false);
        await loadData();
      }
    } catch (e) {}
  };

  // 2. Attendance Check-in Action
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedStaffForAtt) return;
    try {
      triggerHaptic('success');
      const res = await fetch('/api/staff/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          staffId: selectedStaffForAtt,
          pin: checkInPin
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAttMessage(data.message);
        setCheckInPin('');
        speakAnnouncement('হাজিরা সম্পন্ন হয়েছে');
        await loadData();
      } else {
        setAttMessage(data.error || 'হাজিরা নেওয়া সম্ভব হয়নি');
      }
    } catch (e) {}
  };

  // 3. Salary Pay Action
  const handlePaySalary = async (item: any) => {
    if (!window.confirm(`${item.staffName} এর ${item.month} মাসের মোট ৳${item.netPayable} টাকা বেতন পরিশোধ করতে চান?`)) return;
    try {
      triggerHaptic('success');
      const res = await fetch('/api/staff/salary-ledger/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant?.id,
          staffId: item.staffId,
          staffName: item.staffName,
          month: item.month,
          amount: item.netPayable,
          paymentMethod: 'cash'
        })
      });
      if (res.ok) {
        speakAnnouncement(`${item.staffName} এর বেতন পরিশোধ সম্পন্ন হয়েছে`);
        await loadData();
      }
    } catch (e) {}
  };

  // 4. Advance Loan Action
  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !advStaffId || !advAmount) return;
    const staff = staffList.find(s => s.id === advStaffId);
    try {
      triggerHaptic('success');
      const res = await fetch('/api/staff/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          staffId: advStaffId,
          staffName: staff ? staff.name : 'স্টাফ',
          amount: Number(advAmount),
          reason: advReason
        })
      });
      if (res.ok) {
        speakAnnouncement('অগ্রিম খাতা এন্ট্রি সম্পন্ন হয়েছে');
        setShowAdvanceModal(false);
        setAdvAmount('');
        setAdvReason('');
        await loadData();
      }
    } catch (e) {}
  };

  // Filtered List
  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.phone && s.phone.includes(searchQuery));
    const matchesRole = selectedRoleFilter === 'all' || s.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // KPI Calculations
  const totalStaffCount = staffList.length;
  const cashiersCount = staffList.filter(s => s.role === 'cashier' || s.role === 'salesman').length;
  const managersCount = staffList.filter(s => s.role === 'manager').length;
  const todayStaffSalesTotal = staffList.reduce((acc, s) => acc + (s.todaySalesAmount || 0), 0);

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px 16px 80px',
      fontFamily: "'Hind Siliguri', 'Outfit', sans-serif"
    }}>

      {/* Top Banner & Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
        borderRadius: '24px',
        padding: '28px 24px',
        color: '#ffffff',
        marginBottom: '20px',
        boxShadow: '0 10px 30px rgba(49, 46, 129, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '800', marginBottom: '10px' }}>
              <span>👥 স্মার্ট কর্মচারী ও ক্যাশিয়ার প্ল্যাটফর্ম</span>
              <span>•</span>
              <span>{tenant?.shopName || 'দোকান'}</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 6px', color: '#ffffff' }}>
              স্টাফ ম্যানেজমেন্ট, শিফট ও পেরোল খাতা
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#c7d2fe', maxWidth: '700px', lineHeight: 1.5 }}>
              কর্মচারীদের ৪-ডিজিটের লগইন পিন, ক্যাশিয়ার শিফট হস্তান্তর ও ক্যাশ ড্রয়ার মিলানো (Z-Report), ডিজিটাল হাজিরা, মাসিক বেতন ও বিক্রয় কমিশন খাতা।
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {activeShift ? (
              <button
                onClick={() => { triggerHaptic('light'); setShowCloseShiftModal(true); }}
                style={{
                  background: '#f59e0b',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                <span>🌙</span> শিফট শেষ ও ক্যাশ মেলান
              </button>
            ) : (
              <button
                onClick={() => { triggerHaptic('light'); setShowOpenShiftModal(true); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>☀️</span> নতুন শিফট ওপেন করুন
              </button>
            )}

            <button
              onClick={handleOpenAdd}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <span>➕</span> নতুন কর্মচারী যুক্ত করুন
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        background: '#ffffff',
        padding: '6px',
        borderRadius: '16px',
        border: '1.5px solid #e2e8f0',
        marginBottom: '20px',
        overflowX: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        {[
          { id: 'staff', label: '👥 কর্মচারী ও পারমিশন', count: totalStaffCount },
          { id: 'shifts', label: '💵 ক্যাশিয়ার শিফট ও হ্যান্ডওভার', badge: activeShift ? '🟢 শিফট চালু' : null },
          { id: 'attendance', label: '🕒 ডিজিটাল হাজিরা ও ডিউটি লগ' },
          { id: 'commission', label: '🎯 সেলস কমিশন ও লিডারবোর্ড' },
          { id: 'salary', label: '📒 বেতন ও অগ্রিম খাতা' },
          { id: 'audit', label: '📜 সিকিউরিটি অডিট ট্রেইল' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { triggerHaptic('light'); setActiveTab(tab.id as any); }}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === tab.id ? '#4f46e5' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#64748b',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{ background: '#10b981', color: '#fff', fontSize: '10.5px', padding: '1px 6px', borderRadius: '99px', fontWeight: '900' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============================================================
          TAB 1: STAFF DIRECTORY & RBAC
          ============================================================ */}
      {activeTab === 'staff' && (
        <>
          {/* KPI Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '24px'
          }}>
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '18px', border: '1.5px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#64748b' }}>মোট স্টাফ সংখ্যা</span>
                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '5px 8px', borderRadius: '8px', fontSize: '15px' }}>👥</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }} className="num-font">
                {totalStaffCount} জন
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#10b981', fontWeight: '700' }}>✓ সকল সক্রিয় কর্মচারী</p>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '18px', border: '1.5px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#64748b' }}>ক্যাশিয়ার ও বিক্রয়কর্মী</span>
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '5px 8px', borderRadius: '8px', fontSize: '15px' }}>🛒</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }} className="num-font">
                {cashiersCount} জন
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>কাউন্টার বিলিং ও কালেকশন</p>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '18px', border: '1.5px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#64748b' }}>ম্যানেজার ও ইনচার্জ</span>
                <span style={{ background: '#fef3c7', color: '#b45309', padding: '5px 8px', borderRadius: '8px', fontSize: '15px' }}>💼</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }} className="num-font">
                {managersCount} জন
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>স্টক ও শাখা পরিচালনা</p>
            </div>

            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '18px', border: '1.5px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#64748b' }}>স্টাফদের আজকের সেলস</span>
                <span style={{ background: '#fae8ff', color: '#a21caf', padding: '5px 8px', borderRadius: '8px', fontSize: '15px' }}>⚡</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#4f46e5' }} className="num-font">
                ৳ {formatPrice(todayStaffSalesTotal)}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>আজকের কাউন্টার মেমো থেকে</p>
            </div>
          </div>

          {/* Staff Table Container */}
          <div style={{
            background: '#ffffff',
            borderRadius: '22px',
            border: '1.5px solid #e2e8f0',
            padding: '22px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
          }}>
            {/* Search and Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                <input
                  type="text"
                  placeholder="স্টাফের নাম বা মোবাইল খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'all', label: 'সকল' },
                  { id: 'cashier', label: 'ক্যাশিয়ার' },
                  { id: 'manager', label: 'ম্যানেজার' },
                  { id: 'salesman', label: 'বিক্রয়কর্মী' },
                  { id: 'pharmacist', label: 'ফার্মাসিস্ট' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { triggerHaptic('light'); setSelectedRoleFilter(tab.id); }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '10px',
                      border: selectedRoleFilter === tab.id ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                      background: selectedRoleFilter === tab.id ? '#eef2ff' : '#ffffff',
                      color: selectedRoleFilter === tab.id ? '#4f46e5' : '#64748b',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '12.5px', fontWeight: '800' }}>
                    <th style={{ padding: '12px 14px' }}>কর্মচারীর নাম ও শাখা</th>
                    <th style={{ padding: '12px 14px' }}>রোল (Role)</th>
                    <th style={{ padding: '12px 14px' }}>মোবাইল ও পিন</th>
                    <th style={{ padding: '12px 14px' }}>বেতন ও কমিশন</th>
                    <th style={{ padding: '12px 14px' }}>ডিসকাউন্ট সীমা</th>
                    <th style={{ padding: '12px 14px' }}>আজকের সেলস</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => {
                    const roleDef = ROLE_DEFINITIONS[staff.role] || ROLE_DEFINITIONS.custom;
                    const isVisible = showPinVisibility[staff.id];

                    return (
                      <tr key={staff.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Name */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '12px',
                              background: roleDef.badgeBg, color: roleDef.badgeColor,
                              display: 'grid', placeItems: 'center', fontSize: '18px', fontWeight: '900', flexShrink: 0
                            }}>
                              {roleDef.icon}
                            </div>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>{staff.name}</div>
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>🏢 {staff.branchName || 'প্রধান শাখা'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            background: roleDef.badgeBg, color: roleDef.badgeColor,
                            padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <span>{roleDef.icon}</span>
                            <span>{roleDef.label}</span>
                          </span>
                        </td>

                        {/* Phone & PIN */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontSize: '12.5px', color: '#334155', fontWeight: '600' }} className="num-font">
                            📱 {staff.phone || '—'}
                          </div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px', background: '#f8fafc', padding: '2px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '12px', fontWeight: '900', letterSpacing: isVisible ? '2px' : '3px', color: '#4f46e5' }} className="num-font">
                              {isVisible ? staff.pin : '••••'}
                            </span>
                            <button type="button" onClick={() => togglePin(staff.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#64748b' }}>
                              {isVisible ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </td>

                        {/* Salary & Commission */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }} className="num-font">
                            ৳ {formatPrice(staff.baseSalary || 0)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>
                            কমিশন: {staff.commissionPercent || 0}% (৳ {formatPrice(staff.earnedCommission || 0)})
                          </div>
                        </td>

                        {/* Discount Limit */}
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            background: (staff.maxDiscountPercent || 0) > 10 ? '#fee2e2' : '#f1f5f9',
                            color: (staff.maxDiscountPercent || 0) > 10 ? '#dc2626' : '#475569',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800'
                          }}>
                            সর্বোচ্চ {staff.maxDiscountPercent || 0}%
                          </span>
                        </td>

                        {/* Sales Stats */}
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#10b981' }} className="num-font">
                            ৳ {formatPrice(staff.todaySalesAmount || 0)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {staff.todaySalesCount || 0} টি মেমো (মোট: ৳ {formatPrice(staff.totalSalesAmount || 0)})
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => { triggerHaptic('light'); setShowIdCardModal(staff); }}
                              style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                              title="আইডি ব্যাজ"
                            >
                              🪪 আইডি
                            </button>
                            <button
                              onClick={() => handleOpenEdit(staff)}
                              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff.id, staff.name)}
                              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================================================
          TAB 2: SHIFT HANDOVER & CASH DRAWER (Z-REPORT)
          ============================================================ */}
      {activeTab === 'shifts' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Active Shift Card */}
          {activeShift ? (
            <div style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
              borderRadius: '20px',
              padding: '24px',
              color: '#ffffff',
              boxShadow: '0 10px 25px rgba(4, 120, 87, 0.25)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '99px', fontSize: '11.5px', fontWeight: '800', marginBottom: '6px' }}>
                    <span>🟢 লাইভ কাউন্টার শিফট রানিং</span>
                  </div>
                  <h2 style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 2px' }}>
                    ক্যাশিয়ার: {activeShift.staff_name}
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#a7f3d0' }}>
                    শিফট শুরুর সময়: {new Date(activeShift.opening_time).toLocaleTimeString('bn-BD')} (প্রারম্ভিক ক্যাশ: ৳ {formatPrice(activeShift.opening_float)})
                  </p>
                </div>

                <button
                  onClick={() => setShowCloseShiftModal(true)}
                  style={{
                    background: '#ffffff',
                    color: '#065f46',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  🌙 শিফট ক্লোজ ও ক্যাশ মেলান (Z-Report)
                </button>
              </div>

              {/* Real-time Drawer Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.12)', padding: '14px', borderRadius: '14px' }}>
                  <div style={{ fontSize: '11.5px', color: '#a7f3d0', fontWeight: '700' }}>নগদ বিক্রয় (Cash Sales)</div>
                  <div style={{ fontSize: '22px', fontWeight: '900' }} className="num-font">৳ {formatPrice(activeShift.currentCashSales || 0)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.12)', padding: '14px', borderRadius: '14px' }}>
                  <div style={{ fontSize: '11.5px', color: '#a7f3d0', fontWeight: '700' }}>ডিজিটাল বিক্রয় (bKash/Nagad)</div>
                  <div style={{ fontSize: '22px', fontWeight: '900' }} className="num-font">৳ {formatPrice(activeShift.currentDigitalSales || 0)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.12)', padding: '14px', borderRadius: '14px' }}>
                  <div style={{ fontSize: '11.5px', color: '#a7f3d0', fontWeight: '700' }}>দোকান খরচ কর্তন</div>
                  <div style={{ fontSize: '22px', fontWeight: '900' }} className="num-font">- ৳ {formatPrice(activeShift.currentExpenses || 0)}</div>
                </div>
                <div style={{ background: '#ffffff', color: '#065f46', padding: '14px', borderRadius: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#047857' }}>ড্রয়ারে মোট ক্যাশ থাকা উচিত</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#065f46' }} className="num-font">৳ {formatPrice(activeShift.expectedCashInDrawer || 0)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '30px 20px', border: '1.5px dashed #cbd5e1', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>☀️</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', color: '#1e293b' }}>বর্তমানে কোনো ক্যাশিয়ার শিফট চালু নেই</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>কাউন্টারে বিক্রি শুরু করার পূর্বে প্রারম্ভিক ক্যাশ দিয়ে শিফট শুরু করুন।</p>
              <button
                onClick={() => setShowOpenShiftModal(true)}
                style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
              >
                ☀️ নতুন শিফট শুরু করুন (Start Shift)
              </button>
            </div>
          )}

          {/* Past Shift History Table */}
          <div style={{ background: '#ffffff', borderRadius: '20px', border: '1.5px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
              📜 পূর্ববর্তী শিফট ও ক্যাশ হ্যান্ডওভার হিস্ট্রি (Shift Logs)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontWeight: '800' }}>
                    <th style={{ padding: '10px 12px' }}>ক্যাশিয়ার</th>
                    <th style={{ padding: '10px 12px' }}>শিফট সময়</th>
                    <th style={{ padding: '10px 12px' }}>প্রারম্ভিক ক্যাশ</th>
                    <th style={{ padding: '10px 12px' }}>মোট বিক্রি (নগদ)</th>
                    <th style={{ padding: '10px 12px' }}>হিসাব অনুযায়ী জমা</th>
                    <th style={{ padding: '10px 12px' }}>গুনে পাওয়া ক্যাশ</th>
                    <th style={{ padding: '10px 12px' }}>গরমিল (Difference)</th>
                    <th style={{ padding: '10px 12px' }}>স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftList.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px', fontWeight: '800', color: '#0f172a' }}>{s.staff_name}</td>
                      <td style={{ padding: '12px', fontSize: '11.5px', color: '#64748b' }}>
                        {new Date(s.opening_time).toLocaleDateString('bn-BD')} {new Date(s.opening_time).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px' }} className="num-font">৳ {formatPrice(s.opening_float)}</td>
                      <td style={{ padding: '12px', color: '#16a34a', fontWeight: '800' }} className="num-font">৳ {formatPrice(s.cash_sales_total)}</td>
                      <td style={{ padding: '12px', fontWeight: '800' }} className="num-font">৳ {formatPrice(s.expected_cash)}</td>
                      <td style={{ padding: '12px', fontWeight: '800' }} className="num-font">৳ {formatPrice(s.actual_cash)}</td>
                      <td style={{ padding: '12px' }}>
                        {s.difference === 0 ? (
                          <span style={{ color: '#16a34a', fontWeight: '800' }}>✓ মিল (০)</span>
                        ) : s.difference < 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: '800' }}>⚠️ শর্ট: -৳{Math.abs(s.difference)}</span>
                        ) : (
                          <span style={{ color: '#2563eb', fontWeight: '800' }}>+৳{s.difference} বেশি</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: s.status === 'open' ? '#dcfce7' : '#f1f5f9',
                          color: s.status === 'open' ? '#15803d' : '#475569',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800'
                        }}>
                          {s.status === 'open' ? '🟢 রানিং' : '✓ ক্লোজড'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: ATTENDANCE & TIME CLOCK
          ============================================================ */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'flex-start' }}>
          {/* Check-In Keypad Card */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '22px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
              🕒 ডিজিটাল হাজিরা দিন (Check-In)
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
              কর্মচারী সিলেক্ট করে ৪-ডিজিট পিন দিয়ে চেক-ইন করুন
            </p>

            {attMessage && (
              <div style={{ background: '#eef2ff', color: '#4338ca', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>
                {attMessage}
              </div>
            )}

            <form onSubmit={handleCheckInSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>কর্মচারী সিলেক্ট করুন:</label>
                <select
                  value={selectedStaffForAtt}
                  onChange={(e) => setSelectedStaffForAtt(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', fontWeight: '700', outline: 'none', background: '#fff' }}
                >
                  <option value="">কর্মচারী নির্বাচন করুন...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>৪-ডিজিটের পিন কোড:</label>
                <input
                  type="password"
                  maxLength={6}
                  value={checkInPin}
                  onChange={(e) => setCheckInPin(e.target.value)}
                  placeholder="••••"
                  className="num-font"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '18px', letterSpacing: '4px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button
                  type="submit"
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}
                >
                  ✓ চেক-ইন (Check In)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedStaffForAtt) return;
                    await fetch('/api/staff/attendance/check-out', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tenantId: tenant?.id, staffId: selectedStaffForAtt })
                    });
                    await loadData();
                  }}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '10px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}
                >
                  👋 চেক-আউট
                </button>
              </div>
            </form>
          </div>

          {/* Attendance Log Table */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
              📅 আজকের ও সাম্প্রতিক হাজিরা রেকর্ড
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontWeight: '800' }}>
                    <th style={{ padding: '10px' }}>তারিখ</th>
                    <th style={{ padding: '10px' }}>কর্মচারীর নাম</th>
                    <th style={{ padding: '10px' }}>চেক-ইন সময়</th>
                    <th style={{ padding: '10px' }}>চেক-আউট সময়</th>
                    <th style={{ padding: '10px' }}>স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceList.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '10px', fontWeight: '600' }}>{a.date}</td>
                      <td style={{ padding: '10px', fontWeight: '800', color: '#0f172a' }}>{a.staff_name}</td>
                      <td style={{ padding: '10px', color: '#16a34a', fontWeight: '800' }}>{a.check_in_time}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{a.check_out_time || '—'}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                          ✓ উপস্থিত
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: COMMISSION & LEADERBOARD
          ============================================================ */}
      {activeTab === 'commission' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            borderRadius: '20px',
            padding: '24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 4px' }}>
                🏆 স্টাফ সেলস লিডারবোর্ড ও কমিশন ট্র্যাকার
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#c7d2fe' }}>
                কর্মচারীদের বিক্রয় টার্গেট অর্জন ও স্বয়ংক্রিয় কমিশন হিসাব
              </p>
            </div>
          </div>

          {/* Ranking Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {staffList.map((staff, idx) => {
              const target = staff.salesTarget || 100000;
              const achieved = staff.totalSalesAmount || 0;
              const percent = Math.min(100, Math.round((achieved / target) * 100));

              return (
                <div key={staff.id} style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  padding: '20px',
                  border: idx === 0 ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                  position: 'relative'
                }}>
                  {idx === 0 && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' }}>
                      👑 টপ সেলার #১
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', display: 'grid', placeItems: 'center', fontSize: '20px', fontWeight: '900' }}>
                      {ROLE_DEFINITIONS[staff.role]?.icon || '👤'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>{staff.name}</h3>
                      <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>{ROLE_DEFINITIONS[staff.role]?.label || 'স্টাফ'}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>টার্গেট অগ্রগতি ({percent}%)</span>
                      <span style={{ color: '#0f172a' }} className="num-font">৳ {formatPrice(achieved)} / ৳ {formatPrice(target)}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: percent >= 100 ? '#10b981' : '#4f46e5', borderRadius: '99px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>কমিশন হার</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{staff.commissionPercent || 0}%</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>অর্জিত কমিশন</div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#16a34a' }} className="num-font">৳ {formatPrice(staff.earnedCommission || 0)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 5: SALARY & ADVANCE REGISTER
          ============================================================ */}
      {activeTab === 'salary' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Action Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#ffffff', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>বেতনের মাস:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: '800', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <button
              onClick={() => { triggerHaptic('light'); setShowAdvanceModal(true); }}
              style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}
            >
              💸 কর্মচারীকে অগ্রিম প্রদান (Advance Loan)
            </button>
          </div>

          {/* Salary Sheet Table */}
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
              💰 {selectedMonth} মাসের পেরোল ও বেতন শিট (Salary Sheet)
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontWeight: '800' }}>
                    <th style={{ padding: '10px 12px' }}>কর্মচারীর নাম</th>
                    <th style={{ padding: '10px 12px' }}>মূল বেতন (Base)</th>
                    <th style={{ padding: '10px 12px' }}>বিক্রয় কমিশন (+)</th>
                    <th style={{ padding: '10px 12px' }}>অগ্রিম কর্তন (-)</th>
                    <th style={{ padding: '10px 12px' }}>প্রদেয় মোট বেতন (Net)</th>
                    <th style={{ padding: '10px 12px' }}>স্ট্যাটাস</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>পরিশোধ</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryLedger.map(item => (
                    <tr key={item.staffId} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '12px', fontWeight: '800', color: '#0f172a' }}>{item.staffName}</td>
                      <td style={{ padding: '12px' }} className="num-font">৳ {formatPrice(item.baseSalary)}</td>
                      <td style={{ padding: '12px', color: '#16a34a', fontWeight: '700' }} className="num-font">+ ৳ {formatPrice(item.earnedCommission)}</td>
                      <td style={{ padding: '12px', color: '#dc2626', fontWeight: '700' }} className="num-font">- ৳ {formatPrice(item.advanceDeductions)}</td>
                      <td style={{ padding: '12px', fontWeight: '900', color: '#4f46e5', fontSize: '14px' }} className="num-font">৳ {formatPrice(item.netPayable)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: item.status === 'paid' ? '#dcfce7' : '#fef3c7',
                          color: item.status === 'paid' ? '#15803d' : '#b45309',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800'
                        }}>
                          {item.status === 'paid' ? '✓ পরিশোধিত' : '⏳ বাকি'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {item.status !== 'paid' ? (
                          <button
                            onClick={() => handlePaySalary(item)}
                            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}
                          >
                            ✓ বেতন দিন
                          </button>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>পরিশোধ সম্পন্ন</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 6: SECURITY AUDIT LOGS
          ============================================================ */}
      {activeTab === 'audit' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', border: '1.5px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
            📜 অ্যাকশন অডিট ট্রেইল ও নিরাপত্তা লগ (Security Audit Logs)
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                    👤 <strong style={{ color: '#4f46e5' }}>{log.user_name || 'সিস্টেম'}</strong>: {log.details}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    অ্যাকশন: <code>{log.action}</code>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                  {new Date(log.created_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })} ({new Date(log.created_at).toLocaleDateString('bn-BD')})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          MODALS
          ============================================================ */}

      {/* Modal 1: Open Shift Modal */}
      {showOpenShiftModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>☀️ ক্যাশিয়ার শিফট শুরু করুন</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>সকালে ক্যাশ ড্রয়ারে থাকা প্রারম্ভিক ভাংতি টাকার পরিমাণ দিন</p>
            <form onSubmit={handleOpenShiftSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>প্রারম্ভিক ক্যাশ ফ্লোট (টাকা):</label>
                <input
                  type="number"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(e.target.value)}
                  placeholder="1000"
                  className="num-font"
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '18px', fontWeight: '900', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowOpenShiftModal(false)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '800' }}>বাতিল</button>
                <button type="submit" style={{ padding: '10px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: '900' }}>✓ শিফট শুরু</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Close Shift (Z-Report) */}
      {showCloseShiftModal && activeShift && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>🌙 শিফট শেষ ও ক্যাশ হ্যান্ডওভার</h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>ক্যাশ ড্রয়ার গুনে মোট পাওয়া টাকা এন্ট্রি দিন</p>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>প্রারম্ভিক ক্যাশ:</span>
                <strong>৳ {formatPrice(activeShift.opening_float)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#16a34a' }}>
                <span>মোট নগদ বিক্রি (+):</span>
                <strong>৳ {formatPrice(activeShift.currentCashSales || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#dc2626' }}>
                <span>দোকান খরচ কর্তন (-):</span>
                <strong>- ৳ {formatPrice(activeShift.currentExpenses || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: '900', color: '#0f172a', fontSize: '14px' }}>
                <span>প্রত্যাশিত ক্যাশ ব্যালেন্স:</span>
                <span style={{ color: '#4f46e5' }}>৳ {formatPrice(activeShift.expectedCashInDrawer || 0)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseShiftSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>ড্রয়ারে গুনে পাওয়া আসল ক্যাশ (Actual Cash):</label>
                <input
                  type="number"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  required
                  className="num-font"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '18px', fontWeight: '900', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>হস্তান্তর মন্তব্য / নোট (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={shiftNoteInput}
                  onChange={(e) => setShiftNoteInput(e.target.value)}
                  placeholder="যেমন: পরবর্তী ক্যাশিয়ার আরিফকে হ্যান্ডওভার সম্পন্ন"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowCloseShiftModal(false)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '800' }}>বাতিল</button>
                <button type="submit" style={{ padding: '10px', borderRadius: '10px', border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: '900' }}>✓ ক্লোজিং সম্পন্ন করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Z-Report Slip */}
      {zReportData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '32px', marginBottom: '6px' }}>📜</div>
            <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>শিফট ক্লোজিং Z-Report</h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>ক্যাশিয়ার শিফট সফলভাবে সমাপ্ত হয়েছে</p>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'left', fontSize: '12.5px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>ক্যাশিয়ার:</span><strong>{zReportData.staffName}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>প্রারম্ভিক ক্যাশ:</span><strong>৳ {zReportData.openingFloat}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>নগদ বিক্রি:</span><strong>৳ {zReportData.cashSales}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>দোকান খরচ:</span><strong>- ৳ {zReportData.expenses}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span>মোট মেমো সংখ্যা:</span><strong>{zReportData.totalInvoices} টি</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px', fontWeight: '900' }}>
                <span>গুনে জমা দেওয়া ক্যাশ:</span>
                <span style={{ color: '#16a34a' }}>৳ {zReportData.actualCash}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontWeight: '900' }}>
                <span>গরমিল (Difference):</span>
                <span style={{ color: zReportData.difference === 0 ? '#16a34a' : '#dc2626' }}>
                  {zReportData.difference === 0 ? '✓ কোনো গরমিল নেই' : `৳ ${zReportData.difference}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => window.print()} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>🖨️ প্রিন্ট স্লিপ</button>
              <button onClick={() => setZReportData(null)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Advance Loan Modal */}
      {showAdvanceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>💸 কর্মচারীকে অগ্রিম প্রদান</h3>
            <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#64748b' }}>এই টাকা মাস শেষে বেতন থেকে স্বয়ংক্রিয়ভাবে কাটা হবে</p>
            <form onSubmit={handleSaveAdvance} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>কর্মচারী:</label>
                <select
                  value={advStaffId}
                  onChange={(e) => setAdvStaffId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', fontWeight: '700', outline: 'none', background: '#fff' }}
                >
                  <option value="">কর্মচারী নির্বাচন করুন...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>অগ্রিম পরিমাণ (টাকা):</label>
                <input
                  type="number"
                  value={advAmount}
                  onChange={(e) => setAdvAmount(e.target.value)}
                  placeholder="2000"
                  required
                  className="num-font"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '16px', fontWeight: '800', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>কারণ / নোট:</label>
                <input
                  type="text"
                  value={advReason}
                  onChange={(e) => setAdvReason(e.target.value)}
                  placeholder="যেমন: জরুরি পারিবারিক খরচ"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAdvanceModal(false)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '800' }}>বাতিল</button>
                <button type="submit" style={{ padding: '10px', borderRadius: '10px', border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: '900' }}>✓ অগ্রিম জমা করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Add/Edit Staff Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '28px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  {editingStaff ? '✏️ কর্মচারী তথ্য, বেতন ও পারমিশন এডিট' : '➕ নতুন কর্মচারী ও ক্যাশিয়ার যুক্ত করুন'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  ৪-ডিজিটের পিন, বেতন, কমিশন ও সর্বোচ্চ ডিসকাউন্ট সীমা সেট করুন
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
            </div>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700', marginBottom: '16px' }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveStaff} style={{ display: 'grid', gap: '14px' }}>
              {/* Name & Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>কর্মচারীর নাম *</label>
                  <input
                    type="text"
                    placeholder="যেমন: মোঃ সাকিব হাসান"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>দায়িত্ব / পদবী (Role):</label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', fontWeight: '700', outline: 'none', background: '#fff' }}
                  >
                    {Object.entries(ROLE_DEFINITIONS).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone & PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>মোবাইল নাম্বার:</label>
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>৪-ডিজিট লগইন পিন (PIN) *</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="যেমন: 2222"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    className="num-font"
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '15px', fontWeight: '800', letterSpacing: '3px', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Salary & Commission & Discount Cap */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>মাসিক মূল বেতন (৳):</label>
                  <input
                    type="number"
                    value={formBaseSalary}
                    onChange={(e) => setFormBaseSalary(e.target.value)}
                    placeholder="15000"
                    className="num-font"
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '800', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>সেলস কমিশন (%):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formCommissionPercent}
                    onChange={(e) => setFormCommissionPercent(e.target.value)}
                    placeholder="1.5"
                    className="num-font"
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '800', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>সর্বোচ্চ ডিসকাউন্ট (%):</label>
                  <input
                    type="number"
                    value={formMaxDiscountPercent}
                    onChange={(e) => setFormMaxDiscountPercent(e.target.value)}
                    placeholder="5"
                    className="num-font"
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '800', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Permissions Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>অনুমোদিত পারমিশনসমূহ:</label>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {ALL_PERMISSIONS.map(p => {
                    const isChecked = formPermissions.includes(p.key);
                    return (
                      <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '700', color: isChecked ? '#1e293b' : '#64748b', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(p.key)}
                          style={{ width: '15px', height: '15px', accentColor: '#4f46e5' }}
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '800', fontSize: '13.5px', cursor: 'pointer' }}>বাতিল</button>
                <button type="submit" disabled={saving} style={{ padding: '12px', borderRadius: '12px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)' }}>
                  {saving ? 'সংরক্ষণ হচ্ছে...' : '✓ স্টাফ সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Staff ID Badge */}
      {showIdCardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '380px', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button onClick={() => setShowIdCardModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', borderRadius: '20px', padding: '24px 20px', color: '#ffffff', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                {tenant?.shopName || 'সহজ হিসাব ডিজিটাল দোকান'}
              </div>
              <div style={{ fontSize: '11px', color: '#e0e7ff', marginBottom: '14px' }}>🏢 {showIdCardModal.branchName || 'প্রধান শাখা'}</div>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ffffff', color: '#4f46e5', fontSize: '32px', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                {ROLE_DEFINITIONS[showIdCardModal.role]?.icon || '👤'}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', margin: '0 0 4px', color: '#ffffff' }}>{showIdCardModal.name}</h2>
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '3px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '800', marginBottom: '16px' }}>
                {ROLE_DEFINITIONS[showIdCardModal.role]?.label || 'কর্মচারী'}
              </div>
              <div style={{ background: '#ffffff', borderRadius: '14px', padding: '12px', color: '#0f172a' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>কাউন্টার শিফট লগইন পিন</div>
                <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '6px', color: '#4f46e5' }} className="num-font">{showIdCardModal.pin}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => { triggerHaptic('success'); window.print(); }} style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>🖨️ ব্যাজ প্রিন্ট</button>
              <button onClick={() => setShowIdCardModal(null)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
