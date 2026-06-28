'use client';
// apps/web/src/app/[locale]/admin/users/page.tsx
// Admin: full user management — list, search, filter, ban, suspend, role
// changes. Maps directly onto the real User model: role is
// USER | DEALER | ADMIN (no MODERATOR), and account status is derived from
// banned / suspendedUntil (no PENDING — that's a listing/dealer concept,
// not a user one). Backed by real /admin/users endpoints.

import { useState, useEffect, useCallback } from 'react';
import {
  Search, MoreVertical, UserX, UserCheck, Shield,
  ShieldOff, Eye, Users, AlertTriangle, UserPlus,
  ChevronLeft, ChevronRight, X, Loader2, Calendar,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { api, adminApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
const ROLES    = ['USER', 'DEALER', 'ADMIN'] as const;
const STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const;

type Role   = typeof ROLES[number];
type Status = typeof STATUSES[number];

interface User {
  id:               string;
  name:             string;
  email:            string;
  phone?:           string;
  role:             Role;
  verified:         boolean;
  banned:           boolean;
  suspendedUntil?:  string | null;
  suspendedReason?: string | null;
  createdAt:        string;
  _count?:          { listings: number; reports: number };
}

function statusOf(user: User): Status {
  if (user.banned) return 'BANNED';
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) return 'SUSPENDED';
  return 'ACTIVE';
}

// ─── Style maps ───────────────────────────────────────────────────────────────
const ROLE_STYLES: Record<Role, { label: string; color: string; bg: string }> = {
  USER:   { label: 'User',   color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
  DEALER: { label: 'Dealer', color: '#c9a84c', bg: 'rgba(201,168,76,0.12)'  },
  ADMIN:  { label: 'Admin',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
};

const STATUS_STYLES: Record<Status, { label: string; dot: string; text: string; bg: string }> = {
  ACTIVE:    { label: 'Active',    dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  SUSPENDED: { label: 'Suspended', dot: 'bg-yellow-400',  text: 'text-yellow-400',  bg: 'bg-yellow-400/10'  },
  BANNED:    { label: 'Banned',    dot: 'bg-red-500',     text: 'text-red-400',     bg: 'bg-red-400/10'     },
};

// ─── Loading / error states ───────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
    </div>
  );
}

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
  const [modal, setModal]               = useState<{ type: 'ban' | 'suspend' | 'role'; user: User } | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [suspendDays, setSuspendDays]   = useState(7);
  const [suspendReason, setSuspendReason] = useState('');

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
        setUsers(r.data.data ?? []);
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

  const doBan = async (userId: string, banned: boolean) => {
    setSubmitting(true);
    try {
      await adminApi.banUser(userId, banned);
      setActionMenu(null);
      setModal(null);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update ban status');
    } finally {
      setSubmitting(false);
    }
  };

  const doSuspend = async (userId: string, days: number, reason: string) => {
    setSubmitting(true);
    try {
      const until = new Date(Date.now() + days * 86_400_000).toISOString();
      await adminApi.suspendUser(userId, until, reason || undefined);
      setActionMenu(null);
      setModal(null);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to suspend user');
    } finally {
      setSubmitting(false);
    }
  };

  const liftSuspension = async (userId: string) => {
    setSubmitting(true);
    try {
      await adminApi.suspendUser(userId, null);
      setActionMenu(null);
      fetchUsers();
    } finally {
      setSubmitting(false);
    }
  };

  const doRoleChange = async (userId: string, role: Role) => {
    setSubmitting(true);
    try {
      await adminApi.setUserRole(userId, role);
      setModal(null);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to change role');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount  = users.filter(u => statusOf(u) === 'ACTIVE').length;
  const flaggedCount = users.filter(u => (u._count?.reports ?? 0) > 0).length;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-white text-2xl tracking-tight">User Management</h1>
          <p className="text-white/40 text-sm mt-0.5">Manage accounts, roles, and permissions</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',   value: total,        icon: Users,         color: '#3b82f6' },
          { label: 'Active',        value: activeCount,  icon: UserCheck,     color: '#22c55e' },
          { label: 'Reported',      value: flaggedCount, icon: AlertTriangle, color: '#f59e0b' },
          { label: 'This Page',     value: users.length, icon: UserPlus,      color: '#c9a84c' },
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
          <button
            onClick={() => Promise.all(Array.from(selected).map(id => adminApi.banUser(id, true))).then(() => { setSelected(new Set()); fetchUsers(); })}
            className="text-xs font-semibold text-white/60 hover:text-red-400 transition-colors"
          >
            Ban All
          </button>
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
                {['User', 'Role', 'Status', 'Joined', 'Listings', 'Reports', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.68rem] text-white/35 uppercase tracking-wider font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const roleStyle   = ROLE_STYLES[user.role] ?? ROLE_STYLES.USER;
                const status      = statusOf(user);
                const statusStyle = STATUS_STYLES[status];
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
                          {user.name?.charAt(0)?.toUpperCase() ?? '?'}
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
                      {status === 'SUSPENDED' && user.suspendedUntil && (
                        <p className="text-[0.62rem] text-white/25 mt-1 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          until {new Date(user.suspendedUntil).toLocaleDateString()}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60 text-center">{user._count?.listings ?? 0}</td>

                    {/* Reports */}
                    <td className="px-4 py-3">
                      {(user._count?.reports ?? 0) > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {user._count?.reports}
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
                          <div className="absolute right-0 top-8 z-50 w-48 rounded-xl bg-[#0d1b2e] border border-white/[0.12] shadow-2xl overflow-hidden py-1">
                            {[
                              { label: 'View Profile', icon: Eye,    action: () => setActionMenu(null) },
                              { label: 'Change Role',  icon: Shield, action: () => { setModal({ type: 'role', user }); setActionMenu(null); } },
                              ...(status === 'SUSPENDED'
                                ? [{ label: 'Lift Suspension', icon: UserCheck, action: () => liftSuspension(user.id) }]
                                : [{ label: 'Suspend', icon: ShieldOff, action: () => { setSuspendDays(7); setSuspendReason(''); setModal({ type: 'suspend', user }); setActionMenu(null); } }]),
                              status === 'BANNED'
                                ? { label: 'Unban User', icon: UserCheck, action: () => doBan(user.id, false) }
                                : { label: 'Ban User',   icon: UserX,     action: () => { setModal({ type: 'ban', user }); setActionMenu(null); } },
                            ].map(item => {
                              const Icon = item.icon;
                              const isDestructive = item.label === 'Ban User' || item.label === 'Suspend';
                              return (
                                <button
                                  key={item.label}
                                  onClick={item.action}
                                  className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors',
                                    isDestructive
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
              ) : modal.type === 'suspend' ? (
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                  <ShieldOff className="w-5 h-5 text-yellow-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
              )}
              <div>
                <p className="font-bold text-white">
                  {modal.type === 'ban' ? 'Ban User' : modal.type === 'suspend' ? 'Suspend User' : 'Change Role'}
                </p>
                <p className="text-sm text-white/40">{modal.user.name}</p>
              </div>
            </div>

            {modal.type === 'ban' && (
              <p className="text-sm text-white/60">
                This will permanently ban <strong className="text-white">{modal.user.name}</strong> from the platform. They will not be able to log in or create listings.
              </p>
            )}

            {modal.type === 'suspend' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={suspendDays}
                    onChange={e => setSuspendDays(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm focus:outline-none focus:border-[#c9a84c]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Reason (optional)</label>
                  <textarea
                    rows={3}
                    value={suspendReason}
                    onChange={e => setSuspendReason(e.target.value)}
                    placeholder="Why is this account being suspended?"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#c9a84c]/40 resize-none"
                  />
                </div>
              </div>
            )}

            {modal.type === 'role' && (
              <div className="space-y-3">
                <p className="text-sm text-white/60">
                  Select new role for <strong className="text-white">{modal.user.name}</strong>
                </p>
                <div className="flex flex-col gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => doRoleChange(modal.user.id, r)}
                      disabled={submitting}
                      className={cn(
                        'w-full py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50',
                        modal.user.role === r
                          ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]'
                          : 'border-white/[0.09] bg-white/[0.04] text-white/60 hover:border-white/20 hover:text-white'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-white/60 text-sm font-semibold hover:bg-white/[0.08] transition-all"
              >
                Cancel
              </button>
              {modal.type !== 'role' && (
                <button
                  onClick={() => modal.type === 'ban' ? doBan(modal.user.id, true) : doSuspend(modal.user.id, suspendDays, suspendReason)}
                  disabled={submitting}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2',
                    modal.type === 'ban'
                      ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                      : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30',
                  )}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modal.type === 'ban' ? 'Confirm Ban' : 'Confirm Suspension'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
