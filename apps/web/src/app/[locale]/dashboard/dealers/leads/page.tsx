'use client';
// apps/web/src/app/[locale]/dashboard/dealer/leads/page.tsx
// Manage incoming contact requests / leads

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Phone, Mail, Clock, CheckCircle2,
  User, Car, ChevronRight, Search, Loader2, Inbox,
} from 'lucide-react';
import { cn } from '@cars-auto/utils';

interface Lead {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  message: string;
  channel: string;
  status: 'new' | 'read' | 'replied';
  listingId?: string | null;
  createdAt: string;
}

const STATUS_STYLES = {
  new:     { label: 'New',     dot: 'bg-[var(--gold)]',   text: 'text-[var(--gold-light)]',   bg: 'bg-[var(--gold-subtle)]'   },
  read:    { label: 'Read',    dot: 'bg-blue-400',     text: 'text-blue-300',    bg: 'bg-blue-400/10'    },
  replied: { label: 'Replied', dot: 'bg-emerald-400',  text: 'text-emerald-300', bg: 'bg-emerald-400/10' },
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  form:      MessageCircle,
  whatsapp:  MessageCircle,
  phone:     Phone,
};

export default function DealerLeadsPage() {
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<'all' | 'new' | 'read' | 'replied'>('all');
  const [selected, setSelected] = useState<Lead | null>(null);

  useEffect(() => {
    fetch('/api/dealers/me/leads')
      .then(r => r.ok ? r.json() : { leads: [] })
      .then(d => setLeads(d.leads ?? []))
      .finally(() => setLoading(false));
  }, []);

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/dealers/leads/${id}/read`, { method: 'PATCH' });
    setLeads(p => p.map(l => l.id === id ? { ...l, status: 'read' } : l));
  }, []);

  const markReplied = useCallback(async (id: string) => {
    await fetch(`/api/dealers/leads/${id}/replied`, { method: 'PATCH' });
    setLeads(p => p.map(l => l.id === id ? { ...l, status: 'replied' } : l));
  }, []);

  const filtered = leads.filter(l => {
    const matchesFilter = filter === 'all' || l.status === filter;
    const matchesSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.message.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all:     leads.length,
    new:     leads.filter(l => l.status === 'new').length,
    read:    leads.filter(l => l.status === 'read').length,
    replied: leads.filter(l => l.status === 'replied').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Header */}
      <div>
        <h1 className="font-display font-black text-white text-2xl">Leads & Enquiries</h1>
        <p className="text-white/40 text-sm mt-0.5">
          {counts.new > 0
            ? <span className="text-[var(--gold-light)] font-semibold">{counts.new} new lead{counts.new > 1 ? 's' : ''}</span>
            : 'All caught up'
          }
          {counts.new > 0 ? ' waiting for response' : ''}
        </p>
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-700 border border-white/[0.07]">
          {(['all', 'new', 'read', 'replied'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                filter === tab
                  ? 'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700'
                  : 'text-white/40 hover:text-white/70',
              )}
            >
              {tab}
              <span className={cn(
                'min-w-[18px] h-4 px-1 rounded-full text-center text-[0.6rem] font-black',
                filter === tab ? 'bg-ink-700/30 text-ink-700' : 'bg-white/[0.08] text-white/40',
              )}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-ink-700 border border-white/[0.07] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[rgba(201,168,76,0.4)]"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <Inbox className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/30 text-sm">No leads found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">

          {/* Lead list */}
          <div className="space-y-2">
            {filtered.map(lead => {
              const style = STATUS_STYLES[lead.status];
              const Icon = CHANNEL_ICONS[lead.channel] ?? MessageCircle;
              const isSelected = selected?.id === lead.id;

              return (
                <button
                  key={lead.id}
                  onClick={() => { setSelected(lead); if (lead.status === 'new') markRead(lead.id); }}
                  className={cn(
                    'w-full text-left p-4 rounded-2xl border transition-all',
                    isSelected
                      ? 'bg-ink-700 border-[rgba(201,168,76,0.3)]'
                      : 'bg-[var(--ink-750)] border-white/[0.06] hover:border-white/[0.12]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', style.bg)}>
                      <User className={cn('w-4 h-4', style.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white text-sm">{lead.name}</span>
                        <span className="text-[0.65rem] text-white/30 flex-shrink-0">
                          {new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{lead.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={cn('flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full', style.bg, style.text)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                          {style.label}
                        </span>
                        <span className="text-[0.65rem] text-white/25 capitalize">{lead.channel}</span>
                      </div>
                    </div>
                    <ChevronRight className={cn('w-4 h-4 flex-shrink-0 mt-1 transition-colors', isSelected ? 'text-[var(--gold)]' : 'text-white/20')} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected ? (
            <div className="p-5 rounded-2xl bg-ink-700 border border-white/[0.09] space-y-5 sticky top-6 self-start">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-bold text-white text-base">{selected.name}</h3>
                  <span className="text-xs text-white/30">
                    {new Date(selected.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <span className={cn(
                  'flex items-center gap-1 text-[0.65rem] font-bold px-2.5 py-1 rounded-full',
                  STATUS_STYLES[selected.status].bg, STATUS_STYLES[selected.status].text,
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_STYLES[selected.status].dot)} />
                  {STATUS_STYLES[selected.status].label}
                </span>
              </div>

              {/* Contact info */}
              <div className="space-y-2">
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] group hover:border-white/[0.14] transition-all">
                    <Phone className="w-4 h-4 text-[rgba(201,168,76,0.7)] flex-shrink-0" />
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">{selected.phone}</span>
                  </a>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] group hover:border-white/[0.14] transition-all">
                    <Mail className="w-4 h-4 text-[rgba(201,168,76,0.7)] flex-shrink-0" />
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors">{selected.email}</span>
                  </a>
                )}
              </div>

              {/* Message */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Message</p>
                <p className="text-sm text-white/70 leading-relaxed">{selected.message}</p>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {selected.phone && (
                  <a
                    href={`https://wa.me/${selected.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${selected.name}, thank you for your enquiry!`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25D366]/15 border border-[#25D366]/25 text-[#25D366] font-semibold text-sm hover:bg-[#25D366]/25 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Reply on WhatsApp
                  </a>
                )}
                {selected.status !== 'replied' && (
                  <button
                    onClick={() => markReplied(selected.id)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 font-semibold text-sm hover:bg-emerald-400/20 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Replied
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center p-10 rounded-2xl bg-ink-700 border border-white/[0.06] border-dashed">
              <p className="text-white/20 text-sm">Select a lead to view details</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
