// src/data/heroSearchData.ts
// Static reference data for HeroSearch.tsx, extracted so it isn't re-declared
// inside the 'use client' component module on every render/bundle.

import { Car, Wrench, Bike } from 'lucide-react';

export const MAKES = [
  'تۆیۆتا / Toyota','کیا / KIA','هیوندای / Hyundai',
  'BMW','Mercedes-Benz','Lexus','Honda','Nissan',
  'Mitsubishi','Ford','BYD','Geely','Chery','Haval',
];

export const MODELS: Record<string, string[]> = {
  'تۆیۆتا / Toyota': ['Camry','Corolla','Land Cruiser','Prado','Hilux','RAV4','Fortuner','Yaris'],
  'کیا / KIA':        ['Sportage','Sorento','Cerato','Optima','Carnival','Telluride'],
  'هیوندای / Hyundai':['Tucson','Santa Fe','Elantra','Sonata','Creta','Palisade'],
  'BMW':              ['3 Series','5 Series','7 Series','X3','X5','X7','M3','M5'],
  'Mercedes-Benz':    ['C-Class','E-Class','S-Class','GLE','GLS','G-Class','AMG GT'],
  'Lexus':            ['LX570','GX460','RX350','ES350','LS500','IS350'],
  'Honda':            ['Civic','Accord','CR-V','Pilot','HR-V','Odyssey'],
  'Nissan':           ['Patrol','Altima','Pathfinder','Sentra','Murano','Armada'],
  'Ford':             ['F-150','Explorer','Edge','Mustang','Bronco','Expedition'],
  'BYD':              ['Atto 3','Han','Tang','Seal','Dolphin','Song Plus'],
};

export const YEARS  = Array.from({ length: 26 }, (_, i) => String(2025 - i));

export const CITIES = [
  'سلێمانی / Sulaymaniyah','هەولێر / Erbil','دهۆک / Duhok',
  'کەرکوک / Kirkuk','بەغدا / Baghdad','بەسرە / Basra',
  'دبی / Dubai','شارجە / Sharjah',
];

export const COUNTRIES      = ['Kurdistan', 'Iraq', 'UAE', 'China'];
export const FUEL_TYPES     = ['Petrol','Diesel','Hybrid','Plug-in Hybrid','Electric','LPG','CNG'];
export const TRANSMISSIONS  = ['Automatic','Manual','Semi-Automatic','CVT','Dual-Clutch'];
export const CONDITIONS     = ['نوێ / New','بەکارهاتوو / Used','گووشتی / Salvage'];
export const COLORS         = ['White','Black','Silver','Grey','Red','Blue','Green','Gold','Brown','Orange'];

export const PRICE_RANGES   = [
  'زیر 5,000$','5,000 – 15,000$','15,000 – 30,000$',
  '30,000 – 60,000$','60,000 – 100,000$','زیاتر لە 100,000$',
];

export const CATEGORIES = [
  { id: 'cars',  label: 'ئۆتۆمبێل', labelEn: 'Cars',        icon: Car   },
  { id: 'parts', label: 'پارچەکان', labelEn: 'Parts',        icon: Wrench},
  { id: 'bikes', label: 'مۆتۆسیکل', labelEn: 'Motorcycles', icon: Bike  },
];

export const TRENDING_SEARCHES = [
  'Land Cruiser 2023','BMW 5 Series','Toyota Camry هەولێر',
  'Kia Sportage','Lexus LX570','BYD Electric',
];

export const QUICK_SEARCHES = [
  'Land Cruiser 2023','BMW 5 Series','Toyota Camry هەولێر','Kia Sportage',
];

export const POPULAR_VEHICLES = [
  { brand:'Toyota',   model:'Land Cruiser', year:2023, price:'$85,000', mileage:'12,000 km', city:'Erbil',         badge:'🔥 Hot'       },
  { brand:'BMW',      model:'5 Series',     year:2022, price:'$55,000', mileage:'28,000 km', city:'Sulaymaniyah',  badge:'⭐ Featured'  },
  { brand:'Lexus',    model:'LX570',        year:2021, price:'$92,000', mileage:'35,000 km', city:'Baghdad',       badge:'💎 Premium'   },
  { brand:'Toyota',   model:'Camry Hybrid', year:2023, price:'$28,000', mileage:'5,000 km',  city:'Dubai',         badge:'⚡ New'        },
  { brand:'Kia',      model:'Sportage',     year:2022, price:'$22,000', mileage:'18,000 km', city:'Erbil',         badge:'🏷️ Deal'       },
  { brand:'Mercedes', model:'GLE 450',      year:2022, price:'$78,000', mileage:'22,000 km', city:'Dubai',         badge:'⭐ Featured'  },
];

export const STATS = [
  { value:'24,000+', label:'ئۆتۆمبێل',     labelEn:'Listings' },
  { value:'1,200+',  label:'فرۆشەر',        labelEn:'Dealers'  },
  { value:'8',       label:'شار',            labelEn:'Cities'   },
  { value:'4.9★',    label:'هەڵسەنگاندن',  labelEn:'Rating'   },
];

export const SUGGESTIONS_MAP: Record<string, string[]> = {
  'to':     ['Toyota Land Cruiser','Toyota Camry','Toyota Prado'],
  'toy':    ['Toyota Land Cruiser','Toyota Camry','Toyota Fortuner','Toyota RAV4'],
  'toyota': ['Toyota Land Cruiser 2023','Toyota Camry Hybrid','Toyota Prado 2022'],
  'bm':     ['BMW 5 Series','BMW X5','BMW M3'],
  'bmw':    ['BMW 5 Series 2022','BMW X7','BMW M5'],
  'land':   ['Land Cruiser 2023','Land Rover Defender'],
  'cam':    ['Toyota Camry 2023','Toyota Camry Hybrid'],
  'kia':    ['Kia Sportage 2022','Kia Sorento','Kia Telluride'],
  'le':     ['Lexus LX570','Lexus GX460','Lexus RX350'],
  'lex':    ['Lexus LX570','Lexus GX460','Lexus ES350'],
  'mer':    ['Mercedes GLE','Mercedes C-Class','Mercedes S-Class'],
  'electric':['BYD Atto 3','BYD Seal','BYD Han EV'],
  'patrol': ['Nissan Patrol 2023','Nissan Patrol Platinum'],
  'sport':  ['Kia Sportage 2022','Hyundai Tucson Sport'],
};
