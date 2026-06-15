// prisma/data-listings.ts
// Seed helpers: locations, users, listing templates, image placeholders

export interface LocationSeed {
  country: string;
  governorate?: string;
  city: string;
  nameKu: string;
  nameAr: string;
  nameEn: string;
  nameZh: string;
  lat: number;
  lng: number;
  currency: string;
  priceMultiplier: number; // multiplies base price for regional realism
}

export interface UserSeed {
  email: string;
  phone?: string;
  name: string;
  nameAr?: string;
  role: 'USER' | 'DEALER';
  locale: string;
  avatar: string;
  verified: boolean;
  countryHint: string; // links to LocationSeed.country for realistic listings
}

// ── Locations ────────────────────────────────────────────────────────────────

export const LOCATIONS: LocationSeed[] = [
  // Iraq
  { country: 'IQ', governorate: 'Erbil', city: 'Erbil', nameKu: 'هەولێر', nameAr: 'أربيل', nameEn: 'Erbil', nameZh: '艾比尔', lat: 36.191, lng: 44.009, currency: 'USD', priceMultiplier: 1.0 },
  { country: 'IQ', governorate: 'Sulaymaniyah', city: 'Sulaymaniyah', nameKu: 'سلێمانی', nameAr: 'السليمانية', nameEn: 'Sulaymaniyah', nameZh: '苏莱曼尼耶', lat: 35.557, lng: 45.432, currency: 'USD', priceMultiplier: 0.95 },
  { country: 'IQ', governorate: 'Duhok', city: 'Duhok', nameKu: 'دهۆک', nameAr: 'دهوك', nameEn: 'Duhok', nameZh: '杜胡克', lat: 36.867, lng: 42.982, currency: 'USD', priceMultiplier: 0.92 },
  { country: 'IQ', governorate: 'Baghdad', city: 'Baghdad', nameKu: 'بەغدا', nameAr: 'بغداد', nameEn: 'Baghdad', nameZh: '巴格达', lat: 33.315, lng: 44.366, currency: 'USD', priceMultiplier: 0.98 },
  { country: 'IQ', governorate: 'Basra', city: 'Basra', nameKu: 'بەسرە', nameAr: 'البصرة', nameEn: 'Basra', nameZh: '巴士拉', lat: 30.508, lng: 47.783, currency: 'USD', priceMultiplier: 0.97 },
  { country: 'IQ', governorate: 'Mosul', city: 'Mosul', nameKu: 'مووسڵ', nameAr: 'الموصل', nameEn: 'Mosul', nameZh: '摩苏尔', lat: 36.340, lng: 43.129, currency: 'USD', priceMultiplier: 0.93 },
  { country: 'IQ', governorate: 'Kirkuk', city: 'Kirkuk', nameKu: 'کەرکووک', nameAr: 'كركوك', nameEn: 'Kirkuk', nameZh: '基尔库克', lat: 35.469, lng: 44.392, currency: 'USD', priceMultiplier: 0.94 },
  // UAE
  { country: 'AE', city: 'Dubai', nameKu: 'دوبەی', nameAr: 'دبي', nameEn: 'Dubai', nameZh: '迪拜', lat: 25.204, lng: 55.270, currency: 'AED', priceMultiplier: 1.20 },
  { country: 'AE', city: 'Abu Dhabi', nameKu: 'ئەبووزابی', nameAr: 'أبو ظبي', nameEn: 'Abu Dhabi', nameZh: '阿布扎比', lat: 24.466, lng: 54.367, currency: 'AED', priceMultiplier: 1.15 },
  { country: 'AE', city: 'Sharjah', nameKu: 'شارجە', nameAr: 'الشارقة', nameEn: 'Sharjah', nameZh: '沙迦', lat: 25.346, lng: 55.413, currency: 'AED', priceMultiplier: 1.10 },
  // Saudi Arabia
  { country: 'SA', city: 'Riyadh', nameKu: 'ڕیاض', nameAr: 'الرياض', nameEn: 'Riyadh', nameZh: '利雅得', lat: 24.688, lng: 46.724, currency: 'SAR', priceMultiplier: 1.10 },
  { country: 'SA', city: 'Jeddah', nameKu: 'جیدە', nameAr: 'جدة', nameEn: 'Jeddah', nameZh: '吉达', lat: 21.485, lng: 39.192, currency: 'SAR', priceMultiplier: 1.08 },
  { country: 'SA', city: 'Dammam', nameKu: 'دەمام', nameAr: 'الدمام', nameEn: 'Dammam', nameZh: '达曼', lat: 26.433, lng: 50.104, currency: 'SAR', priceMultiplier: 1.05 },
  // Turkey
  { country: 'TR', city: 'Istanbul', nameKu: 'ئیستانبوڵ', nameAr: 'إسطنبول', nameEn: 'Istanbul', nameZh: '伊斯坦布尔', lat: 41.008, lng: 28.978, currency: 'USD', priceMultiplier: 0.85 },
  { country: 'TR', city: 'Ankara', nameKu: 'ئەنقەرە', nameAr: 'أنقرة', nameEn: 'Ankara', nameZh: '安卡拉', lat: 39.934, lng: 32.860, currency: 'USD', priceMultiplier: 0.80 },
  // Kuwait
  { country: 'KW', city: 'Kuwait City', nameKu: 'کوێیت', nameAr: 'مدينة الكويت', nameEn: 'Kuwait City', nameZh: '科威特城', lat: 29.369, lng: 47.978, currency: 'KWD', priceMultiplier: 1.18 },
  // Jordan
  { country: 'JO', city: 'Amman', nameKu: 'عەمان', nameAr: 'عمان', nameEn: 'Amman', nameZh: '安曼', lat: 31.956, lng: 35.945, currency: 'USD', priceMultiplier: 0.88 },
  // Germany
  { country: 'DE', city: 'Berlin', nameKu: 'بێرلین', nameAr: 'برلين', nameEn: 'Berlin', nameZh: '柏林', lat: 52.520, lng: 13.405, currency: 'EUR', priceMultiplier: 1.25 },
  // UK
  { country: 'GB', city: 'London', nameKu: 'لەندەن', nameAr: 'لندن', nameEn: 'London', nameZh: '伦敦', lat: 51.507, lng: -0.128, currency: 'GBP', priceMultiplier: 1.30 },
  // UAE — additional cities
  { country: 'AE', governorate: 'Ajman', city: 'Ajman', nameKu: 'عەجمان', nameAr: 'عجمان', nameEn: 'Ajman', nameZh: '阿治曼', lat: 25.405, lng: 55.514, currency: 'AED', priceMultiplier: 1.05 },
  { country: 'AE', governorate: 'Ras Al Khaimah', city: 'Ras Al Khaimah', nameKu: 'ڕاس ئەڵ خەیمە', nameAr: 'رأس الخيمة', nameEn: 'Ras Al Khaimah', nameZh: '哈伊马角', lat: 25.789, lng: 55.960, currency: 'AED', priceMultiplier: 1.02 },
  // China
  { country: 'CN', governorate: 'Beijing', city: 'Beijing', nameKu: 'بێجینگ', nameAr: 'بكين', nameEn: 'Beijing', nameZh: '北京', lat: 39.9042, lng: 116.4074, currency: 'CNY', priceMultiplier: 1.10 },
  { country: 'CN', governorate: 'Shanghai', city: 'Shanghai', nameKu: 'شانگهای', nameAr: 'شانغهاي', nameEn: 'Shanghai', nameZh: '上海', lat: 31.2304, lng: 121.4737, currency: 'CNY', priceMultiplier: 1.15 },
  { country: 'CN', governorate: 'Guangdong', city: 'Guangzhou', nameKu: 'گوانگجوو', nameAr: 'قوانغتشو', nameEn: 'Guangzhou', nameZh: '广州', lat: 23.1291, lng: 113.2644, currency: 'CNY', priceMultiplier: 1.08 },
  { country: 'CN', governorate: 'Guangdong', city: 'Shenzhen', nameKu: 'شێنجین', nameAr: 'شنتشن', nameEn: 'Shenzhen', nameZh: '深圳', lat: 22.5431, lng: 114.0579, currency: 'CNY', priceMultiplier: 1.12 },
  { country: 'CN', governorate: 'Sichuan', city: 'Chengdu', nameKu: 'چێنگدوو', nameAr: 'تشنغدو', nameEn: 'Chengdu', nameZh: '成都', lat: 30.5728, lng: 104.0668, currency: 'CNY', priceMultiplier: 1.00 },
  { country: 'CN', governorate: 'Shaanxi', city: "Xi'an", nameKu: 'شیئان', nameAr: 'شيان', nameEn: "Xi'an", nameZh: '西安', lat: 34.3416, lng: 108.9398, currency: 'CNY', priceMultiplier: 0.95 },
  { country: 'CN', governorate: 'Zhejiang', city: 'Hangzhou', nameKu: 'هانگجوو', nameAr: 'هانغتشو', nameEn: 'Hangzhou', nameZh: '杭州', lat: 30.2741, lng: 120.1551, currency: 'CNY', priceMultiplier: 1.08 },
  { country: 'CN', governorate: 'Hubei', city: 'Wuhan', nameKu: 'ووهان', nameAr: 'ووهان', nameEn: 'Wuhan', nameZh: '武汉', lat: 30.5928, lng: 114.3055, currency: 'CNY', priceMultiplier: 0.98 },
  { country: 'CN', governorate: 'Liaoning', city: 'Shenyang', nameKu: 'شێنیانگ', nameAr: 'شنيانغ', nameEn: 'Shenyang', nameZh: '沈阳', lat: 41.8057, lng: 123.4315, currency: 'CNY', priceMultiplier: 0.92 },
  { country: 'CN', governorate: 'Tianjin', city: 'Tianjin', nameKu: 'تیانجین', nameAr: 'تيانجين', nameEn: 'Tianjin', nameZh: '天津', lat: 39.3434, lng: 117.3616, currency: 'CNY', priceMultiplier: 1.05 },
  { country: 'CN', governorate: 'Jiangsu', city: 'Nanjing', nameKu: 'نانجینگ', nameAr: 'نانجينغ', nameEn: 'Nanjing', nameZh: '南京', lat: 32.0603, lng: 118.7969, currency: 'CNY', priceMultiplier: 1.03 },
  { country: 'CN', governorate: 'Shandong', city: 'Qingdao', nameKu: 'چینگداو', nameAr: 'تشينغداو', nameEn: 'Qingdao', nameZh: '青岛', lat: 36.0671, lng: 120.3826, currency: 'CNY', priceMultiplier: 1.00 },
  { country: 'CN', governorate: 'Henan', city: 'Zhengzhou', nameKu: 'جێنگجوو', nameAr: 'تشنغتشو', nameEn: 'Zhengzhou', nameZh: '郑州', lat: 34.7466, lng: 113.6253, currency: 'CNY', priceMultiplier: 0.96 },
  // USA
  { country: 'US', city: 'Houston', nameKu: 'هیووستۆن', nameAr: 'هيوستن', nameEn: 'Houston', nameZh: '休斯顿', lat: 29.760, lng: -95.369, currency: 'USD', priceMultiplier: 1.15 },
];

// ── Image placeholder templates ───────────────────────────────────────────────
// We use a CDN pattern: https://images.unsplash.com/photo-<id>?auto=format&w=800
// These IDs correspond to real unsplash automotive photos (stable URLs).

export const CAR_IMAGE_POOLS: Record<string, string[]> = {
  sedan: [
    'https://images.unsplash.com/photo-1617469767011-62f2e20be3d0?auto=format&w=800',
    'https://images.unsplash.com/photo-1612825173281-9a193378527e?auto=format&w=800',
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&w=800',
    'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&w=800',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&w=800',
  ],
  suv: [
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&w=800',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&w=800',
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&w=800',
    'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?auto=format&w=800',
    'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?auto=format&w=800',
  ],
  pickup: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&w=800',
    'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&w=800',
    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&w=800',
  ],
  luxury: [
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&w=800',
    'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&w=800',
    'https://images.unsplash.com/photo-1580274455191-1c62238fa333?auto=format&w=800',
    'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&w=800',
  ],
  hatchback: [
    'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&w=800',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&w=800',
  ],
  electric: [
    'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&w=800',
    'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&w=800',
    'https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?auto=format&w=800',
  ],
  spare: [
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&w=800',
    'https://images.unsplash.com/photo-1580974928064-f0aeef70895a?auto=format&w=800',
    'https://images.unsplash.com/photo-1620842484430-c2e3e1e1e4d1?auto=format&w=800',
  ],
};

// ── Seller profiles ───────────────────────────────────────────────────────────

export const USERS: UserSeed[] = [
  // Kurdish dealers
  { email: 'dealer.erbil@autoiq.com', phone: '+9647501234567', name: 'Karo Salih', role: 'DEALER', locale: 'ku', avatar: 'https://i.pravatar.cc/150?u=karo', verified: true, countryHint: 'IQ' },
  { email: 'dealer.suli@autoiq.com', phone: '+9647701234568', name: 'Saman Ahmad', role: 'DEALER', locale: 'ku', avatar: 'https://i.pravatar.cc/150?u=saman', verified: true, countryHint: 'IQ' },
  { email: 'dealer.duhok@autoiq.com', phone: '+9647621234569', name: 'Dilan Mahmoud', role: 'DEALER', locale: 'ku', avatar: 'https://i.pravatar.cc/150?u=dilan', verified: true, countryHint: 'IQ' },
  { email: 'dealer.kirkuk@autoiq.com', phone: '+9647811234570', name: 'Omed Hassan', role: 'DEALER', locale: 'ku', avatar: 'https://i.pravatar.cc/150?u=omed', verified: true, countryHint: 'IQ' },
  // Arabic dealers (Iraq)
  { email: 'dealer.baghdad@autoiq.com', phone: '+9647901234571', name: 'Ahmed Al-Rashid', role: 'DEALER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=ahmed_bg', verified: true, countryHint: 'IQ' },
  { email: 'dealer.basra@autoiq.com', phone: '+9647611234572', name: 'Ali Al-Zubaidi', role: 'DEALER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=ali_bs', verified: true, countryHint: 'IQ' },
  // UAE dealers
  { email: 'dealer.dubai@autoiq.com', phone: '+971501234573', name: 'Mohammed Al-Maktoum', role: 'DEALER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=moh_dubai', verified: true, countryHint: 'AE' },
  { email: 'dealer.abudhabi@autoiq.com', phone: '+971521234574', name: 'Khalid Al-Nahyan', role: 'DEALER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=khalid_ad', verified: true, countryHint: 'AE' },
  // Saudi dealers
  { email: 'dealer.riyadh@autoiq.com', phone: '+966501234575', name: 'Sultan Al-Saud', role: 'DEALER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=sultan_sa', verified: true, countryHint: 'SA' },
  { email: 'dealer.jeddah@autoiq.com', phone: '+966561234576', name: 'Faisal Al-Ghamdi', role: 'DEALER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=faisal_jed', verified: true, countryHint: 'SA' },
  // Turkish dealers
  { email: 'dealer.istanbul@autoiq.com', phone: '+905321234577', name: 'Mehmet Yilmaz', role: 'DEALER', locale: 'en', avatar: 'https://i.pravatar.cc/150?u=mehmet', verified: true, countryHint: 'TR' },
  // Private sellers (IQ)
  // Chinese dealers & users
  { email: 'dealer.beijing@autoiq.com', phone: '+8613901234578', name: 'Zhang Wei', role: 'DEALER', locale: 'zh', avatar: 'https://i.pravatar.cc/150?u=zhang_wei', verified: true, countryHint: 'CN' },
  { email: 'dealer.shanghai@autoiq.com', phone: '+8613811234579', name: 'Li Fang', role: 'DEALER', locale: 'zh', avatar: 'https://i.pravatar.cc/150?u=li_fang', verified: true, countryHint: 'CN' },
  { email: 'dealer.shenzhen@autoiq.com', phone: '+8615901234580', name: 'Wang Jian', role: 'DEALER', locale: 'zh', avatar: 'https://i.pravatar.cc/150?u=wang_jian', verified: true, countryHint: 'CN' },
  { email: 'user.chen@mail.com', phone: '+8613700000001', name: 'Chen Mei', role: 'USER', locale: 'zh', avatar: 'https://i.pravatar.cc/150?u=chen_mei', verified: true, countryHint: 'CN' },
  { email: 'user.karim@mail.com', phone: '+9647511111111', name: 'Karim Jawhar', role: 'USER', locale: 'ku', avatar: 'https://i.pravatar.cc/150?u=karim_j', verified: false, countryHint: 'IQ' },
  { email: 'user.nadia@mail.com', phone: '+9647522222222', name: 'Nadia Al-Shami', role: 'USER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=nadia_s', verified: false, countryHint: 'IQ' },
  { email: 'user.omar@mail.com', phone: '+9647533333333', name: 'Omar Farouq', role: 'USER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=omar_f', verified: true, countryHint: 'IQ' },
  { email: 'user.renas@mail.com', phone: '+9647544444444', name: 'Renas Barzani', role: 'USER', locale: 'ku', avatar: 'https://i.pravatar.cc/150?u=renas_b', verified: false, countryHint: 'IQ' },
  { email: 'user.sara@mail.com', phone: '+9647555555555', name: 'Sara Ismail', role: 'USER', locale: 'ku', avatar: 'https://i.pravatar.cc/150?u=sara_i', verified: true, countryHint: 'IQ' },
  // Private sellers (AE, SA)
  { email: 'user.dubai1@mail.com', phone: '+971551111111', name: 'James Parker', role: 'USER', locale: 'en', avatar: 'https://i.pravatar.cc/150?u=james_p', verified: true, countryHint: 'AE' },
  { email: 'user.riyadh1@mail.com', phone: '+966541111111', name: 'Tariq Alhajri', role: 'USER', locale: 'ar', avatar: 'https://i.pravatar.cc/150?u=tariq_r', verified: false, countryHint: 'SA' },
];

// ── Title / description templates per locale ──────────────────────────────────

export interface ListingTemplate {
  titleKu: (brand: string, model: string, year: number, trim: string) => string;
  titleAr: (brand: string, model: string, year: number, trim: string) => string;
  titleEn: (brand: string, model: string, year: number, trim: string) => string;
  titleZh: (brand: string, model: string, year: number, trim: string) => string;
  descKu: (brand: string, model: string, year: number, mileage: number, color: string) => string;
  descAr: (brand: string, model: string, year: number, mileage: number, color: string) => string;
  descEn: (brand: string, model: string, year: number, mileage: number, color: string) => string;
  descZh: (brand: string, model: string, year: number, mileage: number, color: string) => string;
}

export const CAR_LISTING_TEMPLATES: ListingTemplate[] = [
  {
    titleKu: (b, m, y, t) => `${b} ${m} ${y} - ${t}`,
    titleAr: (b, m, y, t) => `${b} ${m} ${y} - ${t} للبيع`,
    titleEn: (b, m, y, t) => `${y} ${b} ${m} ${t} - Excellent Condition`,
    titleZh: (b, m, y, t) => `${y}款 ${b} ${m} ${t} 出售`,
    descKu: (b, m, y, ml, c) => `${b} ${m} ساڵی ${y}، رەنگ ${c}، ${ml.toLocaleString()} کیلۆمەتر، بار باشە، هیچ کێشەیەک نییە. خاوەن یەکەم.`,
    descAr: (b, m, y, ml, c) => `${b} ${m} ${y}، لون ${c}، ماشى ${ml.toLocaleString()} كيلومتر، حالة ممتازة، لا أعطال. المالك الأول.`,
    descEn: (b, m, y, ml, c) => `${y} ${b} ${m} in ${c}. ${ml.toLocaleString()} km on the clock. Single owner, well maintained, all service records available.`,
    descZh: (b, m, y, ml, c) => `${y}年款${b} ${m}，颜色${c}，行驶${ml.toLocaleString()}公里，车况良好，一手车，所有保养记录齐全。`,
  },
  {
    titleKu: (b, m, y, t) => `${b} ${m} ${t} ساڵی ${y} بۆ فرۆشتن`,
    titleAr: (b, m, y, t) => `للبيع ${b} ${m} ${t} موديل ${y}`,
    titleEn: (b, m, y, t) => `For Sale: ${b} ${m} ${t} (${y})`,
    titleZh: (b, m, y, t) => `转让${y}年 ${b} ${m} ${t}`,
    descKu: (b, m, y, ml, c) => `ئۆتۆمبیلی ${b} ${m} ساڵی ${y}ی بۆ فرۆشتن هەیە. رەنگ ${c}، ${ml.toLocaleString()} کیلۆمەتر، موتووری سالیم.`,
    descAr: (b, m, y, ml, c) => `معروض للبيع ${b} ${m} موديل ${y}، اللون ${c}، العداد ${ml.toLocaleString()} كم، المحرك سليم تماماً.`,
    descEn: (b, m, y, ml, c) => `Selling my ${y} ${b} ${m}. Color: ${c}. Mileage: ${ml.toLocaleString()} km. Engine in perfect condition.`,
    descZh: (b, m, y, ml, c) => `出售本人${y}年${b} ${m}，${c}色，里程${ml.toLocaleString()}公里，发动机状态完美。`,
  },
];

// ── Colors (multilingual) ─────────────────────────────────────────────────────

export const COLORS = [
  { en: 'White', ar: 'أبيض', ku: 'سپی' },
  { en: 'Black', ar: 'أسود', ku: 'ڕەش' },
  { en: 'Silver', ar: 'فضي', ku: 'زیوی' },
  { en: 'Gray', ar: 'رمادي', ku: 'خۆڵەمێشی' },
  { en: 'Red', ar: 'أحمر', ku: 'سوور' },
  { en: 'Blue', ar: 'أزرق', ku: 'شین' },
  { en: 'Beige', ar: 'بيج', ku: 'بێژ' },
  { en: 'Brown', ar: 'بني', ku: 'قاوەیی' },
  { en: 'Green', ar: 'أخضر', ku: 'سەوز' },
  { en: 'Pearl White', ar: 'أبيض لؤلؤي', ku: 'سپی مەرجانی' },
];

// ── Spare parts data ──────────────────────────────────────────────────────────

export interface PartSeed {
  nameEn: string;
  nameAr: string;
  nameKu: string;
  nameZh: string;
  descEn: string;
  descAr: string;
  descKu: string;
  descZh: string;
  partNumber: string;
  basePriceUsd: number;
  compatibleBrands: string[]; // brand slugs
}

export const SPARE_PARTS: PartSeed[] = [
  {
    nameEn: 'Front Bumper', nameAr: 'مصد أمامي', nameKu: 'بامپەری پێشەوە', nameZh: '前保险杠',
    descEn: 'OEM front bumper, original factory part.', descAr: 'مصدة أمامية أصلية.', descKu: 'بامپەری پێشەوە ئۆریجینال.', descZh: '原厂前保险杠。',
    partNumber: 'FBP-001', basePriceUsd: 180, compatibleBrands: ['toyota', 'nissan'],
  },
  {
    nameEn: 'Brake Pads Set', nameAr: 'طقم فرامل', nameKu: 'سێتی فەرمانی', nameZh: '刹车片套装',
    descEn: 'High-performance brake pads, front axle set.', descAr: 'طقم فرامل عالي الأداء للمحور الأمامي.', descKu: 'فەرمانی بەرزکاری بۆ ئەکسی پێشەوە.', descZh: '高性能前轴刹车片组。',
    partNumber: 'BRK-SET-F', basePriceUsd: 65, compatibleBrands: ['toyota', 'honda', 'nissan', 'hyundai', 'kia'],
  },
  {
    nameEn: 'Oil Filter', nameAr: 'فلتر زيت', nameKu: 'فیلتەری زەیت', nameZh: '机油滤清器',
    descEn: 'Genuine oil filter for petrol and diesel engines.', descAr: 'فلتر زيت أصلي للمحركات البنزينية والديزل.', descKu: 'فیلتەری زەیتی ئۆریجینال.', descZh: '原装适用于汽油和柴油发动机的机油滤清器。',
    partNumber: 'OIL-FLT-GEN', basePriceUsd: 12, compatibleBrands: ['toyota', 'honda', 'nissan', 'mitsubishi', 'lexus'],
  },
  {
    nameEn: 'Air Filter', nameAr: 'فلتر هواء', nameKu: 'فیلتەری هەوا', nameZh: '空气滤清器',
    descEn: 'OEM air filter, 100,000 km service life.', descAr: 'فلتر هواء أصلي، عمر خدمة 100,000 كم.', descKu: 'فیلتەری هەوای ئۆریجینال، ۱۰۰,۰۰۰ کیلۆمەتر خزمەت.', descZh: '原装空气滤清器，使用寿命10万公里。',
    partNumber: 'AIR-FLT-001', basePriceUsd: 25, compatibleBrands: ['toyota', 'honda', 'ford', 'chevrolet'],
  },
  {
    nameEn: 'Headlight Assembly', nameAr: 'مجموعة المصباح الأمامي', nameKu: 'کۆمەڵی چرای پێش', nameZh: '大灯总成',
    descEn: 'Complete OEM headlight assembly, LED projector.', descAr: 'مجموعة المصباح الأمامي الأصلية الكاملة، بروجكتور LED.', descKu: 'کۆمەڵی چرای پێشەوە تەواو، ئێلێکترووی.', descZh: '完整原装大灯总成，LED投影。',
    partNumber: 'HLT-LED-001', basePriceUsd: 320, compatibleBrands: ['bmw', 'mercedes-benz', 'audi'],
  },
  {
    nameEn: 'Shock Absorber', nameAr: 'مساعد (ماص صدمات)', nameKu: 'شۆک ئەبزۆربەر', nameZh: '减震器',
    descEn: 'Heavy-duty shock absorber for off-road use.', descAr: 'ماص صدمات للطرق الوعرة.', descKu: 'شۆک ئەبزۆربەری قووی بۆ ڕێگای نەهەموار.', descZh: '适合越野使用的重型减震器。',
    partNumber: 'SHK-4X4-H', basePriceUsd: 95, compatibleBrands: ['toyota', 'mitsubishi', 'jeep', 'land-rover'],
  },
  {
    nameEn: 'Transmission Filter', nameAr: 'فلتر ناقل الحركة', nameKu: 'فیلتەری گێرجە', nameZh: '变速箱滤清器',
    descEn: 'Automatic transmission filter kit with gasket.', descAr: 'طقم فلتر ناقل الحركة الأوتوماتيكي مع الجوانة.', descKu: 'کیتی فیلتەری گێرجەی ئۆتۆماتیکی لەگەڵ گەسکیت.', descZh: '自动变速箱滤清器套件含衬垫。',
    partNumber: 'TRN-FLT-AT', basePriceUsd: 45, compatibleBrands: ['toyota', 'nissan', 'ford', 'chevrolet'],
  },
  {
    nameEn: 'Alloy Wheel 18"', nameAr: 'جنط ألومنيوم 18 بوصة', nameKu: 'چەرخی ئەلومینیۆم ١٨ ئینچ', nameZh: '18英寸铝合金轮毂',
    descEn: '18-inch lightweight alloy wheel, 5x114.3 PCD.', descAr: 'جنط ألومنيوم خفيف الوزن 18 بوصة.', descKu: 'چەرخی سووکی ئەلومینیۆم ١٨ ئینچ.', descZh: '18英寸轻量铝合金轮毂，5x114.3螺距。',
    partNumber: 'WHL-ALY-18', basePriceUsd: 150, compatibleBrands: ['toyota', 'honda', 'nissan', 'hyundai', 'kia'],
  },
];
