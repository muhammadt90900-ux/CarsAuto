// prisma/data-brands.ts
// Real automotive brands with multilingual names (En / Ar / Ku / Zh)

export interface BrandSeed {
  slug: string;
  nameEn: string;
  nameAr: string;
  nameKu: string;
  nameZh: string;
  countryCode: string;
  logoUrl: string;
}

export interface ModelSeed {
  brandSlug: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  nameKu: string;
  nameZh: string;
  generations: GenerationSeed[];
}

export interface GenerationSeed {
  name?: string;
  yearFrom: number;
  yearTo?: number;
  trims: TrimSeed[];
}

export interface TrimSeed {
  name: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  engineCC?: number;
  engineLabel?: string;
  powerKw?: number;
  doors?: number;
  seats?: number;
}

export const BRANDS: BrandSeed[] = [
  // ── Japanese ────────────────────────────────────────────────────────────────
  {
    slug: 'toyota', nameEn: 'Toyota', nameAr: 'تويوتا', nameKu: 'تۆیۆتا', nameZh: '丰田',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/toyota.svg',
  },
  {
    slug: 'honda', nameEn: 'Honda', nameAr: 'هوندا', nameKu: 'هۆندا', nameZh: '本田',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/honda.svg',
  },
  {
    slug: 'nissan', nameEn: 'Nissan', nameAr: 'نيسان', nameKu: 'نیسان', nameZh: '日产',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/nissan.svg',
  },
  {
    slug: 'mitsubishi', nameEn: 'Mitsubishi', nameAr: 'ميتسوبيشي', nameKu: 'میتسوبیشی', nameZh: '三菱',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/mitsubishi.svg',
  },
  {
    slug: 'mazda', nameEn: 'Mazda', nameAr: 'مازدا', nameKu: 'مازدا', nameZh: '马自达',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/mazda.svg',
  },
  {
    slug: 'subaru', nameEn: 'Subaru', nameAr: 'سوبارو', nameKu: 'سوبارو', nameZh: '斯巴鲁',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/subaru.svg',
  },
  {
    slug: 'lexus', nameEn: 'Lexus', nameAr: 'لكزس', nameKu: 'لێکسەس', nameZh: '雷克萨斯',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/lexus.svg',
  },
  {
    slug: 'isuzu', nameEn: 'Isuzu', nameAr: 'إيسوزو', nameKu: 'ئیسوزو', nameZh: '五十铃',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/isuzu.svg',
  },
  // ── German ──────────────────────────────────────────────────────────────────
  {
    slug: 'bmw', nameEn: 'BMW', nameAr: 'بي إم دبليو', nameKu: 'بی ئێم دەبلیو', nameZh: '宝马',
    countryCode: 'DE', logoUrl: 'https://cdn.imagin.studio/brand-logos/bmw.svg',
  },
  {
    slug: 'mercedes-benz', nameEn: 'Mercedes-Benz', nameAr: 'مرسيدس بنز', nameKu: 'مێرسێدێس بێنز', nameZh: '梅赛德斯-奔驰',
    countryCode: 'DE', logoUrl: 'https://cdn.imagin.studio/brand-logos/mercedes-benz.svg',
  },
  {
    slug: 'volkswagen', nameEn: 'Volkswagen', nameAr: 'فولكسواجن', nameKu: 'فۆڵکسواگن', nameZh: '大众',
    countryCode: 'DE', logoUrl: 'https://cdn.imagin.studio/brand-logos/volkswagen.svg',
  },
  {
    slug: 'audi', nameEn: 'Audi', nameAr: 'أودي', nameKu: 'ئاودی', nameZh: '奥迪',
    countryCode: 'DE', logoUrl: 'https://cdn.imagin.studio/brand-logos/audi.svg',
  },
  {
    slug: 'porsche', nameEn: 'Porsche', nameAr: 'بورش', nameKu: 'پۆرشە', nameZh: '保时捷',
    countryCode: 'DE', logoUrl: 'https://cdn.imagin.studio/brand-logos/porsche.svg',
  },
  // ── American ─────────────────────────────────────────────────────────────────
  {
    slug: 'ford', nameEn: 'Ford', nameAr: 'فورد', nameKu: 'فۆرد', nameZh: '福特',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/ford.svg',
  },
  {
    slug: 'chevrolet', nameEn: 'Chevrolet', nameAr: 'شيفروليه', nameKu: 'شێڤرۆلێت', nameZh: '雪佛兰',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/chevrolet.svg',
  },
  {
    slug: 'jeep', nameEn: 'Jeep', nameAr: 'جيب', nameKu: 'جیپ', nameZh: '吉普',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/jeep.svg',
  },
  {
    slug: 'cadillac', nameEn: 'Cadillac', nameAr: 'كاديلاك', nameKu: 'کادیلاک', nameZh: '凯迪拉克',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/cadillac.svg',
  },
  // ── Korean ──────────────────────────────────────────────────────────────────
  {
    slug: 'hyundai', nameEn: 'Hyundai', nameAr: 'هيونداي', nameKu: 'هیووندای', nameZh: '现代',
    countryCode: 'KR', logoUrl: 'https://cdn.imagin.studio/brand-logos/hyundai.svg',
  },
  {
    slug: 'kia', nameEn: 'Kia', nameAr: 'كيا', nameKu: 'کیا', nameZh: '起亚',
    countryCode: 'KR', logoUrl: 'https://cdn.imagin.studio/brand-logos/kia.svg',
  },
  {
    slug: 'genesis', nameEn: 'Genesis', nameAr: 'جينيسيس', nameKu: 'جێنەسیس', nameZh: '捷尼赛思',
    countryCode: 'KR', logoUrl: 'https://cdn.imagin.studio/brand-logos/genesis.svg',
  },
  // ── Chinese ──────────────────────────────────────────────────────────────────
  {
    slug: 'byd', nameEn: 'BYD', nameAr: 'بي واي دي', nameKu: 'بی وای دی', nameZh: '比亚迪',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/byd.svg',
  },
  {
    slug: 'chery', nameEn: 'Chery', nameAr: 'شيري', nameKu: 'چێری', nameZh: '奇瑞',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/chery.svg',
  },
  {
    slug: 'haval', nameEn: 'Haval', nameAr: 'هافال', nameKu: 'هافاڵ', nameZh: '哈弗',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/haval.svg',
  },
  // ── More Chinese brands ──────────────────────────────────────────────────────
  {
    slug: 'geely', nameEn: 'Geely', nameAr: 'جيلي', nameKu: 'جیلی', nameZh: '吉利',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/geely.svg',
  },
  {
    slug: 'nio', nameEn: 'NIO', nameAr: 'نيو', nameKu: 'نیئۆ', nameZh: '蔚来',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/nio.svg',
  },
  {
    slug: 'li-auto', nameEn: 'Li Auto', nameAr: 'لي أوتو', nameKu: 'لی ئۆتۆ', nameZh: '理想',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/li-auto.svg',
  },
  {
    slug: 'xpeng', nameEn: 'XPENG', nameAr: 'شياو بنغ', nameKu: 'شیاوپێنگ', nameZh: '小鹏',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/xpeng.svg',
  },
  {
    slug: 'great-wall', nameEn: 'Great Wall', nameAr: 'غريت وول', nameKu: 'گرەیت ووڵ', nameZh: '长城',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/great-wall.svg',
  },
  {
    slug: 'saic', nameEn: 'SAIC Motor', nameAr: 'ساك موتور', nameKu: 'سایک مۆتۆر', nameZh: '上汽',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/saic.svg',
  },
  // ── British ──────────────────────────────────────────────────────────────────
  {
    slug: 'land-rover', nameEn: 'Land Rover', nameAr: 'لاند روفر', nameKu: 'لاند ڕۆڤەر', nameZh: '路虎',
    countryCode: 'GB', logoUrl: 'https://cdn.imagin.studio/brand-logos/land-rover.svg',
  },
  {
    slug: 'jaguar', nameEn: 'Jaguar', nameAr: 'جاغوار', nameKu: 'جاگوار', nameZh: '捷豹',
    countryCode: 'GB', logoUrl: 'https://cdn.imagin.studio/brand-logos/jaguar.svg',
  },
  // ── Italian ──────────────────────────────────────────────────────────────────
  {
    slug: 'fiat', nameEn: 'Fiat', nameAr: 'فيات', nameKu: 'فیات', nameZh: '菲亚特',
    countryCode: 'IT', logoUrl: 'https://cdn.imagin.studio/brand-logos/fiat.svg',
  },
  {
    slug: 'alfa-romeo', nameEn: 'Alfa Romeo', nameAr: 'ألفا روميو', nameKu: 'ئاڵفا ڕۆمێئۆ', nameZh: '阿尔法·罗密欧',
    countryCode: 'IT', logoUrl: 'https://cdn.imagin.studio/brand-logos/alfa-romeo.svg',
  },
  // ── French ──────────────────────────────────────────────────────────────────
  {
    slug: 'renault', nameEn: 'Renault', nameAr: 'رينو', nameKu: 'ڕێنۆ', nameZh: '雷诺',
    countryCode: 'FR', logoUrl: 'https://cdn.imagin.studio/brand-logos/renault.svg',
  },
  {
    slug: 'peugeot', nameEn: 'Peugeot', nameAr: 'بيجو', nameKu: 'پیژۆ', nameZh: '标致',
    countryCode: 'FR', logoUrl: 'https://cdn.imagin.studio/brand-logos/peugeot.svg',
  },
  {
    slug: 'citroen', nameEn: 'Citroën', nameAr: 'سيتروين', nameKu: 'سیترۆئین', nameZh: '雪铁龙',
    countryCode: 'FR', logoUrl: 'https://cdn.imagin.studio/brand-logos/citroen.svg',
  },
  // ── Japanese (additional) ───────────────────────────────────────────────────
  {
    slug: 'suzuki', nameEn: 'Suzuki', nameAr: 'سوزوكي', nameKu: 'سوزوکی', nameZh: '铃木',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/suzuki.svg',
  },
  {
    slug: 'infiniti', nameEn: 'Infiniti', nameAr: 'إنفينيتي', nameKu: 'ئینفینیتی', nameZh: '英菲尼迪',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/infiniti.svg',
  },
  {
    slug: 'acura', nameEn: 'Acura', nameAr: 'أكورا', nameKu: 'ئاکووڕا', nameZh: '讴歌',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/acura.svg',
  },
  {
    slug: 'daihatsu', nameEn: 'Daihatsu', nameAr: 'دايهاتسو', nameKu: 'دایهاتسو', nameZh: '大发',
    countryCode: 'JP', logoUrl: 'https://cdn.imagin.studio/brand-logos/daihatsu.svg',
  },
  // ── German (additional) ─────────────────────────────────────────────────────
  {
    slug: 'opel', nameEn: 'Opel', nameAr: 'أوبل', nameKu: 'ئۆپەل', nameZh: '欧宝',
    countryCode: 'DE', logoUrl: 'https://cdn.imagin.studio/brand-logos/opel.svg',
  },
  // ── American (additional) ───────────────────────────────────────────────────
  {
    slug: 'dodge', nameEn: 'Dodge', nameAr: 'دودج', nameKu: 'دۆج', nameZh: '道奇',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/dodge.svg',
  },
  {
    slug: 'gmc', nameEn: 'GMC', nameAr: 'جي إم سي', nameKu: 'جی ئێم سی', nameZh: 'GMC',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/gmc.svg',
  },
  {
    slug: 'lincoln', nameEn: 'Lincoln', nameAr: 'لينكولن', nameKu: 'لینکۆڵن', nameZh: '林肯',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/lincoln.svg',
  },
  {
    slug: 'tesla', nameEn: 'Tesla', nameAr: 'تيسلا', nameKu: 'تێسلا', nameZh: '特斯拉',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/tesla.svg',
  },
  {
    slug: 'ram', nameEn: 'RAM', nameAr: 'رام', nameKu: 'ڕام', nameZh: '公羊',
    countryCode: 'US', logoUrl: 'https://cdn.imagin.studio/brand-logos/ram.svg',
  },
  // ── Korean (additional) ─────────────────────────────────────────────────────
  {
    slug: 'ssangyong', nameEn: 'SsangYong', nameAr: 'سانج يونج', nameKu: 'سانگیۆنگ', nameZh: '双龙',
    countryCode: 'KR', logoUrl: 'https://cdn.imagin.studio/brand-logos/ssangyong.svg',
  },
  {
    slug: 'daewoo', nameEn: 'Daewoo', nameAr: 'دايو', nameKu: 'دائیوو', nameZh: '大宇',
    countryCode: 'KR', logoUrl: 'https://cdn.imagin.studio/brand-logos/daewoo.svg',
  },
  // ── British (additional) ────────────────────────────────────────────────────
  {
    slug: 'bentley', nameEn: 'Bentley', nameAr: 'بنتلي', nameKu: 'بێنتلی', nameZh: '宾利',
    countryCode: 'GB', logoUrl: 'https://cdn.imagin.studio/brand-logos/bentley.svg',
  },
  {
    slug: 'rolls-royce', nameEn: 'Rolls-Royce', nameAr: 'رولز رويس', nameKu: 'ڕۆڵز ڕۆیس', nameZh: '劳斯莱斯',
    countryCode: 'GB', logoUrl: 'https://cdn.imagin.studio/brand-logos/rolls-royce.svg',
  },
  {
    slug: 'mini', nameEn: 'MINI', nameAr: 'ميني', nameKu: 'مینی', nameZh: '迷你',
    countryCode: 'GB', logoUrl: 'https://cdn.imagin.studio/brand-logos/mini.svg',
  },
  {
    slug: 'aston-martin', nameEn: 'Aston Martin', nameAr: 'أستون مارتن', nameKu: 'ئاستۆن مارتین', nameZh: '阿斯顿·马丁',
    countryCode: 'GB', logoUrl: 'https://cdn.imagin.studio/brand-logos/aston-martin.svg',
  },
  // ── Italian (additional) ────────────────────────────────────────────────────
  {
    slug: 'ferrari', nameEn: 'Ferrari', nameAr: 'فيراري', nameKu: 'فێراری', nameZh: '法拉利',
    countryCode: 'IT', logoUrl: 'https://cdn.imagin.studio/brand-logos/ferrari.svg',
  },
  {
    slug: 'lamborghini', nameEn: 'Lamborghini', nameAr: 'لامبورغيني', nameKu: 'لامبۆرگینی', nameZh: '兰博基尼',
    countryCode: 'IT', logoUrl: 'https://cdn.imagin.studio/brand-logos/lamborghini.svg',
  },
  {
    slug: 'maserati', nameEn: 'Maserati', nameAr: 'مازيراتي', nameKu: 'مازێراتی', nameZh: '玛莎拉蒂',
    countryCode: 'IT', logoUrl: 'https://cdn.imagin.studio/brand-logos/maserati.svg',
  },
  // ── Swedish ──────────────────────────────────────────────────────────────────
  {
    slug: 'volvo', nameEn: 'Volvo', nameAr: 'فولفو', nameKu: 'ڤۆڵڤۆ', nameZh: '沃尔沃',
    countryCode: 'SE', logoUrl: 'https://cdn.imagin.studio/brand-logos/volvo.svg',
  },
  {
    slug: 'saab', nameEn: 'SAAB', nameAr: 'ساب', nameKu: 'ساب', nameZh: '萨博',
    countryCode: 'SE', logoUrl: 'https://cdn.imagin.studio/brand-logos/saab.svg',
  },
  // ── Chinese (additional) ────────────────────────────────────────────────────
  {
    slug: 'baic', nameEn: 'BAIC', nameAr: 'بايك', nameKu: 'بایک', nameZh: '北汽',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/baic.svg',
  },
  {
    slug: 'gac', nameEn: 'GAC', nameAr: 'جاك موتور', nameKu: 'گاک مۆتۆر', nameZh: '广汽',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/gac.svg',
  },
  {
    slug: 'mg', nameEn: 'MG', nameAr: 'إم جي', nameKu: 'ئێم جی', nameZh: '名爵',
    countryCode: 'CN', logoUrl: 'https://cdn.imagin.studio/brand-logos/mg.svg',
  },
];

// ─── Models per brand ────────────────────────────────────────────────────────

export const MODELS: ModelSeed[] = [
  // ── Toyota ──
  {
    brandSlug: 'toyota', slug: 'camry',
    nameEn: 'Camry', nameAr: 'كامري', nameKu: 'کامری', nameZh: '凯美瑞',
    generations: [
      {
        name: 'XV70', yearFrom: 2018, yearTo: 2024,
        trims: [
          { name: 'LE 2.5', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 2487, engineLabel: '2.5L', powerKw: 135, doors: 4, seats: 5 },
          { name: 'XSE 2.5 Hybrid', bodyType: 'SEDAN', fuelType: 'HYBRID', transmission: 'CVT', drivetrain: 'FWD', engineCC: 2487, engineLabel: '2.5L Hybrid', powerKw: 160, doors: 4, seats: 5 },
          { name: 'XLE V6', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3456, engineLabel: '3.5L V6', powerKw: 221, doors: 4, seats: 5 },
        ],
      },
      {
        name: 'XV50', yearFrom: 2012, yearTo: 2017,
        trims: [
          { name: 'SE 2.5', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 2494, engineLabel: '2.5L', powerKw: 132, doors: 4, seats: 5 },
          { name: 'XLE Hybrid', bodyType: 'SEDAN', fuelType: 'HYBRID', transmission: 'CVT', drivetrain: 'FWD', engineCC: 2494, engineLabel: '2.5L Hybrid', powerKw: 156, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'toyota', slug: 'land-cruiser',
    nameEn: 'Land Cruiser', nameAr: 'لاند كروزر', nameKu: 'لاند کرووزەر', nameZh: '陆地巡洋舰',
    generations: [
      {
        name: '300 Series', yearFrom: 2021,
        trims: [
          { name: 'GXR V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3444, engineLabel: '3.4L Twin-Turbo V6', powerKw: 305, doors: 4, seats: 8 },
          { name: 'VXR Diesel', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3346, engineLabel: '3.3L Twin-Turbo Diesel', powerKw: 227, doors: 4, seats: 8 },
        ],
      },
      {
        name: '200 Series', yearFrom: 2008, yearTo: 2021,
        trims: [
          { name: 'GXR V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 4608, engineLabel: '4.6L V8', powerKw: 232, doors: 4, seats: 8 },
          { name: 'VXR V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 4608, engineLabel: '4.6L V8', powerKw: 232, doors: 4, seats: 8 },
          { name: 'GX.R Diesel', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 4461, engineLabel: '4.5L Diesel V8', powerKw: 195, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  {
    brandSlug: 'toyota', slug: 'hilux',
    nameEn: 'Hilux', nameAr: 'هايلوكس', nameKu: 'هایلوکس', nameZh: '海拉克斯',
    generations: [
      {
        name: 'AN120/130', yearFrom: 2016,
        trims: [
          { name: 'SR5 4x4', bodyType: 'PICKUP_TRUCK', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 2755, engineLabel: '2.8L Diesel', powerKw: 150, doors: 4, seats: 5 },
          { name: 'SR 4x2', bodyType: 'PICKUP_TRUCK', fuelType: 'DIESEL', transmission: 'MANUAL', drivetrain: 'RWD', engineCC: 2393, engineLabel: '2.4L Diesel', powerKw: 110, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'toyota', slug: 'corolla',
    nameEn: 'Corolla', nameAr: 'كورولا', nameKu: 'کۆرۆلا', nameZh: '卡罗拉',
    generations: [
      {
        name: 'E210', yearFrom: 2019,
        trims: [
          { name: 'LE 2.0', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1987, engineLabel: '2.0L', powerKw: 127, doors: 4, seats: 5 },
          { name: 'XSE Hybrid', bodyType: 'SEDAN', fuelType: 'HYBRID', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1798, engineLabel: '1.8L Hybrid', powerKw: 90, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'toyota', slug: 'fortuner',
    nameEn: 'Fortuner', nameAr: 'فورتشنر', nameKu: 'فۆرچنەر', nameZh: '福途纳',
    generations: [
      {
        name: 'AN160', yearFrom: 2016,
        trims: [
          { name: 'SR5 2.8 4x4', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 2755, engineLabel: '2.8L Diesel', powerKw: 150, doors: 4, seats: 7 },
          { name: '2.7 4x2', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 2694, engineLabel: '2.7L', powerKw: 122, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'toyota', slug: 'prado',
    nameEn: 'Land Cruiser Prado', nameAr: 'برادو', nameKu: 'پرادۆ', nameZh: '普拉多',
    generations: [
      {
        name: 'J150', yearFrom: 2009, yearTo: 2024,
        trims: [
          { name: 'TXL 4.0 V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3956, engineLabel: '4.0L V6', powerKw: 202, doors: 4, seats: 7 },
          { name: 'VX Diesel', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 2755, engineLabel: '2.8L Diesel', powerKw: 150, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  // ── Honda ──
  {
    brandSlug: 'honda', slug: 'civic',
    nameEn: 'Civic', nameAr: 'سيفيك', nameKu: 'سیڤیک', nameZh: '思域',
    generations: [
      {
        name: 'FE', yearFrom: 2022,
        trims: [
          { name: 'Sport 1.5T', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1498, engineLabel: '1.5L Turbo', powerKw: 134, doors: 4, seats: 5 },
          { name: 'Touring 1.5T', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1498, engineLabel: '1.5L Turbo', powerKw: 134, doors: 4, seats: 5 },
        ],
      },
      {
        name: 'FC', yearFrom: 2016, yearTo: 2021,
        trims: [
          { name: 'EX 1.5T', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1498, engineLabel: '1.5L Turbo', powerKw: 127, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'honda', slug: 'crv',
    nameEn: 'CR-V', nameAr: 'سي ار في', nameKu: 'سی ئار وی', nameZh: '缤智/CR-V',
    generations: [
      {
        name: 'RW/RT', yearFrom: 2017,
        trims: [
          { name: 'EX-L 1.5T', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'AWD', engineCC: 1498, engineLabel: '1.5L Turbo', powerKw: 140, doors: 4, seats: 5 },
          { name: 'Hybrid Sport', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1993, engineLabel: '2.0L Hybrid', powerKw: 149, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Nissan ──
  {
    brandSlug: 'nissan', slug: 'patrol',
    nameEn: 'Patrol', nameAr: 'باترول', nameKu: 'پاترۆڵ', nameZh: '途乐',
    generations: [
      {
        name: 'Y62', yearFrom: 2010,
        trims: [
          { name: 'Platinum V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 5552, engineLabel: '5.6L V8', powerKw: 298, doors: 4, seats: 8 },
          { name: 'SE V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3998, engineLabel: '4.0L V6', powerKw: 202, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  {
    brandSlug: 'nissan', slug: 'altima',
    nameEn: 'Altima', nameAr: 'التيما', nameKu: 'ئاڵتیما', nameZh: '天籁',
    generations: [
      {
        name: 'L34', yearFrom: 2019,
        trims: [
          { name: 'S 2.5', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 2488, engineLabel: '2.5L', powerKw: 131, doors: 4, seats: 5 },
          { name: 'SL 2.0T', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'AWD', engineCC: 1998, engineLabel: '2.0L Turbo', powerKw: 179, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'nissan', slug: 'x-trail',
    nameEn: 'X-Trail', nameAr: 'اكس-تريل', nameKu: 'ئێکس تریل', nameZh: '奇骏',
    generations: [
      {
        name: 'T33', yearFrom: 2021,
        trims: [
          { name: 'ST 1.5T', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'AWD', engineCC: 1497, engineLabel: '1.5L Turbo', powerKw: 116, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── BMW ──
  {
    brandSlug: 'bmw', slug: '3-series',
    nameEn: '3 Series', nameAr: 'الفئة الثالثة', nameKu: 'ڕیزی ٣', nameZh: '3系',
    generations: [
      {
        name: 'G20', yearFrom: 2019,
        trims: [
          { name: '320i', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 1998, engineLabel: '2.0L', powerKw: 135, doors: 4, seats: 5 },
          { name: '330i xDrive', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1998, engineLabel: '2.0L Turbo', powerKw: 190, doors: 4, seats: 5 },
          { name: 'M340i', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2998, engineLabel: '3.0L Inline-6 Turbo', powerKw: 285, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'bmw', slug: '5-series',
    nameEn: '5 Series', nameAr: 'الفئة الخامسة', nameKu: 'ڕیزی ٥', nameZh: '5系',
    generations: [
      {
        name: 'G30', yearFrom: 2017, yearTo: 2023,
        trims: [
          { name: '520i', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 1998, engineLabel: '2.0L', powerKw: 135, doors: 4, seats: 5 },
          { name: '530i xDrive', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1998, engineLabel: '2.0L Turbo', powerKw: 185, doors: 4, seats: 5 },
          { name: '540i', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2998, engineLabel: '3.0L Turbo', powerKw: 250, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'bmw', slug: 'x5',
    nameEn: 'X5', nameAr: 'إكس 5', nameKu: 'ئێکس ٥', nameZh: 'X5',
    generations: [
      {
        name: 'G05', yearFrom: 2018,
        trims: [
          { name: 'xDrive40i', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2998, engineLabel: '3.0L Turbo', powerKw: 250, doors: 4, seats: 5 },
          { name: 'M50i', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 4395, engineLabel: '4.4L V8 Turbo', powerKw: 390, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  // ── Mercedes-Benz ──
  {
    brandSlug: 'mercedes-benz', slug: 'c-class',
    nameEn: 'C-Class', nameAr: 'الفئة C', nameKu: 'کلاسی C', nameZh: 'C级',
    generations: [
      {
        name: 'W206', yearFrom: 2021,
        trims: [
          { name: 'C200', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 1496, engineLabel: '1.5L Mild Hybrid', powerKw: 150, doors: 4, seats: 5 },
          { name: 'C300 4MATIC', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1999, engineLabel: '2.0L Turbo', powerKw: 190, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'mercedes-benz', slug: 'e-class',
    nameEn: 'E-Class', nameAr: 'الفئة E', nameKu: 'کلاسی E', nameZh: 'E级',
    generations: [
      {
        name: 'W213', yearFrom: 2016, yearTo: 2023,
        trims: [
          { name: 'E200', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 1991, engineLabel: '2.0L', powerKw: 135, doors: 4, seats: 5 },
          { name: 'E300', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 1991, engineLabel: '2.0L Turbo', powerKw: 180, doors: 4, seats: 5 },
          { name: 'E53 AMG', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2999, engineLabel: '3.0L Inline-6 EQ Boost', powerKw: 320, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'mercedes-benz', slug: 'gle',
    nameEn: 'GLE', nameAr: 'جي إل إي', nameKu: 'جی ئێل ئی', nameZh: 'GLE',
    generations: [
      {
        name: 'V167', yearFrom: 2019,
        trims: [
          { name: 'GLE 350', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1991, engineLabel: '2.0L Turbo', powerKw: 200, doors: 4, seats: 5 },
          { name: 'GLE 450', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2999, engineLabel: '3.0L Inline-6 EQ Boost', powerKw: 270, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  // ── Hyundai ──
  {
    brandSlug: 'hyundai', slug: 'tucson',
    nameEn: 'Tucson', nameAr: 'توسان', nameKu: 'تووسان', nameZh: '途胜',
    generations: [
      {
        name: 'NX4', yearFrom: 2021,
        trims: [
          { name: 'Smart 1.6T', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1591, engineLabel: '1.6L Turbo', powerKw: 132, doors: 4, seats: 5 },
          { name: 'Platinum PHEV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1591, engineLabel: '1.6L T-GDi PHEV', powerKw: 195, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'hyundai', slug: 'elantra',
    nameEn: 'Elantra', nameAr: 'إلنترا', nameKu: 'ئێلانترا', nameZh: '伊兰特',
    generations: [
      {
        name: 'CN7', yearFrom: 2021,
        trims: [
          { name: 'SE 2.0', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1999, engineLabel: '2.0L', powerKw: 111, doors: 4, seats: 5 },
          { name: 'N-Line 1.6T', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1598, engineLabel: '1.6L Turbo', powerKw: 150, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Kia ──
  {
    brandSlug: 'kia', slug: 'sportage',
    nameEn: 'Sportage', nameAr: 'سبورتاج', nameKu: 'سپۆرتاج', nameZh: '狮跑',
    generations: [
      {
        name: 'NQ5', yearFrom: 2022,
        trims: [
          { name: 'LX 2.5', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 2497, engineLabel: '2.5L', powerKw: 139, doors: 4, seats: 5 },
          { name: 'EX PHEV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1598, engineLabel: '1.6L T-GDi PHEV', powerKw: 177, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'kia', slug: 'sorento',
    nameEn: 'Sorento', nameAr: 'سورينتو', nameKu: 'سۆرێنتۆ', nameZh: '索兰托',
    generations: [
      {
        name: 'MQ4', yearFrom: 2021,
        trims: [
          { name: 'S 2.5T', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2497, engineLabel: '2.5L Turbo', powerKw: 213, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  // ── Mitsubishi ──
  {
    brandSlug: 'mitsubishi', slug: 'pajero',
    nameEn: 'Pajero', nameAr: 'باجيرو', nameKu: 'پاجێرۆ', nameZh: '帕杰罗',
    generations: [
      {
        name: 'V80', yearFrom: 2006, yearTo: 2021,
        trims: [
          { name: 'GLS 3.8 V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3828, engineLabel: '3.8L V6', powerKw: 176, doors: 4, seats: 7 },
          { name: 'GLS 3.2 DI-D', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3200, engineLabel: '3.2L Diesel', powerKw: 141, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'mitsubishi', slug: 'eclipse-cross',
    nameEn: 'Eclipse Cross', nameAr: 'إكليبس كروس', nameKu: 'ئێکلیپس کرۆس', nameZh: '奕歌',
    generations: [
      {
        name: 'GK', yearFrom: 2018,
        trims: [
          { name: 'ES 1.5T', bodyType: 'CROSSOVER', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'AWD', engineCC: 1498, engineLabel: '1.5L Turbo', powerKw: 110, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Jeep ──
  {
    brandSlug: 'jeep', slug: 'wrangler',
    nameEn: 'Wrangler', nameAr: 'رانجلر', nameKu: 'ڕانگڵەر', nameZh: '牧马人',
    generations: [
      {
        name: 'JL', yearFrom: 2018,
        trims: [
          { name: 'Sport 3.6 V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FOUR_WD', engineCC: 3604, engineLabel: '3.6L V6', powerKw: 209, doors: 4, seats: 5 },
          { name: 'Rubicon 2.0T', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 1995, engineLabel: '2.0L Turbo', powerKw: 200, doors: 4, seats: 5 },
          { name: '4xe PHEV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 1995, engineLabel: '2.0L T PHEV', powerKw: 280, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'jeep', slug: 'grand-cherokee',
    nameEn: 'Grand Cherokee', nameAr: 'غراند شيروكي', nameKu: 'گراند چیرۆکی', nameZh: '大切诺基',
    generations: [
      {
        name: 'WL', yearFrom: 2021,
        trims: [
          { name: 'Laredo 3.6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3604, engineLabel: '3.6L V6', powerKw: 209, doors: 4, seats: 5 },
          { name: 'Overland 5.7 HEMI', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 5654, engineLabel: '5.7L HEMI V8', powerKw: 261, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Lexus ──
  {
    brandSlug: 'lexus', slug: 'lx',
    nameEn: 'LX', nameAr: 'إل إكس', nameKu: 'ئێل ئێکس', nameZh: 'LX',
    generations: [
      {
        name: 'J300', yearFrom: 2022,
        trims: [
          { name: 'LX600 V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3444, engineLabel: '3.4L Twin-Turbo V6', powerKw: 305, doors: 4, seats: 7 },
        ],
      },
      {
        name: 'J200', yearFrom: 2008, yearTo: 2021,
        trims: [
          { name: 'LX570 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 5663, engineLabel: '5.7L V8', powerKw: 275, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  {
    brandSlug: 'lexus', slug: 'es',
    nameEn: 'ES', nameAr: 'إي إس', nameKu: 'ئی ئێس', nameZh: 'ES',
    generations: [
      {
        name: 'XV70', yearFrom: 2018,
        trims: [
          { name: 'ES300h Hybrid', bodyType: 'SEDAN', fuelType: 'HYBRID', transmission: 'CVT', drivetrain: 'FWD', engineCC: 2487, engineLabel: '2.5L Hybrid', powerKw: 160, doors: 4, seats: 5 },
          { name: 'ES350', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 3456, engineLabel: '3.5L V6', powerKw: 221, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Ford ──
  {
    brandSlug: 'ford', slug: 'f150',
    nameEn: 'F-150', nameAr: 'إف-150', nameKu: 'ئێف ١٥٠', nameZh: 'F-150',
    generations: [
      {
        name: 'P702', yearFrom: 2021,
        trims: [
          { name: 'XLT 2.7 EcoBoost', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 2694, engineLabel: '2.7L EcoBoost', powerKw: 250, doors: 4, seats: 5 },
          { name: 'Lariat 3.5 EcoBoost', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3496, engineLabel: '3.5L EcoBoost V6', powerKw: 298, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Chevrolet ──
  {
    brandSlug: 'chevrolet', slug: 'suburban',
    nameEn: 'Suburban', nameAr: 'سوبربان', nameKu: 'سوبەربان', nameZh: '郊区',
    generations: [
      {
        name: 'T1XX', yearFrom: 2021,
        trims: [
          { name: 'LS 5.3 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 5328, engineLabel: '5.3L V8', powerKw: 259, doors: 4, seats: 8 },
          { name: 'Premier 6.2 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 6162, engineLabel: '6.2L V8', powerKw: 313, doors: 4, seats: 9 },
        ],
      },
    ],
  },
  {
    brandSlug: 'chevrolet', slug: 'tahoe',
    nameEn: 'Tahoe', nameAr: 'تاهو', nameKu: 'تاهۆ', nameZh: '塔霍',
    generations: [
      {
        name: 'T1XX', yearFrom: 2021,
        trims: [
          { name: 'LS 5.3 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 5328, engineLabel: '5.3L V8', powerKw: 259, doors: 4, seats: 8 },
          { name: 'High Country 6.2 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 6162, engineLabel: '6.2L V8', powerKw: 313, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  // ── Cadillac ──
  {
    brandSlug: 'cadillac', slug: 'escalade',
    nameEn: 'Escalade', nameAr: 'إسكاليد', nameKu: 'ئێسکالاید', nameZh: '凯雷德',
    generations: [
      {
        name: 'GMT1XX', yearFrom: 2021,
        trims: [
          { name: 'Luxury 6.2 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 6162, engineLabel: '6.2L V8', powerKw: 313, doors: 4, seats: 8 },
          { name: 'Sport 3.0 Diesel', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 2996, engineLabel: '3.0L Diesel', powerKw: 230, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  // ── BYD ──
  {
    brandSlug: 'byd', slug: 'seal',
    nameEn: 'Seal', nameAr: 'سيل', nameKu: 'سیل', nameZh: '海豹',
    generations: [
      {
        name: 'BYD003', yearFrom: 2022,
        trims: [
          { name: 'Excellence AWD', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 390, doors: 4, seats: 5 },
          { name: 'Design RWD', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'RWD', powerKw: 230, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'byd', slug: 'atto-3',
    nameEn: 'Atto 3', nameAr: 'أتو 3', nameKu: 'ئاتۆ ٣', nameZh: '元PLUS',
    generations: [
      {
        name: 'BYD EV', yearFrom: 2022,
        trims: [
          { name: 'Extended Range', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'FWD', powerKw: 150, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Haval ──
  {
    brandSlug: 'haval', slug: 'h6',
    nameEn: 'H6', nameAr: 'إتش 6', nameKu: 'ئێچ ٦', nameZh: '哈弗H6',
    generations: [
      {
        name: 'Third Gen', yearFrom: 2021,
        trims: [
          { name: 'Lux 1.5T', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1497, engineLabel: '1.5L Turbo', powerKw: 110, doors: 4, seats: 5 },
          { name: 'Supreme PHEV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'DUAL_CLUTCH', drivetrain: 'AWD', engineCC: 1497, engineLabel: '1.5L T PHEV', powerKw: 179, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Land Rover ──
  {
    brandSlug: 'land-rover', slug: 'range-rover',
    nameEn: 'Range Rover', nameAr: 'رينج روفر', nameKu: 'ڕینج ڕۆڤەر', nameZh: '揽胜',
    generations: [
      {
        name: 'L460', yearFrom: 2022,
        trims: [
          { name: 'SE P400', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2996, engineLabel: '3.0L Inline-6 MHEV', powerKw: 294, doors: 4, seats: 5 },
          { name: 'Autobiography P530', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 4395, engineLabel: '4.4L V8', powerKw: 390, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Porsche ──
  {
    brandSlug: 'porsche', slug: 'cayenne',
    nameEn: 'Cayenne', nameAr: 'كايين', nameKu: 'کایێن', nameZh: '卡宴',
    generations: [
      {
        name: 'E3 Facelift', yearFrom: 2023,
        trims: [
          { name: 'Cayenne 3.0', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2995, engineLabel: '3.0L V6 Turbo', powerKw: 250, doors: 4, seats: 5 },
          { name: 'S 2.9 Biturbo', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2894, engineLabel: '2.9L V6 Biturbo', powerKw: 324, doors: 4, seats: 5 },
          { name: 'Turbo E-Hybrid', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3996, engineLabel: '4.0L V8 PHEV', powerKw: 544, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Geely ──
  {
    brandSlug: 'geely', slug: 'emgrand',
    nameEn: 'Emgrand', nameAr: 'إيمجراند', nameKu: 'ئێمگراند', nameZh: '帝豪',
    generations: [
      {
        name: 'Seventh Gen', yearFrom: 2022,
        trims: [
          { name: '1.5L CVT', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1499, engineLabel: '1.5L', powerKw: 82, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'geely', slug: 'coolray',
    nameEn: 'Coolray', nameAr: 'كولري', nameKu: 'کوولڕەی', nameZh: '缤越',
    generations: [
      {
        name: 'First Gen Facelift', yearFrom: 2023,
        trims: [
          { name: '1.5T DCT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1497, engineLabel: '1.5L Turbo', powerKw: 130, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── NIO ──
  {
    brandSlug: 'nio', slug: 'et5',
    nameEn: 'ET5', nameAr: 'إي تي 5', nameKu: 'ئی تی ٥', nameZh: 'ET5',
    generations: [
      {
        name: 'First Gen', yearFrom: 2022,
        trims: [
          { name: 'Standard Range', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 360, doors: 4, seats: 5 },
          { name: 'Long Range', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 360, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'nio', slug: 'es6',
    nameEn: 'ES6', nameAr: 'إي إس 6', nameKu: 'ئی ئێس ٦', nameZh: 'ES6',
    generations: [
      {
        name: 'Second Gen', yearFrom: 2023,
        trims: [
          { name: 'Standard', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 400, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Li Auto ──
  {
    brandSlug: 'li-auto', slug: 'l9',
    nameEn: 'L9', nameAr: 'إل 9', nameKu: 'ئێل ٩', nameZh: 'L9',
    generations: [
      {
        name: 'First Gen', yearFrom: 2022,
        trims: [
          { name: 'Pro EREV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1496, engineLabel: '1.5L EREV', powerKw: 330, doors: 4, seats: 6 },
        ],
      },
    ],
  },
  {
    brandSlug: 'li-auto', slug: 'l7',
    nameEn: 'L7', nameAr: 'إل 7', nameKu: 'ئێل ٧', nameZh: 'L7',
    generations: [
      {
        name: 'First Gen', yearFrom: 2023,
        trims: [
          { name: 'Pro EREV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1496, engineLabel: '1.5L EREV', powerKw: 330, doors: 4, seats: 5 },
          { name: 'Ultra EREV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1496, engineLabel: '1.5L EREV', powerKw: 330, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── XPENG ──
  {
    brandSlug: 'xpeng', slug: 'p7',
    nameEn: 'P7', nameAr: 'بي 7', nameKu: 'پی ٧', nameZh: 'P7',
    generations: [
      {
        name: 'P7i', yearFrom: 2023,
        trims: [
          { name: 'Standard AWD', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 316, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'xpeng', slug: 'g6',
    nameEn: 'G6', nameAr: 'جي 6', nameKu: 'گی ٦', nameZh: 'G6',
    generations: [
      {
        name: 'First Gen', yearFrom: 2023,
        trims: [
          { name: 'AWD Performance', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 350, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── Great Wall ──
  {
    brandSlug: 'great-wall', slug: 'poer',
    nameEn: 'POER', nameAr: 'بور', nameKu: 'پووئەر', nameZh: '炮',
    generations: [
      {
        name: 'King Kong', yearFrom: 2022,
        trims: [
          { name: '2.4T 4WD', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2378, engineLabel: '2.4L Turbo', powerKw: 160, doors: 4, seats: 5 },
          { name: '2.0T Diesel', bodyType: 'PICKUP_TRUCK', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1996, engineLabel: '2.0L TDI', powerKw: 120, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  // ── SAIC ──
  {
    brandSlug: 'saic', slug: 'mg5',
    nameEn: 'MG5', nameAr: 'إم جي 5', nameKu: 'ئێم جی ٥', nameZh: 'MG5',
    generations: [
      {
        name: 'EV', yearFrom: 2022,
        trims: [
          { name: 'Standard Range EV', bodyType: 'HATCHBACK', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'FWD', powerKw: 115, doors: 4, seats: 5 },
          { name: 'Long Range EV', bodyType: 'HATCHBACK', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'FWD', powerKw: 115, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── NEWLY ADDED BRANDS & MODELS ──────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Suzuki ──
  {
    brandSlug: 'suzuki', slug: 'jimny',
    nameEn: 'Jimny', nameAr: 'جيمني', nameKu: 'جیمنی', nameZh: '吉姆尼',
    generations: [
      {
        name: 'JB74', yearFrom: 2018,
        trims: [
          { name: 'GL 1.5 MT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FOUR_WD', engineCC: 1462, engineLabel: '1.5L', powerKw: 75, doors: 3, seats: 4 },
          { name: 'GLX 1.5 AT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 1462, engineLabel: '1.5L', powerKw: 75, doors: 3, seats: 4 },
        ],
      },
    ],
  },
  {
    brandSlug: 'suzuki', slug: 'vitara',
    nameEn: 'Vitara', nameAr: 'فيتارا', nameKu: 'ڤیتارا', nameZh: '维特拉',
    generations: [
      {
        name: 'LY Facelift', yearFrom: 2022,
        trims: [
          { name: 'GL+ 1.4T', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1373, engineLabel: '1.4L Turbo', powerKw: 95, doors: 4, seats: 5 },
          { name: 'GLX Hybrid', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1373, engineLabel: '1.4L T Hybrid', powerKw: 95, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'suzuki', slug: 'grand-vitara',
    nameEn: 'Grand Vitara', nameAr: 'غراند فيتارا', nameKu: 'گراند ڤیتارا', nameZh: '超级维特拉',
    generations: [
      {
        name: 'Third Gen', yearFrom: 2022,
        trims: [
          { name: 'GLX 1.5T Hybrid', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1462, engineLabel: '1.5L Hybrid', powerKw: 85, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Infiniti ──
  {
    brandSlug: 'infiniti', slug: 'qx80',
    nameEn: 'QX80', nameAr: 'كيو إكس 80', nameKu: 'کیو ئێکس ٨٠', nameZh: 'QX80',
    generations: [
      {
        name: 'Z62 Facelift', yearFrom: 2022,
        trims: [
          { name: 'Luxe 5.6 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 5552, engineLabel: '5.6L V8', powerKw: 298, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  {
    brandSlug: 'infiniti', slug: 'qx60',
    nameEn: 'QX60', nameAr: 'كيو إكس 60', nameKu: 'کیو ئێکس ٦٠', nameZh: 'QX60',
    generations: [
      {
        name: 'L50', yearFrom: 2022,
        trims: [
          { name: 'Pure 3.5 V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3498, engineLabel: '3.5L V6', powerKw: 212, doors: 4, seats: 7 },
          { name: 'Autograph 3.5 V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3498, engineLabel: '3.5L V6', powerKw: 212, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── Acura ──
  {
    brandSlug: 'acura', slug: 'mdx',
    nameEn: 'MDX', nameAr: 'إم دي إكس', nameKu: 'ئێم دی ئێکس', nameZh: 'MDX',
    generations: [
      {
        name: 'YD4', yearFrom: 2022,
        trims: [
          { name: 'Base 3.5 V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3471, engineLabel: '3.5L V6', powerKw: 220, doors: 4, seats: 7 },
          { name: 'Type S 3.0 Turbo', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2997, engineLabel: '3.0L Turbo V6', powerKw: 320, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── Daihatsu ──
  {
    brandSlug: 'daihatsu', slug: 'terios',
    nameEn: 'Terios', nameAr: 'تيريوس', nameKu: 'تێریۆس', nameZh: '泰利斯',
    generations: [
      {
        name: 'J200', yearFrom: 2017,
        trims: [
          { name: 'X 1.5 MT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FOUR_WD', engineCC: 1495, engineLabel: '1.5L', powerKw: 77, doors: 4, seats: 7 },
          { name: 'R 1.5 AT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1495, engineLabel: '1.5L', powerKw: 77, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── Opel ──
  {
    brandSlug: 'opel', slug: 'astra',
    nameEn: 'Astra', nameAr: 'أسترا', nameKu: 'ئاسترا', nameZh: '雅特',
    generations: [
      {
        name: 'L', yearFrom: 2022,
        trims: [
          { name: 'Edition 1.2T', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 1199, engineLabel: '1.2L Turbo', powerKw: 81, doors: 4, seats: 5 },
          { name: 'GS Hybrid', bodyType: 'HATCHBACK', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1598, engineLabel: '1.6L PHEV', powerKw: 132, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'opel', slug: 'mokka',
    nameEn: 'Mokka', nameAr: 'موكا', nameKu: 'مۆکا', nameZh: '莫卡',
    generations: [
      {
        name: 'B', yearFrom: 2021,
        trims: [
          { name: 'Edition 1.2T', bodyType: 'CROSSOVER', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1199, engineLabel: '1.2L Turbo', powerKw: 96, doors: 4, seats: 5 },
          { name: 'GS-e Electric', bodyType: 'CROSSOVER', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'FWD', powerKw: 115, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Dodge ──
  {
    brandSlug: 'dodge', slug: 'charger',
    nameEn: 'Charger', nameAr: 'تشارجر', nameKu: 'چارجەر', nameZh: '挑战者',
    generations: [
      {
        name: 'LD Facelift', yearFrom: 2021,
        trims: [
          { name: 'SXT 3.6 V6', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 3604, engineLabel: '3.6L V6', powerKw: 220, doors: 4, seats: 5 },
          { name: 'R/T 5.7 HEMI', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 5654, engineLabel: '5.7L HEMI V8', powerKw: 276, doors: 4, seats: 5 },
          { name: 'SRT Hellcat 6.2 Supercharged', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 6166, engineLabel: '6.2L Supercharged V8', powerKw: 527, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'dodge', slug: 'durango',
    nameEn: 'Durango', nameAr: 'دورانجو', nameKu: 'دووڕانگۆ', nameZh: '道奇途乐',
    generations: [
      {
        name: 'WD', yearFrom: 2021,
        trims: [
          { name: 'SXT 3.6 V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3604, engineLabel: '3.6L V6', powerKw: 220, doors: 4, seats: 7 },
          { name: 'R/T 5.7 HEMI', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 5654, engineLabel: '5.7L HEMI V8', powerKw: 261, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── GMC ──
  {
    brandSlug: 'gmc', slug: 'yukon',
    nameEn: 'Yukon', nameAr: 'يوكون', nameKu: 'یوکۆن', nameZh: 'GMC育空',
    generations: [
      {
        name: 'K2UC', yearFrom: 2021,
        trims: [
          { name: 'SLE 5.3 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 5328, engineLabel: '5.3L V8', powerKw: 259, doors: 4, seats: 8 },
          { name: 'Denali 6.2 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 6162, engineLabel: '6.2L V8', powerKw: 313, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  {
    brandSlug: 'gmc', slug: 'sierra',
    nameEn: 'Sierra', nameAr: 'سيرا', nameKu: 'سیێرا', nameZh: 'GMC塞拉',
    generations: [
      {
        name: 'T1', yearFrom: 2019,
        trims: [
          { name: 'SLE 5.3 V8', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 5328, engineLabel: '5.3L V8', powerKw: 259, doors: 4, seats: 5 },
          { name: 'Denali 6.2 V8', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 6162, engineLabel: '6.2L V8', powerKw: 313, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Lincoln ──
  {
    brandSlug: 'lincoln', slug: 'navigator',
    nameEn: 'Navigator', nameAr: 'نافيغيتور', nameKu: 'ناڤیگەتەر', nameZh: '领航员',
    generations: [
      {
        name: 'U228', yearFrom: 2022,
        trims: [
          { name: 'Standard 3.5 TT V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3496, engineLabel: '3.5L Twin-Turbo V6', powerKw: 336, doors: 4, seats: 8 },
          { name: 'Black Label 3.5 TT V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3496, engineLabel: '3.5L Twin-Turbo V6', powerKw: 336, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  {
    brandSlug: 'lincoln', slug: 'aviator',
    nameEn: 'Aviator', nameAr: 'أفياتور', nameKu: 'ئاڤیاتۆر', nameZh: '飞行家',
    generations: [
      {
        name: 'First Gen', yearFrom: 2020,
        trims: [
          { name: 'Standard 3.0 TT V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2995, engineLabel: '3.0L Twin-Turbo V6', powerKw: 298, doors: 4, seats: 7 },
          { name: 'Grand Touring PHEV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2995, engineLabel: '3.0L TT V6 PHEV', powerKw: 450, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── Tesla ──
  {
    brandSlug: 'tesla', slug: 'model-3',
    nameEn: 'Model 3', nameAr: 'موديل 3', nameKu: 'مۆدێل ٣', nameZh: '特斯拉Model 3',
    generations: [
      {
        name: 'Highland', yearFrom: 2023,
        trims: [
          { name: 'RWD Standard Range', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'RWD', powerKw: 208, doors: 4, seats: 5 },
          { name: 'Long Range AWD', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 358, doors: 4, seats: 5 },
          { name: 'Performance AWD', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 460, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'tesla', slug: 'model-y',
    nameEn: 'Model Y', nameAr: 'موديل واي', nameKu: 'مۆدێل وای', nameZh: '特斯拉Model Y',
    generations: [
      {
        name: 'Juniper', yearFrom: 2024,
        trims: [
          { name: 'RWD Standard Range', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'RWD', powerKw: 220, doors: 4, seats: 5 },
          { name: 'Long Range AWD', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 370, doors: 4, seats: 7 },
          { name: 'Performance AWD', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 456, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'tesla', slug: 'model-s',
    nameEn: 'Model S', nameAr: 'موديل إس', nameKu: 'مۆدێل ئێس', nameZh: '特斯拉Model S',
    generations: [
      {
        name: 'Plaid Era', yearFrom: 2021,
        trims: [
          { name: 'Long Range', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 493, doors: 4, seats: 5 },
          { name: 'Plaid', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 750, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'tesla', slug: 'model-x',
    nameEn: 'Model X', nameAr: 'موديل إكس', nameKu: 'مۆدێل ئێکس', nameZh: '特斯拉Model X',
    generations: [
      {
        name: 'Plaid Era', yearFrom: 2021,
        trims: [
          { name: 'Long Range', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 493, doors: 4, seats: 7 },
          { name: 'Plaid', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 750, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── RAM ──
  {
    brandSlug: 'ram', slug: '1500',
    nameEn: '1500', nameAr: 'رام 1500', nameKu: 'ڕام ١٥٠٠', nameZh: '公羊1500',
    generations: [
      {
        name: 'DT', yearFrom: 2019,
        trims: [
          { name: 'Tradesman 3.6 V6', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 3604, engineLabel: '3.6L V6', powerKw: 220, doors: 4, seats: 5 },
          { name: 'Laramie 5.7 HEMI', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 5654, engineLabel: '5.7L HEMI V8', powerKw: 291, doors: 4, seats: 5 },
          { name: 'TRX 6.2 Supercharged', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 6166, engineLabel: '6.2L Supercharged V8', powerKw: 527, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── SsangYong ──
  {
    brandSlug: 'ssangyong', slug: 'rexton',
    nameEn: 'Rexton', nameAr: 'ريكستون', nameKu: 'ڕێکستۆن', nameZh: '雷克斯顿',
    generations: [
      {
        name: 'Y400', yearFrom: 2022,
        trims: [
          { name: 'PE 2.2 Diesel AT', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2157, engineLabel: '2.2L Diesel', powerKw: 133, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'ssangyong', slug: 'musso',
    nameEn: 'Musso', nameAr: 'موسو', nameKu: 'موسۆ', nameZh: '野牛',
    generations: [
      {
        name: 'Q200', yearFrom: 2019,
        trims: [
          { name: 'Rebel 2.2 Diesel', bodyType: 'PICKUP_TRUCK', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2157, engineLabel: '2.2L Diesel', powerKw: 133, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Daewoo ──
  {
    brandSlug: 'daewoo', slug: 'lanos',
    nameEn: 'Lanos', nameAr: 'لانوس', nameKu: 'لانۆس', nameZh: '兰诺斯',
    generations: [
      {
        name: 'T100', yearFrom: 1997, yearTo: 2008,
        trims: [
          { name: 'S 1.5 MT', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 1498, engineLabel: '1.5L', powerKw: 58, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'daewoo', slug: 'matiz',
    nameEn: 'Matiz', nameAr: 'ماتيز', nameKu: 'ماتیز', nameZh: '马蒂兹',
    generations: [
      {
        name: 'M100', yearFrom: 1998, yearTo: 2015,
        trims: [
          { name: 'SE 0.8 MT', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 796, engineLabel: '0.8L', powerKw: 38, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Bentley ──
  {
    brandSlug: 'bentley', slug: 'bentayga',
    nameEn: 'Bentayga', nameAr: 'بنتايغا', nameKu: 'بێنتایگا', nameZh: '添越',
    generations: [
      {
        name: 'EWB', yearFrom: 2022,
        trims: [
          { name: 'V8 4.0 Twin-Turbo', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3996, engineLabel: '4.0L Twin-Turbo V8', powerKw: 404, doors: 4, seats: 5 },
          { name: 'W12 6.0 Twin-Turbo', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 5950, engineLabel: '6.0L Twin-Turbo W12', powerKw: 467, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'bentley', slug: 'continental-gt',
    nameEn: 'Continental GT', nameAr: 'كونتيننتال جي تي', nameKu: 'کۆنتینێنتاڵ جی تی', nameZh: '欧陆GT',
    generations: [
      {
        name: 'G3', yearFrom: 2018,
        trims: [
          { name: 'V8 4.0 Twin-Turbo', bodyType: 'COUPE', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3996, engineLabel: '4.0L Twin-Turbo V8', powerKw: 404, doors: 2, seats: 4 },
          { name: 'W12 6.0 Twin-Turbo', bodyType: 'COUPE', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 5950, engineLabel: '6.0L Twin-Turbo W12', powerKw: 467, doors: 2, seats: 4 },
        ],
      },
    ],
  },

  // ── Rolls-Royce ──
  {
    brandSlug: 'rolls-royce', slug: 'ghost',
    nameEn: 'Ghost', nameAr: 'غوست', nameKu: 'گۆست', nameZh: '幻影',
    generations: [
      {
        name: 'RR12 Series II', yearFrom: 2021,
        trims: [
          { name: 'Standard 6.75 V12', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 6749, engineLabel: '6.75L Twin-Turbo V12', powerKw: 420, doors: 4, seats: 5 },
          { name: 'Extended 6.75 V12', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 6749, engineLabel: '6.75L Twin-Turbo V12', powerKw: 420, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'rolls-royce', slug: 'cullinan',
    nameEn: 'Cullinan', nameAr: 'كولينان', nameKu: 'کولینان', nameZh: '库里南',
    generations: [
      {
        name: 'RR31 Series II', yearFrom: 2024,
        trims: [
          { name: 'Standard 6.75 V12', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 6749, engineLabel: '6.75L Twin-Turbo V12', powerKw: 420, doors: 4, seats: 5 },
          { name: 'Black Badge', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 6749, engineLabel: '6.75L Twin-Turbo V12', powerKw: 441, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── MINI ──
  {
    brandSlug: 'mini', slug: 'cooper',
    nameEn: 'Cooper', nameAr: 'كوبر', nameKu: 'کووپەر', nameZh: '迷你COOPER',
    generations: [
      {
        name: 'F56 Facelift', yearFrom: 2021,
        trims: [
          { name: 'One 1.5T', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 1499, engineLabel: '1.5L Turbo', powerKw: 75, doors: 3, seats: 4 },
          { name: 'S 2.0T', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1998, engineLabel: '2.0L Turbo', powerKw: 141, doors: 3, seats: 4 },
          { name: 'Electric SE', bodyType: 'HATCHBACK', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'FWD', powerKw: 135, doors: 3, seats: 4 },
        ],
      },
    ],
  },
  {
    brandSlug: 'mini', slug: 'countryman',
    nameEn: 'Countryman', nameAr: 'كانتريمان', nameKu: 'کانتریمان', nameZh: '迷你Countryman',
    generations: [
      {
        name: 'U25', yearFrom: 2024,
        trims: [
          { name: 'S 2.0T', bodyType: 'CROSSOVER', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1998, engineLabel: '2.0L Turbo', powerKw: 165, doors: 4, seats: 5 },
          { name: 'SE Electric', bodyType: 'CROSSOVER', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'FWD', powerKw: 150, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Aston Martin ──
  {
    brandSlug: 'aston-martin', slug: 'vantage',
    nameEn: 'Vantage', nameAr: 'فانتاج', nameKu: 'ڤانتیج', nameZh: '万台仕',
    generations: [
      {
        name: 'AM23', yearFrom: 2024,
        trims: [
          { name: '4.0 V8 Biturbo', bodyType: 'COUPE', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 3982, engineLabel: '4.0L V8 Biturbo', powerKw: 500, doors: 2, seats: 2 },
        ],
      },
    ],
  },
  {
    brandSlug: 'aston-martin', slug: 'dbx',
    nameEn: 'DBX', nameAr: 'دي بي إكس', nameKu: 'دی بی ئێکس', nameZh: 'DBX',
    generations: [
      {
        name: 'DBX707', yearFrom: 2022,
        trims: [
          { name: 'DBX707 4.0 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3982, engineLabel: '4.0L V8 Biturbo', powerKw: 520, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Ferrari ──
  {
    brandSlug: 'ferrari', slug: 'roma',
    nameEn: 'Roma', nameAr: 'روما', nameKu: 'ڕۆما', nameZh: '罗马',
    generations: [
      {
        name: 'F169', yearFrom: 2020,
        trims: [
          { name: 'Roma 3.9 V8', bodyType: 'COUPE', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'RWD', engineCC: 3855, engineLabel: '3.9L Twin-Turbo V8', powerKw: 456, doors: 2, seats: 4 },
        ],
      },
    ],
  },
  {
    brandSlug: 'ferrari', slug: 'purosangue',
    nameEn: 'Purosangue', nameAr: 'بوروسانغوي', nameKu: 'پوورۆسانگوی', nameZh: '普罗桑圭',
    generations: [
      {
        name: 'F175', yearFrom: 2023,
        trims: [
          { name: 'V12 6.5 NA', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'AWD', engineCC: 6496, engineLabel: '6.5L V12', powerKw: 533, doors: 4, seats: 4 },
        ],
      },
    ],
  },

  // ── Lamborghini ──
  {
    brandSlug: 'lamborghini', slug: 'urus',
    nameEn: 'Urus', nameAr: 'أوروس', nameKu: 'ئوروس', nameZh: '乌鲁斯',
    generations: [
      {
        name: 'Urus S / Performante', yearFrom: 2022,
        trims: [
          { name: 'Urus S 4.0 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3996, engineLabel: '4.0L Twin-Turbo V8', powerKw: 478, doors: 4, seats: 5 },
          { name: 'Performante 4.0 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3996, engineLabel: '4.0L Twin-Turbo V8', powerKw: 500, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'lamborghini', slug: 'huracan',
    nameEn: 'Huracán', nameAr: 'هوراكان', nameKu: 'هووراکان', nameZh: '飓风',
    generations: [
      {
        name: 'Sterrato Era', yearFrom: 2022,
        trims: [
          { name: 'EVO 5.2 V10', bodyType: 'COUPE', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'AWD', engineCC: 5204, engineLabel: '5.2L V10', powerKw: 470, doors: 2, seats: 2 },
          { name: 'Sterrato 5.2 V10', bodyType: 'COUPE', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'AWD', engineCC: 5204, engineLabel: '5.2L V10', powerKw: 449, doors: 2, seats: 2 },
        ],
      },
    ],
  },

  // ── Maserati ──
  {
    brandSlug: 'maserati', slug: 'levante',
    nameEn: 'Levante', nameAr: 'ليفانتي', nameKu: 'لێڤانتی', nameZh: '莱万特',
    generations: [
      {
        name: 'M161 Facelift', yearFrom: 2022,
        trims: [
          { name: 'GT 2.0 MHEV', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1998, engineLabel: '2.0L MHEV', powerKw: 243, doors: 4, seats: 5 },
          { name: 'Trofeo 3.8 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3799, engineLabel: '3.8L Twin-Turbo V8', powerKw: 529, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'maserati', slug: 'ghibli',
    nameEn: 'Ghibli', nameAr: 'غيبلي', nameKu: 'گیبلی', nameZh: '吉博力',
    generations: [
      {
        name: 'M157 Facelift', yearFrom: 2021,
        trims: [
          { name: 'GT 2.0 MHEV', bodyType: 'SEDAN', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'RWD', engineCC: 1998, engineLabel: '2.0L MHEV', powerKw: 243, doors: 4, seats: 5 },
          { name: 'Trofeo 3.8 V8', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3799, engineLabel: '3.8L Twin-Turbo V8', powerKw: 529, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Citroën ──
  {
    brandSlug: 'citroen', slug: 'c5-aircross',
    nameEn: 'C5 Aircross', nameAr: 'سي 5 إيركروس', nameKu: 'سی ٥ ئێرکرۆس', nameZh: 'C5 Aircross',
    generations: [
      {
        name: 'Facelift', yearFrom: 2022,
        trims: [
          { name: 'Feel Pack 1.2 PureTech', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1199, engineLabel: '1.2L PureTech Turbo', powerKw: 96, doors: 4, seats: 5 },
          { name: 'C-Series PHEV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1598, engineLabel: '1.6L PHEV', powerKw: 165, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'citroen', slug: 'berlingo',
    nameEn: 'Berlingo', nameAr: 'برلينجو', nameKu: 'بێرلینگۆ', nameZh: '贝林戈',
    generations: [
      {
        name: 'K9', yearFrom: 2018,
        trims: [
          { name: 'Feel 1.2 PureTech MT', bodyType: 'MINIVAN', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 1199, engineLabel: '1.2L PureTech', powerKw: 81, doors: 4, seats: 5 },
          { name: 'Shine 1.5 BlueHDi AT', bodyType: 'MINIVAN', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1499, engineLabel: '1.5L BlueHDi', powerKw: 96, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── Volvo ──
  {
    brandSlug: 'volvo', slug: 'xc90',
    nameEn: 'XC90', nameAr: 'إكس سي 90', nameKu: 'ئێکس سی ٩٠', nameZh: 'XC90',
    generations: [
      {
        name: 'SPA Facelift', yearFrom: 2023,
        trims: [
          { name: 'B5 Mild Hybrid AWD', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1969, engineLabel: '2.0L B5 MHEV', powerKw: 183, doors: 4, seats: 7 },
          { name: 'T8 Recharge PHEV AWD', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1969, engineLabel: '2.0L T8 PHEV', powerKw: 335, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'volvo', slug: 'xc60',
    nameEn: 'XC60', nameAr: 'إكس سي 60', nameKu: 'ئێکس سی ٦٠', nameZh: 'XC60',
    generations: [
      {
        name: 'SPA Facelift', yearFrom: 2022,
        trims: [
          { name: 'B5 Mild Hybrid FWD', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1969, engineLabel: '2.0L B5 MHEV', powerKw: 183, doors: 4, seats: 5 },
          { name: 'T8 Recharge PHEV AWD', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1969, engineLabel: '2.0L T8 PHEV', powerKw: 340, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'volvo', slug: 'ex90',
    nameEn: 'EX90', nameAr: 'إي إكس 90', nameKu: 'ئی ئێکس ٩٠', nameZh: 'EX90',
    generations: [
      {
        name: 'First Gen', yearFrom: 2024,
        trims: [
          { name: 'Twin Motor Performance', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 380, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── BAIC ──
  {
    brandSlug: 'baic', slug: 'bj40',
    nameEn: 'BJ40', nameAr: 'بي جاي 40', nameKu: 'بی جی ٤٠', nameZh: 'BJ40',
    generations: [
      {
        name: 'Plus', yearFrom: 2021,
        trims: [
          { name: '2.0T 4WD MT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FOUR_WD', engineCC: 1997, engineLabel: '2.0L Turbo', powerKw: 150, doors: 4, seats: 5 },
          { name: '2.0T 4WD AT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 1997, engineLabel: '2.0L Turbo', powerKw: 150, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'baic', slug: 'x55',
    nameEn: 'X55', nameAr: 'إكس 55', nameKu: 'ئێکس ٥٥', nameZh: 'X55',
    generations: [
      {
        name: 'Second Gen', yearFrom: 2021,
        trims: [
          { name: '1.5T DCT FWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1497, engineLabel: '1.5L Turbo', powerKw: 112, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── GAC ──
  {
    brandSlug: 'gac', slug: 'gs8',
    nameEn: 'GS8', nameAr: 'جي إس 8', nameKu: 'جی ئێس ٨', nameZh: 'GS8',
    generations: [
      {
        name: 'Second Gen', yearFrom: 2021,
        trims: [
          { name: '2.0T 4WD AT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1997, engineLabel: '2.0L Turbo', powerKw: 175, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'gac', slug: 'aion-y',
    nameEn: 'Aion Y', nameAr: 'آيون واي', nameKu: 'ئایۆن وای', nameZh: '埃安Y',
    generations: [
      {
        name: 'Plus', yearFrom: 2022,
        trims: [
          { name: 'Plus 70 FWD', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'FWD', powerKw: 135, doors: 4, seats: 5 },
          { name: 'Plus 70 AWD', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 200, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── MG ──
  {
    brandSlug: 'mg', slug: 'hs',
    nameEn: 'HS', nameAr: 'إتش إس', nameKu: 'ئێچ ئێس', nameZh: 'MG HS',
    generations: [
      {
        name: 'Facelift', yearFrom: 2022,
        trims: [
          { name: 'Core 1.5T DCT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1490, engineLabel: '1.5L Turbo', powerKw: 124, doors: 4, seats: 5 },
          { name: 'PHEV 1.5T', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1490, engineLabel: '1.5L T PHEV', powerKw: 160, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'mg', slug: 'zs',
    nameEn: 'ZS', nameAr: 'زد إس', nameKu: 'زێد ئێس', nameZh: 'MG ZS',
    generations: [
      {
        name: 'Facelift', yearFrom: 2022,
        trims: [
          { name: 'Core 1.5L MT', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 1490, engineLabel: '1.5L', powerKw: 77, doors: 4, seats: 5 },
          { name: 'EV Electric', bodyType: 'SUV', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'FWD', powerKw: 130, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'mg', slug: 'rx5',
    nameEn: 'RX5', nameAr: 'آر إكس 5', nameKu: 'ئار ئێکس ٥', nameZh: 'MG RX5',
    generations: [
      {
        name: 'Second Gen', yearFrom: 2022,
        trims: [
          { name: 'Comfort 2.0T AT AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1998, engineLabel: '2.0L Turbo', powerKw: 165, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── Additional popular Toyota models (Iraq/Kurdistan market) ─────────────
  {
    brandSlug: 'toyota', slug: 'rav4',
    nameEn: 'RAV4', nameAr: 'راف 4', nameKu: 'ڕاڤ ٤', nameZh: '荣放',
    generations: [
      {
        name: 'XA50', yearFrom: 2019,
        trims: [
          { name: 'LE 2.5 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2487, engineLabel: '2.5L', powerKw: 152, doors: 4, seats: 5 },
          { name: 'Adventure 2.5 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2487, engineLabel: '2.5L', powerKw: 152, doors: 4, seats: 5 },
          { name: 'Hybrid 2.5 AWD', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'CVT', drivetrain: 'AWD', engineCC: 2487, engineLabel: '2.5L Hybrid', powerKw: 163, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'toyota', slug: 'rush',
    nameEn: 'Rush', nameAr: 'راش', nameKu: 'ڕاش', nameZh: '拉什',
    generations: [
      {
        name: 'F800', yearFrom: 2018,
        trims: [
          { name: 'G 1.5 AT 4WD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 1496, engineLabel: '1.5L', powerKw: 80, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'toyota', slug: 'yaris',
    nameEn: 'Yaris', nameAr: 'يارس', nameKu: 'یاریس', nameZh: '雅力士',
    generations: [
      {
        name: 'XP210', yearFrom: 2020,
        trims: [
          { name: 'E 1.5 CVT', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1490, engineLabel: '1.5L', powerKw: 89, doors: 4, seats: 5 },
          { name: 'GR Sport 1.5 Hybrid', bodyType: 'HATCHBACK', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1490, engineLabel: '1.5L Hybrid', powerKw: 85, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Additional popular Nissan models ─────────────────────────────────────
  {
    brandSlug: 'nissan', slug: 'navara',
    nameEn: 'Navara', nameAr: 'نافارا', nameKu: 'ناڤارا', nameZh: '纳瓦拉',
    generations: [
      {
        name: 'D23 Facelift', yearFrom: 2021,
        trims: [
          { name: 'SE 2.5 Petrol 4WD', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 2488, engineLabel: '2.5L', powerKw: 114, doors: 4, seats: 5 },
          { name: 'LE 2.3 Diesel 4WD', bodyType: 'PICKUP_TRUCK', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 2298, engineLabel: '2.3L TDI', powerKw: 140, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'nissan', slug: 'sunny',
    nameEn: 'Sunny', nameAr: 'صني', nameKu: 'سانی', nameZh: '阳光',
    generations: [
      {
        name: 'B17 Facelift', yearFrom: 2020,
        trims: [
          { name: 'E 1.5 MT', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 1497, engineLabel: '1.5L', powerKw: 78, doors: 4, seats: 5 },
          { name: 'SV 1.5 AT', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1497, engineLabel: '1.5L', powerKw: 78, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Additional Honda models ────────────────────────────────────────────────
  {
    brandSlug: 'honda', slug: 'pilot',
    nameEn: 'Pilot', nameAr: 'بايلوت', nameKu: 'پایلۆت', nameZh: '飞行员',
    generations: [
      {
        name: 'YF6', yearFrom: 2023,
        trims: [
          { name: 'Sport 3.5 V6 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3471, engineLabel: '3.5L V6', powerKw: 220, doors: 4, seats: 8 },
          { name: 'TrailSport 3.5 V6 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3471, engineLabel: '3.5L V6', powerKw: 220, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  {
    brandSlug: 'honda', slug: 'accord',
    nameEn: 'Accord', nameAr: 'أكورد', nameKu: 'ئاکۆرد', nameZh: '雅阁',
    generations: [
      {
        name: 'Eleventh Gen', yearFrom: 2023,
        trims: [
          { name: 'Sport 1.5T CVT', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1498, engineLabel: '1.5L Turbo', powerKw: 147, doors: 4, seats: 5 },
          { name: 'Hybrid 2.0 eHEV', bodyType: 'SEDAN', fuelType: 'HYBRID', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1993, engineLabel: '2.0L e:HEV', powerKw: 147, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Additional Hyundai models ─────────────────────────────────────────────
  {
    brandSlug: 'hyundai', slug: 'palisade',
    nameEn: 'Palisade', nameAr: 'باليسيد', nameKu: 'پالیسێید', nameZh: '帕里斯帝',
    generations: [
      {
        name: 'LX2 Facelift', yearFrom: 2023,
        trims: [
          { name: 'SE 3.8 V6 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3778, engineLabel: '3.8L V6', powerKw: 213, doors: 4, seats: 8 },
          { name: 'Calligraphy 3.8 V6 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3778, engineLabel: '3.8L V6', powerKw: 213, doors: 4, seats: 8 },
        ],
      },
    ],
  },
  {
    brandSlug: 'hyundai', slug: 'accent',
    nameEn: 'Accent', nameAr: 'أكسنت', nameKu: 'ئاکسێنت', nameZh: '悦纳',
    generations: [
      {
        name: 'HC Facelift', yearFrom: 2020,
        trims: [
          { name: 'GL 1.4 MT', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 1368, engineLabel: '1.4L', powerKw: 73, doors: 4, seats: 5 },
          { name: 'GLS 1.4 AT', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1368, engineLabel: '1.4L', powerKw: 73, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Additional Kia models ─────────────────────────────────────────────────
  {
    brandSlug: 'kia', slug: 'carnival',
    nameEn: 'Carnival', nameAr: 'كارنيفال', nameKu: 'کارنیڤاڵ', nameZh: '嘉华',
    generations: [
      {
        name: 'KA4', yearFrom: 2021,
        trims: [
          { name: 'LX 3.5 V6', bodyType: 'MINIVAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 3470, engineLabel: '3.5L V6', powerKw: 213, doors: 4, seats: 8 },
          { name: 'SX 3.5 V6 Prestige', bodyType: 'MINIVAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 3470, engineLabel: '3.5L V6', powerKw: 213, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'kia', slug: 'telluride',
    nameEn: 'Telluride', nameAr: 'تيلورايد', nameKu: 'تێلوڕاید', nameZh: '泰勒瑞德',
    generations: [
      {
        name: 'ON Facelift', yearFrom: 2023,
        trims: [
          { name: 'LX 3.8 V6 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3778, engineLabel: '3.8L V6', powerKw: 213, doors: 4, seats: 8 },
          { name: 'SX X-Pro 3.8 V6 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3778, engineLabel: '3.8L V6', powerKw: 213, doors: 4, seats: 8 },
        ],
      },
    ],
  },

  // ── Additional VW models ──────────────────────────────────────────────────
  {
    brandSlug: 'volkswagen', slug: 'tiguan',
    nameEn: 'Tiguan', nameAr: 'تيغوان', nameKu: 'تیگووان', nameZh: '途观',
    generations: [
      {
        name: 'AD1 Facelift', yearFrom: 2022,
        trims: [
          { name: 'Life 1.5 TSI EVO', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1498, engineLabel: '1.5L TSI', powerKw: 110, doors: 4, seats: 5 },
          { name: 'R-Line 2.0 TSI 4MOTION', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'AWD', engineCC: 1984, engineLabel: '2.0L TSI', powerKw: 140, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'volkswagen', slug: 'passat',
    nameEn: 'Passat', nameAr: 'باسات', nameKu: 'پاسات', nameZh: '帕萨特',
    generations: [
      {
        name: 'B9', yearFrom: 2024,
        trims: [
          { name: 'Business 2.0 TDI', bodyType: 'SEDAN', fuelType: 'DIESEL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1968, engineLabel: '2.0L TDI', powerKw: 110, doors: 4, seats: 5 },
          { name: 'eHybrid 1.5 TSI PHEV', bodyType: 'SEDAN', fuelType: 'PLUG_IN_HYBRID', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1498, engineLabel: '1.5L TSI PHEV', powerKw: 150, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Additional Audi models ─────────────────────────────────────────────────
  {
    brandSlug: 'audi', slug: 'q7',
    nameEn: 'Q7', nameAr: 'كيو 7', nameKu: 'کیو ٧', nameZh: 'Q7',
    generations: [
      {
        name: '4M Facelift', yearFrom: 2020,
        trims: [
          { name: '45 TFSI quattro', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1984, engineLabel: '2.0L TFSI', powerKw: 180, doors: 4, seats: 7 },
          { name: '55 TFSI quattro', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2995, engineLabel: '3.0L TFSI V6', powerKw: 250, doors: 4, seats: 7 },
          { name: '60 TFSI e quattro PHEV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2995, engineLabel: '3.0L TFSI PHEV', powerKw: 335, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'audi', slug: 'a6',
    nameEn: 'A6', nameAr: 'إيه 6', nameKu: 'ئی ٦', nameZh: 'A6',
    generations: [
      {
        name: 'C8 Facelift', yearFrom: 2023,
        trims: [
          { name: '40 TFSI', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1984, engineLabel: '2.0L TFSI', powerKw: 150, doors: 4, seats: 5 },
          { name: '55 TFSI quattro', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2995, engineLabel: '3.0L TFSI V6', powerKw: 250, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Renault additional models ────────────────────────────────────────────
  {
    brandSlug: 'renault', slug: 'duster',
    nameEn: 'Duster', nameAr: 'داستر', nameKu: 'داستەر', nameZh: '达世',
    generations: [
      {
        name: 'Third Gen', yearFrom: 2024,
        trims: [
          { name: 'Evolution 1.0 TCe', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'MANUAL', drivetrain: 'FWD', engineCC: 999, engineLabel: '1.0L Turbo', powerKw: 90, doors: 4, seats: 5 },
          { name: 'Techno 1.5 BlueDCi 4WD', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'MANUAL', drivetrain: 'FOUR_WD', engineCC: 1461, engineLabel: '1.5L Diesel', powerKw: 90, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'renault', slug: 'koleos',
    nameEn: 'Koleos', nameAr: 'كوليوس', nameKu: 'کۆلیۆس', nameZh: '科雷傲',
    generations: [
      {
        name: 'HZG Facelift', yearFrom: 2020,
        trims: [
          { name: 'Zen 2.5 CVT FWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 2488, engineLabel: '2.5L', powerKw: 126, doors: 4, seats: 5 },
          { name: 'Intens 2.5 CVT AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'AWD', engineCC: 2488, engineLabel: '2.5L', powerKw: 126, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Peugeot additional models ────────────────────────────────────────────
  {
    brandSlug: 'peugeot', slug: '3008',
    nameEn: '3008', nameAr: '3008', nameKu: '٣٠٠٨', nameZh: '3008',
    generations: [
      {
        name: 'II Facelift', yearFrom: 2021,
        trims: [
          { name: 'Active Pack 1.2 PureTech', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FWD', engineCC: 1199, engineLabel: '1.2L PureTech Turbo', powerKw: 96, doors: 4, seats: 5 },
          { name: 'GT 1.6 PHEV', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 1598, engineLabel: '1.6L PHEV', powerKw: 165, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── BMW additional models ─────────────────────────────────────────────────
  {
    brandSlug: 'bmw', slug: 'x7',
    nameEn: 'X7', nameAr: 'إكس 7', nameKu: 'ئێکس ٧', nameZh: 'X7',
    generations: [
      {
        name: 'G07 LCI', yearFrom: 2023,
        trims: [
          { name: 'xDrive40i 3.0 B58', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2998, engineLabel: '3.0L Inline-6 Turbo', powerKw: 250, doors: 4, seats: 7 },
          { name: 'xDrive60i 4.4 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 4395, engineLabel: '4.4L Twin-Turbo V8', powerKw: 390, doors: 4, seats: 7 },
        ],
      },
    ],
  },
  {
    brandSlug: 'bmw', slug: '7-series',
    nameEn: '7 Series', nameAr: 'الفئة 7', nameKu: 'سیریز ٧', nameZh: '7系',
    generations: [
      {
        name: 'G70', yearFrom: 2023,
        trims: [
          { name: '740i 3.0 Inline-6', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2998, engineLabel: '3.0L Inline-6 Turbo', powerKw: 250, doors: 4, seats: 5 },
          { name: '760i 4.4 V8', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 4395, engineLabel: '4.4L Twin-Turbo V8', powerKw: 390, doors: 4, seats: 5 },
          { name: 'i7 xDrive60 Electric', bodyType: 'SEDAN', fuelType: 'ELECTRIC', transmission: 'AUTOMATIC', drivetrain: 'AWD', powerKw: 400, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Mercedes-Benz additional models ─────────────────────────────────────
  {
    brandSlug: 'mercedes-benz', slug: 'gls',
    nameEn: 'GLS', nameAr: 'جي إل إس', nameKu: 'جی ئێل ئێس', nameZh: 'GLS',
    generations: [
      {
        name: 'X167 Facelift', yearFrom: 2024,
        trims: [
          { name: 'GLS450 3.0 I6 MHEV', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2999, engineLabel: '3.0L Inline-6 MHEV', powerKw: 270, doors: 4, seats: 7 },
          { name: 'GLS600 Maybach 4.0 V8', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3982, engineLabel: '4.0L V8 Biturbo', powerKw: 450, doors: 4, seats: 4 },
        ],
      },
    ],
  },
  {
    brandSlug: 'mercedes-benz', slug: 'a-class',
    nameEn: 'A-Class', nameAr: 'الفئة إيه', nameKu: 'کلاسی ئی', nameZh: 'A级',
    generations: [
      {
        name: 'W177 Facelift', yearFrom: 2022,
        trims: [
          { name: 'A180 1.3 Turbo', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1332, engineLabel: '1.3L Turbo', powerKw: 100, doors: 4, seats: 5 },
          { name: 'A250 2.0 Turbo AMG Line', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'FWD', engineCC: 1991, engineLabel: '2.0L Turbo', powerKw: 165, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Chery additional models ──────────────────────────────────────────────
  {
    brandSlug: 'chery', slug: 'tiggo-7-pro',
    nameEn: 'Tiggo 7 Pro', nameAr: 'تيغو 7 برو', nameKu: 'تیگۆ ٧ پرۆ', nameZh: '瑞虎7 Pro',
    generations: [
      {
        name: 'Second Gen', yearFrom: 2021,
        trims: [
          { name: 'Luxury 1.5T CVT FWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'FWD', engineCC: 1497, engineLabel: '1.5L Turbo', powerKw: 108, doors: 4, seats: 5 },
          { name: 'Premium 2.0T DCT AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'AWD', engineCC: 1997, engineLabel: '2.0L Turbo', powerKw: 145, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'chery', slug: 'tiggo-8-pro',
    nameEn: 'Tiggo 8 Pro', nameAr: 'تيغو 8 برو', nameKu: 'تیگۆ ٨ پرۆ', nameZh: '瑞虎8 Pro',
    generations: [
      {
        name: 'First Gen', yearFrom: 2021,
        trims: [
          { name: 'Premium 1.6T DCT AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'AWD', engineCC: 1598, engineLabel: '1.6L Turbo', powerKw: 145, doors: 4, seats: 7 },
          { name: 'Max 2.0T DCT AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'DUAL_CLUTCH', drivetrain: 'AWD', engineCC: 1997, engineLabel: '2.0L Turbo', powerKw: 175, doors: 4, seats: 7 },
        ],
      },
    ],
  },

  // ── Ford additional models ───────────────────────────────────────────────
  {
    brandSlug: 'ford', slug: 'explorer',
    nameEn: 'Explorer', nameAr: 'إكسبلورر', nameKu: 'ئێکسپلۆرەر', nameZh: '探险者',
    generations: [
      {
        name: 'P702', yearFrom: 2020,
        trims: [
          { name: 'XLT 2.3 EcoBoost AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2261, engineLabel: '2.3L EcoBoost', powerKw: 224, doors: 4, seats: 7 },
          { name: 'ST 3.0 EcoBoost V6', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2956, engineLabel: '3.0L EcoBoost V6', powerKw: 298, doors: 4, seats: 6 },
        ],
      },
    ],
  },
  {
    brandSlug: 'ford', slug: 'ranger',
    nameEn: 'Ranger', nameAr: 'رينجر', nameKu: 'ڕینجەر', nameZh: '游骑兵',
    generations: [
      {
        name: 'P703', yearFrom: 2022,
        trims: [
          { name: 'XLT 2.0 TDCi 4WD', bodyType: 'PICKUP_TRUCK', fuelType: 'DIESEL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 1996, engineLabel: '2.0L Bi-Turbo Diesel', powerKw: 154, doors: 4, seats: 5 },
          { name: 'Raptor 3.0 V6 EcoBoost', bodyType: 'PICKUP_TRUCK', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'FOUR_WD', engineCC: 2956, engineLabel: '3.0L EcoBoost V6', powerKw: 292, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Subaru additional models ─────────────────────────────────────────────
  {
    brandSlug: 'subaru', slug: 'outback',
    nameEn: 'Outback', nameAr: 'أوتباك', nameKu: 'ئاوتباک', nameZh: '傲虎',
    generations: [
      {
        name: 'BT', yearFrom: 2020,
        trims: [
          { name: '2.5i CVT AWD', bodyType: 'CROSSOVER', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'AWD', engineCC: 2498, engineLabel: '2.5L Boxer', powerKw: 138, doors: 4, seats: 5 },
          { name: 'XT 2.4T CVT AWD', bodyType: 'CROSSOVER', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'AWD', engineCC: 2387, engineLabel: '2.4L Turbo Boxer', powerKw: 180, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'subaru', slug: 'forester',
    nameEn: 'Forester', nameAr: 'فورستر', nameKu: 'فۆرێستەر', nameZh: '森林人',
    generations: [
      {
        name: 'SK Facelift', yearFrom: 2022,
        trims: [
          { name: 'Base 2.5i CVT AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'CVT', drivetrain: 'AWD', engineCC: 2498, engineLabel: '2.5L Boxer', powerKw: 136, doors: 4, seats: 5 },
          { name: 'e-Boxer 2.0 Hybrid', bodyType: 'SUV', fuelType: 'HYBRID', transmission: 'CVT', drivetrain: 'AWD', engineCC: 1995, engineLabel: '2.0L e-Boxer Hybrid', powerKw: 110, doors: 4, seats: 5 },
        ],
      },
    ],
  },

  // ── Mazda additional models ──────────────────────────────────────────────
  {
    brandSlug: 'mazda', slug: 'cx-5',
    nameEn: 'CX-5', nameAr: 'سي إكس 5', nameKu: 'سی ئێکس ٥', nameZh: 'CX-5',
    generations: [
      {
        name: 'KF Facelift', yearFrom: 2022,
        trims: [
          { name: 'Touring 2.5 AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2488, engineLabel: '2.5L SkyActiv-G', powerKw: 141, doors: 4, seats: 5 },
          { name: 'Carbon Edition 2.5T AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 2488, engineLabel: '2.5L Turbo SkyActiv', powerKw: 227, doors: 4, seats: 5 },
        ],
      },
    ],
  },
  {
    brandSlug: 'mazda', slug: 'cx-90',
    nameEn: 'CX-90', nameAr: 'سي إكس 90', nameKu: 'سی ئێکس ٩٠', nameZh: 'CX-90',
    generations: [
      {
        name: 'First Gen', yearFrom: 2023,
        trims: [
          { name: 'PHEV 3.3T AWD', bodyType: 'SUV', fuelType: 'PLUG_IN_HYBRID', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3279, engineLabel: '3.3L Turbo PHEV', powerKw: 241, doors: 4, seats: 8 },
          { name: 'S Premium 3.3T AWD', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC', drivetrain: 'AWD', engineCC: 3279, engineLabel: '3.3L Turbo', powerKw: 210, doors: 4, seats: 8 },
        ],
      },
    ],
  },
];
