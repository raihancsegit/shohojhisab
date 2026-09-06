'use client';
import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  themeColor?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [15, 30, 50, 100],
  itemLabel = 'আইটেম',
  themeColor = '#10b981'
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, validPage * pageSize);

  // Helper to generate page range with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, validPage - 1);
      const end = Math.min(totalPages - 1, validPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (validPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '12px',
      padding: '14px 16px',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      marginTop: '16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
    }}>
      {/* Total and Range Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>
          মোট <strong style={{ color: '#0f172a' }}>{totalItems.toLocaleString('en-US')}</strong>টির মধ্যে{' '}
          <strong style={{ color: '#0f172a' }}>{startItem}-{endItem}</strong>টি {itemLabel} দেখানো হচ্ছে
        </span>

        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>প্রতি পেজে:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: '700',
                outline: 'none',
                background: '#f8fafc',
                cursor: 'pointer',
                color: '#0f172a'
              }}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}টি</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={validPage === 1}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: validPage === 1 ? '#f8fafc' : '#ffffff',
              color: validPage === 1 ? '#94a3b8' : '#334155',
              fontSize: '12px',
              fontWeight: '700',
              cursor: validPage === 1 ? 'not-allowed' : 'pointer'
            }}
            title="প্রথম পৃষ্ঠা"
          >
            ⏮ প্রথম
          </button>

          {/* Prev Page */}
          <button
            type="button"
            onClick={() => onPageChange(validPage - 1)}
            disabled={validPage === 1}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: validPage === 1 ? '#f8fafc' : '#ffffff',
              color: validPage === 1 ? '#94a3b8' : '#334155',
              fontSize: '12px',
              fontWeight: '700',
              cursor: validPage === 1 ? 'not-allowed' : 'pointer'
            }}
            title="আগের পৃষ্ঠা"
          >
            ◀ আগের
          </button>

          {/* Page Numbers */}
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '13px' }}>
                  •••
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === validPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  padding: '0 6px',
                  borderRadius: '8px',
                  border: isActive ? `1.5px solid ${themeColor}` : '1px solid #e2e8f0',
                  background: isActive ? themeColor : '#ffffff',
                  color: isActive ? '#ffffff' : '#0f172a',
                  fontSize: '13px',
                  fontWeight: isActive ? '900' : '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {pageNum}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(validPage + 1)}
            disabled={validPage === totalPages}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: validPage === totalPages ? '#f8fafc' : '#ffffff',
              color: validPage === totalPages ? '#94a3b8' : '#334155',
              fontSize: '12px',
              fontWeight: '700',
              cursor: validPage === totalPages ? 'not-allowed' : 'pointer'
            }}
            title="পরের পৃষ্ঠা"
          >
            পরের ▶
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={validPage === totalPages}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: validPage === totalPages ? '#f8fafc' : '#ffffff',
              color: validPage === totalPages ? '#94a3b8' : '#334155',
              fontSize: '12px',
              fontWeight: '700',
              cursor: validPage === totalPages ? 'not-allowed' : 'pointer'
            }}
            title="শেষ পৃষ্ঠা"
          >
            শেষ ⏭
          </button>
        </div>
      )}
    </div>
  );
}
