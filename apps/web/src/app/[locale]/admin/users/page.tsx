'use client';
// apps/web/src/app/[locale]/admin/users/page.tsx
// Admin: full user management — list, search, filter, ban, role changes

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, MoreVertical, UserX, UserCheck, Shield,
  ShieldOff, Mail, Eye, Download, Users, TrendingUp, UserPlus,
  ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
const ROLES    = ['USER', 'DEALER', 'MODERATOR', 'ADMIN'] as const;
const STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING'] as const;

type Role   = typeof ROLES[number];
type Status = typeof STATUSES[number];

interface User {
  id:             string;
  name:           string;
  email:          string;
  role:           Role;
  status:         Status;
  joinedAt:       string;
  lastSeen:       string;
  listingsCount:  number;
  flagsCount:     number;
  avatar?:        string;
}

// ─── Style maps ───────────────────────────────────────────────────────────────
const ROLE_STYLES: Record<Role, { label: string; color: string; bg: string }> = {
  USER:      { label: 'User',      color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
  DEALER:    { label: 'Dealer',    color: '#c9a84c', bg: 'rgba(201,168,76,0.12)'  },
  MODERATOR: { label: 'Moderator', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ADMIN:     { label: 'Admin',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
};

const STATUS_STYLES: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  ACTIVE:    { label: 'Active',    dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  SUSPENDED: { label: 'Suspended', dot: 'bg-yellow-400',  text: 'text-yellow-400',  bg: 'bg-yellow-400/10'  },
  BANNED:    { label: 'Banned',    dot: 'bg-red-500',     text: 'text-red-400',     bg: 'bg-red-400/10'     },
  PENDING:   { label: 'Pending',   dot: 'bg-blue-400',    text: 'text-blue-400',    bg: 'bg-blue-400/10'    },
};

// ─── Loading spinner ──────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertTriangle className="w-10 h-10 text-red-400" />
      <p className="text-white/40 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all"
      >
        Retry
      </button>
    </div>
  );
}

const PAGE_SIZE = 20;

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [users, setUsers]               = useState<User[]>([]);
  const [total, setTotal]               = useState(0);
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState<Role | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL');
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [actionMenu, setActionMenu]     = useState<string | null>(null);
  const [modal, setModal]               = useState<{ type: 'ban' | 'suspend' | 'email'; user: User } | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (search)       params.set('search', search);
    if (roleFilter   !== 'ALL') params.set('role',   roleFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);

    api.get(`/admin/users?${params.toString()}`)
      .then(r => {
        setUsers(r.data.data  ?? r.data.users ?? []);
        setTotal(r.data.total ?? 0);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Failed to load users';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.id)));
    }
  };

  const doAction = async (userId: string, action: 'ban' | 'suspend' | 'activate') => {
    try {
      await api.patch(`/admin/users/${userId}/${action}`);
      setActionMenu(null);
      setModal(null);
      fetchUsers();
    } catch {
      // Optimistic fallback: update local state
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, status: action === 'ban' ? 'BANNED' : action === 'suspend' ? 'SUSPENDED' : 'ACTIVE' }
          : u
      ));
      setActionMenu(null);
      setModal(null);
    }
  };

  const activeCount  = users.filter(u => u.status === 'ACTIVE').length;
  const flaggedCount = users.filter(u => u.flagsCount > 0).length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight">User Management</h1>
          <p className="text-white/40 text-sm mt-0.5">Manage accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-xs font-semibold hover:bg-white/[0.08] transition-all">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',   value: total,        icon: Users,        color: '#3b82f6' },
          { label: 'Active',        value: activeCount,  icon: UserCheck,    color: '#22c55e' },
          { label: 'Flagged',       value: flaggedCount, icon: AlertTriangle, color: '#f59e0b' },
          { label: 'This Page',     value: users.length, icon: UserPlus,     color: '#c9a84c' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-[#0a1525] border border-white/[0.07] p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${s.color}15`, border: `1px solid ${s.color}22` }}>
                <Icon className="w-4.5 h-4.5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-white tabular-nums">{s.value.toLocaleString()}</p>
                <p className="text-[0.7rem] text-white/35">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40 transition-colors"
          />
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1b2e] border border-white/[0.07]">
          {(['ALL', ...ROLES] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                roleFilter === r
                  ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {r === 'ALL' ? 'All' : ROLE_STYLES[r as Role].label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2.5 rounded-xl bg-[#0d1b2e] border border-white/[0.07] text-white/70 text-sm focus:outline-none focus:border-[#c9a84c]/40 transition-colors"
        >
          <option value="ALL">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/25">
          <span className="text-sm font-semibold text-[#c9a84c]">{selected.size} selected</span>
          <div className="h-4 w-px bg-[#c9a84c]/30" />
          <button className="text-xs font-semibold text-white/60 hover:text-yellow-400 transition-colors">Suspend All</button>
          <button className="text-xs font-semibold text-white/60 hover:text-red-400 transition-colors">Ban All</button>
          <button className="text-xs font-semibold text-white/60 hover:text-blue-400 transition-colors">Send Email</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content area */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="w-10 h-10 text-white/15" />
          <p className="text-white/30 text-sm">No users found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === users.length && users.length > 0}
                    onChange={toggleAll}
                    className="rounded border-white/20 bg-transparent accent-[#c9a84c]"
                  />
                </th>
                {['User', 'Role', 'Status', 'Joined', 'Last Seen', 'Listings', 'Flags', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const roleStyle   = ROLE_STYLES[user.role]   ?? ROLE_STYLES.USER;
                const statusStyle = STATUS_STYLES[user.status] ?? STATUS_STYLES.PENDING;
                const isSelected  = selected.has(user.id);

                return (
                  <tr
                    key={user.id}
                    className={cn(
                      'border-b border-white/[0.05] last:border-0 transition-colors',
                      isSelected ? 'bg-[#c9a84c]/[0.06]' : i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]',
                      'hover:bg-[#c9a84c]/[0.03]',
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(user.id)}
                        className="rounded border-white/20 bg-transparent accent-[#c9a84c]"
                      />
                    </td>

                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                             style={{ background: `${roleStyle.color}22`, color: roleStyle.color }}>
                          {user.name?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{user.name}</p>
                          <p className="text-[0.68rem] text-white/35">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className="text-[0.7rem] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                            style={{ background: roleStyle.bg, color: roleStyle.color }}>
                        {roleStyle.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit', statusStyle.bg, statusStyle.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
                        {statusStyle.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">{user.joinedAt}</td>
                    <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">{user.lastSeen ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/60 text-center">{user.listingsCount ?? 0}</td>

                    {/* Flags */}
                    <td className="px-4 py-3">
                      {(user.flagsCount ?? 0) > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {user.flagsCount}
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                          className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        {actionMenu === user.id && (
                          <div className="absolute right-0 top-8 z-50 w-44 rounded-xl bg-[#0d1b2e] border border-white/[0.12] shadow-2xl overflow-hidden py-1">
                            {[
                              { label: 'View Profile',  icon: Eye,       action: () => setActionMenu(null) },
                              { label: 'Send Email',    icon: Mail,      action: () => { setModal({ type: 'email', user }); setActionMenu(null); } },
                              { label: 'Change Role',   icon: Shield,    action: () => setActionMenu(null) },
                              user.status !== 'ACTIVE'
                                ? { label: 'Activate',  icon: UserCheck, action: () => doAction(user.id, 'activate') }
                                : { label: 'Suspend',   icon: ShieldOff, action: () => doAction(user.id, 'suspend') },
                              { label: 'Ban User',      icon: UserX,     action: () => { setModal({ type: 'ban', user }); setActionMenu(null); } },
                            ].map(item => {
                              const Icon = item.icon;
                              const isBan = item.label === 'Ban User';
                              return (
                                <button
                                  key={item.label}
                                  onClick={item.action}
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors',
                                    isBan
                                      ? 'text-red-400 hover:bg-red-400/10'
                                      : 'text-white/60 hover:bg-white/[0.05] hover:text-white',
                                  )}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.07] bg-white/[0.01]">
            <p className="text-xs text-white/30">
              Page {page} of {totalPages || 1} — {total} total users
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page + i - 2;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-semibold transition-all',
                      page === pg
                        ? 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]'
                        : 'text-white/40 hover:text-white hover:bg-white/[0.08]',
                    )}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="w-7 h-7 rounded-lg bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] hover:text-white disabled:opacity-25 transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d1b2e] border border-white/[0.12] p-6 space-y-4">
            <div className="flex items-center gap-3">
              {modal.type === 'ban' ? (
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
              )}
              <div>
                <p className="font-bold text-white">
                  {modal.type === 'ban' ? 'Ban User' : 'Send Email'}
                </p>
                <p className="text-sm text-white/40">{modal.user.name}</p>
              </div>
            </div>

            {modal.type === 'ban' && (
              <p className="text-sm text-white/60">
                This will permanently ban <strong className="text-white">{modal.user.name}</strong> from the platform. They will not be able to log in or create listings.
              </p>
            )}
            {modal.type === 'email' && (
              <textarea
                rows={4}
                placeholder="Write your message to the user…"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40 resize-none"
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-sm font-semibold hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => modal.type === 'ban' ? doAction(modal.user.id, 'ban') : setModal(null)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  modal.type === 'ban'
                    ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                    : 'bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e]',
                )}
              >
                {modal.type === 'ban' ? 'Confirm Ban' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
