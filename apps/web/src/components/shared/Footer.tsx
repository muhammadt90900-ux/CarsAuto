// components/shared/Footer.tsx — UX-Improved: newsletter CTA, app download, trust badges

'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, Shield, Star, Zap } from 'lucide-react';

const FOOTER_LINKS = {
  Browse:   ['All Cars','SUVs & 4×4','Luxury Cars','Electric','Spare Parts','Motorcycles','New Listings'],
  Services: ['Sell Your Car','Dealer Portal','Premium Listing','Car Valuation','Import & Export','Financing'],
  Cities:   ['Erbil','Sulaymaniyah','Duhok','Kirkuk','Baghdad','Basra','Dubai','Sharjah'],
  Company:  ['About Us','Careers','Press','Blog','Contact','Help Center','Privacy Policy'],
};

const TRUST_BADGES = [
  { icon: Shield, label: 'Verified Listings' },
  { icon: Star,   label: '4.9★ Rated' },
  { icon: Zap,    label: 'Instant Alerts' },
];

export function Footer({ locale = 'en' }: { locale?: string }) {
  const [email, setEmail]       = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer role="contentinfo" className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg,#050b14 0%,#030710 100%)' }}>
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.45),transparent)' }} />

      {/* ── Country Presence Strip ──────────────────────────── */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/20 font-black w-full text-center sm:w-auto">
              Our Markets
            </span>
            {[
              { flag: '🇮🇶', name: 'Iraq & Kurdistan', detail: 'Baghdad · Erbil · Sulaymaniyah · Duhok · Kirkuk' },
              { flag: '🇦🇪', name: 'UAE',              detail: 'Dubai · Sharjah · Abu Dhabi' },
              { flag: '🇨🇳', name: 'China',            detail: 'Import & Export Partner' },
            ].map(({ flag, name, detail }) => (
              <div key={name}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                           border border-white/[0.07] bg-white/[0.02]
                           hover:border-[#c9a84c]/18 hover:bg-[#c9a84c]/[0.03]
                           transition-all duration-200">
                <span className="text-2xl">{flag}</span>
                <div>
                  <div className="text-xs font-bold text-white/65">{name}</div>
                  <div className="text-[9px] text-white/28 mt-0.5">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Newsletter / CTA Banner ─────────────────────────── */}
      <div className="border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 flex flex-col lg:flex-row gap-8 items-center justify-between"
               style={{ background: 'linear-gradient(135deg,rgba(11,21,37,0.9),rgba(8,15,28,0.95))', border: '1px solid rgba(201,168,76,0.18)' }}>
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            {/* Left: text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em] bg-[#c9a84c]/10 border border-[#c9a84c]/22 text-[#c9a84c] mb-3">
                ● Stay ahead of the market
              </div>
              <h3 className="text-2xl font-display font-black text-white mb-2">
                Get new listings before anyone else
              </h3>
              <p className="text-white/40 text-sm max-w-md">
                Weekly digest of the best deals, price drops, and new arrivals in Iraq, Kurdistan & UAE.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-4">
                {TRUST_BADGES.map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-white/45 hover:text-white/65 transition-colors duration-200 cursor-default">
                    <Icon className="w-3.5 h-3.5 text-[#c9a84c]/70" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: form */}
            <div className="w-full max-w-sm flex-shrink-0">
              {subscribed ? (
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-400">You're in!</p>
                    <p className="text-xs text-emerald-300/60">First alert lands in your inbox soon.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2" aria-label="Newsletter subscription">
                  <label htmlFor="newsletter-email" className="sr-only">Email address for newsletter</label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    aria-required="true"
                    className="flex-1 h-12 bg-white/[0.07] border border-white/[0.12] rounded-xl
                               px-4 text-white text-sm placeholder-white/25 outline-none
                               focus:border-[#c9a84c]/50 focus:bg-white/[0.10] transition-all"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe to newsletter"
                    className="flex-shrink-0 inline-flex items-center gap-1.5 h-12 px-5 rounded-xl
                               text-[#050b14] text-sm font-bold transition-all
                               hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #a87828 0%, #c9a84c 50%, #dab445 100%)', boxShadow: '0 4px 20px rgba(201,168,76,0.40)' }}
                  >
                    Subscribe
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
              <p className="text-[10px] text-white/25 mt-2 text-center lg:text-left">
                No spam. Unsubscribe anytime. 12,000+ subscribers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main footer links ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[#050b14] text-sm"
                   style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92" />
                  <circle cx="6.5" cy="15" r="2" fill="white" />
                  <circle cx="13.5" cy="15" r="2" fill="white" />
                </svg>
              </div>
              <div>
                <span className="font-black text-white text-lg leading-none block">AutoBazaarPro</span>
                <span className="text-[9px] text-[#c9a84c]/60 uppercase tracking-widest">Premium Marketplace</span>
              </div>
            </div>
            <p className="text-white/30 text-xs leading-relaxed mb-5 max-w-[200px]">
              The #1 automotive marketplace in Iraq, Kurdistan & the Gulf region.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[['24k+', 'Listings'], ['1.2k+', 'Dealers'], ['8', 'Cities'], ['4.9★', 'Rating']].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-white/[0.04] border border-white/[0.05] px-3 py-2">
                  <p className="text-sm font-black text-[#c9a84c]">{v}</p>
                  <p className="text-[10px] text-white/25">{l}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {[['𝕏', 'https://x.com'], ['f', 'https://facebook.com'], ['in', 'https://linkedin.com'], ['📸', 'https://instagram.com']].map(([s, href]) => (
                <Link key={s as string} href={href as string}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs
                                 bg-white/[0.05] border border-white/[0.08] text-white/35
                                 hover:border-[rgba(201,168,76,0.40)] hover:text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)]
                                 transition-all duration-200">
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item}>
                    <Link
                      href="/${item.toLowerCase().replace(/\s+/g, '-').replace(/[&×]/g, '')}"
                      className="text-white/35 hover:text-[#c9a84c] text-xs transition-colors duration-200
                                 flex items-center gap-1 group"
                    >
                      <span className="w-0 group-hover:w-2 overflow-hidden transition-all duration-200
                                       text-[#c9a84c]">›</span>
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="h-px bg-white/[0.06] mb-8" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} AutoBazaarPro. All rights reserved. Iraq · Kurdistan · UAE
          </p>
          <div className="flex gap-5 flex-wrap justify-center">
            {['Privacy Policy', 'Terms of Use', 'Cookie Policy', 'Sitemap'].map(item => (
              <Link key={item} href="#"
                    className="text-white/20 hover:text-white/50 text-xs transition-colors duration-200">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
