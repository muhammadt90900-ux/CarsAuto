'use client';
/**
 * Table — CarsAuto Design System
 *
 * Usage:
 *   <Table
 *     columns={[
 *       { key: 'name',  label: 'Name',   sortable: true },
 *       { key: 'price', label: 'Price',  align: 'right' },
 *       { key: 'status',label: 'Status' },
 *     ]}
 *     rows={data}
 *     renderCell={(row, col) => row[col.key]}
 *     onSort={(key, dir) => {}}
 *     loading={false}
 *     emptyMessage="No listings found."
 *   />
 */

import { useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { SkeletonTableRow } from './Skeleton';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TableColumn<T = Record<string, unknown>> {
  key:       keyof T | string;
  label:     string;
  align?:    'left' | 'center' | 'right';
  sortable?: boolean;
  width?:    string;
  className?: string;
}

interface TableProps<T extends Record<string, unknown>> {
  columns:      TableColumn<T>[];
  rows:         T[];
  renderCell?:  (row: T, col: TableColumn<T>, index: number) => ReactNode;
  onSort?:      (key: string, dir: 'asc' | 'desc') => void;
  loading?:     boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  emptyIcon?:   ReactNode;
  getRowKey?:   (row: T, index: number) => string | number;
  onRowClick?:  (row: T) => void;
  className?:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  renderCell,
  onSort,
  loading       = false,
  skeletonRows  = 5,
  emptyMessage  = 'No data found.',
  emptyIcon,
  getRowKey     = (_, i) => i,
  onRowClick,
  className,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (!onSort) return;
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(newDir);
    onSort(key, newDir);
  };

  return (
    <div className={cn('table-wrap', className)}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{ width: col.width, textAlign: col.align ?? 'left' }}
                className={cn(
                  col.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)]',
                  col.className,
                )}
                onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <span className="text-[var(--text-faint)]">
                      {sortKey === String(col.key) ? (
                        sortDir === 'asc'
                          ? <ChevronUp   size={12} aria-hidden />
                          : <ChevronDown size={12} aria-hidden />
                      ) : (
                        <ChevronsUpDown size={12} aria-hidden />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonTableRow key={i} cols={columns.length} />
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-16 text-[var(--text-muted)]"
              >
                <div className="flex flex-col items-center gap-3">
                  {emptyIcon && <span className="text-[var(--text-faint)] opacity-50">{emptyIcon}</span>}
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr
                key={getRowKey(row, rowIdx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    style={{ textAlign: col.align ?? 'left' }}
                    className={col.className}
                  >
                    {renderCell
                      ? renderCell(row, col, rowIdx)
                      : String(row[col.key as keyof T] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
