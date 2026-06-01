'use client';
// dashboard/profile/page.tsx — UX-Improved: avatar upload, completion meter, tabbed sections

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Camera, Save, User, Phone, MapPin, Globe, Lock,
  Eye, EyeOff, CheckCircle2, Shield, Bell, Trash2,
  AlertTriangle,
} from 'lucide-react';

/* ── Input field helper ─────────────────────────────────────── */
function Field({
  label, type = 'text', placeholder, defaultValue, icon: Icon, hint, required,
}: {
  label: string; type?: string; placeholder?: string; defaultValue?: string;
  icon?: React.ElementType; hint?: string; required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400 normal-case font-normal tracking-normal">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />}
        <input
          type={isPassword && show ? 'text' : type}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={`w-full ${Icon ? 'pl-9' : 'pl-4'} ${isPassword ? 'pr-10' : 'pr-4'}
                      py-3 text-sm rounded-xl
                      border border-gray-200 dark:border-white/10
                      bg-white dark:bg-white/[0.05]
                      text-gray-900 dark:text-white placeholder-gray-400
                      outline-none transition-all
                      focus:ring-2 focus:ring-[#c9a84c]/20 focus:border-[#c9a84c]/50`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                       hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">{hint}</p>}
    </div>
  );
}

const TABS = ['Profile', 'Security', 'Notifications', 'Danger Zone'] as const;
type TabKey = typeof TABS[number];

/* ── Profile completion ──────────────────────────────────────── */
const COMPLETION_FIELDS = [
  { label: 'Full name',         done: true  },
  { label: 'Phone number',      done: true  },
  { label: 'Profile photo',     done: false },
  { label: 'Location',          done: true  },
  { label: 'Bio',               done: false },
  { label: 'Verified email',    done: true  },
];

export default function ProfilePage() {
  const t  = useTranslations('profile');
  const td = useTranslations('dashboard');
  const [saved,   setSaved]   = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('Profile');

  const completionPct = Math.round(
    (COMPLETION_FIELDS.filter(f => f.done).length / COMPLETION_FIELDS.length) * 100
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-5 lg:p-7 max-w-3xl space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">{t('publicProfile')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your account information and preferences
        </p>
      </div>

      {/* ── Success toast ─────────────────────────────────────── */}
      {saved && (
        <div role="status"
             className="flex items-center gap-2.5 px-4 py-3 rounded-xl
                        bg-emerald-50 dark:bg-emerald-500/10
                        border border-emerald-200 dark:border-emerald-500/20
                        text-emerald-700 dark:text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden />
          Changes saved successfully
        </div>
      )}

      {/* ── Profile completion meter ──────────────────────────── */}
      <div className="rounded-2xl p-5 bg-white dark:bg-[#0b1525]
                      border border-gray-100 dark:border-white/[0.07]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              Profile {completionPct}% complete
            </p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
              Complete profiles get 3× more buyer trust
            </p>
          </div>
          <span className={`text-sm font-black
                            ${completionPct >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {completionPct}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${completionPct}%`,
              background: completionPct >= 80
                ? 'linear-gradient(90deg,#10b981,#34d399)'
                : 'linear-gradient(90deg,#c9a84c,#e8cc7a)',
            }}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {COMPLETION_FIELDS.map(({ label, done }) => (
            <span key={label}
                  className={`flex items-center gap-1 text-[11px] font-medium
                              ${done ? 'text-emerald-500' : 'text-gray-400 dark:text-white/30'}`}>
              {done
                ? <CheckCircle2 className="w-3 h-3" />
                : <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-white/20 flex-shrink-0" />}
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.05] p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150
                        ${activeTab === tab
                          ? 'bg-white dark:bg-[#0b1525] text-gray-900 dark:text-white shadow-sm'
                          : tab === 'Danger Zone'
                            ? 'text-red-400 hover:text-red-500'
                            : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Profile tab ──────────────────────────────────────── */}
      {activeTab === 'Profile' && (
        <>
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#c9a84c] to-[#9e6e1e]
                              flex items-center justify-center text-white text-2xl font-black
                              shadow-[0_0_24px_rgba(201,168,76,0.35)]">
                JD
              </div>
              <button
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full
                           bg-white dark:bg-[#0b1525] border border-gray-200 dark:border-white/10
                           flex items-center justify-center shadow-md
                           hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" aria-hidden />
              </button>
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">John Doe</p>
              <p className="text-sm text-gray-400">john@example.com</p>
              <button className="mt-2 text-xs font-semibold text-[#c9a84c] hover:text-[#d4b45a] transition-colors">
                Upload new photo
              </button>
            </div>
          </div>

          {/* Personal info */}
          <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                          bg-white dark:bg-[#0b1525] p-5 space-y-4">
            <h2 className="font-bold text-sm text-gray-900 dark:text-white">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name"     placeholder="Ahmad Al-Rashidi"    defaultValue="John Doe"          icon={User}  required />
              <Field label="Phone Number"  placeholder="+964 770 000 0000"   defaultValue="+964 770 000 0000" icon={Phone} type="tel" />
              <Field label="City / Region" placeholder="Erbil, Kurdistan"    defaultValue="Erbil, Kurdistan"  icon={MapPin} />
              <Field label="Website"       placeholder="https://..."                                          icon={Globe} type="url" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Bio
              </label>
              <textarea
                rows={3}
                placeholder="Tell buyers about yourself — your experience, specialties, location…"
                className="w-full px-4 py-3 text-sm rounded-xl
                           border border-gray-200 dark:border-white/10
                           bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white
                           placeholder-gray-400 outline-none resize-none
                           focus:ring-2 focus:ring-[#c9a84c]/20 focus:border-[#c9a84c]/50 transition-all"
              />
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">
                A good bio increases buyer confidence and response rates.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Security tab ──────────────────────────────────────── */}
      {activeTab === 'Security' && (
        <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                        bg-white dark:bg-[#0b1525] p-5 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-[#c9a84c]" aria-hidden />
            <h2 className="font-bold text-sm text-gray-900 dark:text-white">Password & Security</h2>
          </div>
          <div className="space-y-4">
            <Field label="Current Password"  type="password" placeholder="••••••••" icon={Lock} />
            <Field label="New Password"      type="password" placeholder="Min. 8 chars" icon={Lock}
                   hint="Use uppercase, lowercase, a number and a symbol for a strong password." />
            <Field label="Confirm Password"  type="password" placeholder="Repeat new password" icon={Lock} />
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Two-factor authentication</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-300/60 mb-3">
              Add an extra layer of security to your account with 2FA.
            </p>
            <button className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline">
              Enable 2FA →
            </button>
          </div>
        </div>
      )}

      {/* ── Notifications tab ─────────────────────────────────── */}
      {activeTab === 'Notifications' && (
        <div className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                        bg-white dark:bg-[#0b1525] p-5 space-y-1">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-[#c9a84c]" aria-hidden />
            <h2 className="font-bold text-sm text-gray-900 dark:text-white">Notification Preferences</h2>
          </div>
          {[
            { label: 'New message from buyer',  desc: 'Get notified when someone messages about your listing', on: true  },
            { label: 'Listing view milestone',  desc: 'Alerts when your listing hits 100, 500, 1000 views',  on: true  },
            { label: 'Price drop alerts',       desc: 'When similar cars drop in price',                      on: false },
            { label: 'Listing expiry reminder', desc: '7 and 3 days before your listing expires',             on: true  },
            { label: 'New listings in my area', desc: 'Weekly digest of new cars matching your saved search', on: false },
            { label: 'Marketing emails',        desc: 'Tips, news and marketplace updates',                   on: false },
          ].map(({ label, desc, on }) => (
            <div key={label}
                 className="flex items-start justify-between gap-4 py-3
                            border-b border-gray-100 dark:border-white/[0.06] last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{label}</p>
                <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{desc}</p>
              </div>
              <button
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
                            transition-colors duration-200 focus:outline-none
                            ${on ? 'bg-[#c9a84c]' : 'bg-gray-200 dark:bg-white/10'}`}
                role="switch" aria-checked={on}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
                                  transform transition-transform duration-200
                                  ${on ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Danger Zone tab ──────────────────────────────────── */}
      {activeTab === 'Danger Zone' && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20
                        bg-white dark:bg-[#0b1525] p-5 space-y-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" aria-hidden />
            <h2 className="font-bold text-sm text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Deactivate Account', desc: 'Temporarily hide your profile and listings. You can reactivate anytime.', btnLabel: 'Deactivate', btnCls: 'border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10' },
              { title: 'Delete Account',     desc: 'Permanently delete your account, all listings, and data. This cannot be undone.',      btnLabel: 'Delete Account', btnCls: 'border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10' },
            ].map(({ title, desc, btnLabel, btnCls }) => (
              <div key={title}
                   className="flex flex-col sm:flex-row sm:items-center justify-between gap-3
                              p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03]
                              border border-gray-200 dark:border-white/[0.06]">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{title}</p>
                  <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{desc}</p>
                </div>
                <button
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2
                              rounded-xl text-xs font-bold border transition-all duration-150 ${btnCls}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {btnLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Save button (Profile + Security) ─────────────────── */}
      {(activeTab === 'Profile' || activeTab === 'Security') && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       text-sm font-bold bg-[#c9a84c] text-[#050b14]
                       hover:bg-[#d4b45a] transition-all duration-200
                       shadow-[0_4px_16px_rgba(201,168,76,0.35)]
                       hover:shadow-[0_6px_24px_rgba(201,168,76,0.50)]"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          <p className="text-xs text-gray-400 dark:text-white/30">
            Changes auto-apply across all your listings
          </p>
        </div>
      )}
    </div>
  );
}
