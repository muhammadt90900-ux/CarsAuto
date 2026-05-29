// components/shared/Footer.tsx — Enterprise footer
import Link from 'next/link';

const FOOTER_LINKS = {
  Browse:   ['All Cars','SUVs & 4×4','Luxury Cars','Electric','Spare Parts','Motorcycles','New Listings'],
  Services: ['Sell Your Car','Dealer Portal','Premium Listing','Car Valuation','Import & Export','Financing'],
  Cities:   ['Erbil','Sulaymaniyah','Duhok','Kirkuk','Baghdad','Basra','Dubai','Sharjah'],
  Company:  ['About Us','Careers','Press','Blog','Contact','Help Center','Privacy Policy'],
};

export function Footer({ locale = 'en' }: { locale?: string }) {
  return (
    <footer className="relative overflow-hidden" style={{ background:'linear-gradient(180deg,#050b14 0%,#030710 100%)' }}>
      <div className="h-px" style={{ background:'linear-gradient(90deg,transparent,rgba(201,168,76,0.45),transparent)' }}/>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[var(--ink-900)] text-sm"
                   style={{ background:'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}>A</div>
              <div>
                <span className="font-black text-white text-lg leading-none block">AutoBazaarPro</span>
                <span className="text-[9px] text-[var(--gold)]/60 uppercase tracking-widest">Premium Marketplace</span>
              </div>
            </div>
            <p className="text-white/30 text-xs leading-relaxed mb-5 max-w-[200px]">
              The #1 automotive marketplace in Iraq, Kurdistan & the Gulf region.
            </p>
            <div className="flex gap-2">
              {[['𝕏','https://x.com'],['f','https://facebook.com'],['in','https://linkedin.com'],['📸','https://instagram.com']].map(([s, href]) => (
                <Link key={s} href={href}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs
                                 bg-white/[0.05] border border-white/[0.08] text-white/35
                                 hover:border-[rgba(201,168,76,0.40)] hover:text-[var(--gold)] hover:bg-[rgba(201,168,76,0.08)]
                                 transition-all duration-200">
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="text-white font-bold text-sm mb-4">{heading}</h4>
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item}>
                    <Link href={`/${locale}/${item.toLowerCase().replace(/\s+/g,'-').replace(/[&×]/g,'')}`}
                          className="text-white/35 hover:text-[var(--gold)] text-xs transition-colors duration-200">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="rounded-2xl p-5 mb-10 flex flex-col sm:flex-row gap-4 items-center justify-between"
             style={{ background:'linear-gradient(135deg,rgba(11,21,37,0.8),rgba(8,15,28,0.9))', border:'1px solid rgba(201,168,76,0.12)' }}>
          <div>
            <p className="text-white font-bold text-sm">Subscribe to our newsletter</p>
            <p className="text-white/35 text-xs mt-0.5">Get new listings, deals and market updates.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input type="email" placeholder="your@email.com"
              className="flex-1 sm:w-56 h-9 bg-white/[0.06] border border-white/[0.10] rounded-xl
                         px-3 text-white text-xs placeholder-white/25 outline-none
                         focus:border-[var(--gold)]/50 transition-colors"/>
            <button className="btn-gold h-9 px-4 text-xs rounded-xl flex-shrink-0">Subscribe</button>
          </div>
        </div>

        <div className="h-px bg-white/[0.06] mb-8"/>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} AutoBazaarPro. All rights reserved. Iraq · Kurdistan · UAE
          </p>
          <div className="flex gap-5 flex-wrap justify-center">
            {['Privacy Policy','Terms of Use','Cookie Policy','Sitemap'].map(item => (
              <Link key={item} href="#"
                    className="text-white/20 hover:text-white/45 text-xs transition-colors duration-200">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
