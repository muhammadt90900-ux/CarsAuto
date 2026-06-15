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
];
