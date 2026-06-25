'use client';
// apps/web/src/components/features/sell/SellCarForm.tsx
// Multi-step "Sell" form supporting all 5 listing types:
//   CAR · MOTORCYCLE · SPARE_PART · ACCESSORY · SERVICE  (Feature 3)
//
// Step flow:
//   Step 1 — Basic Info  (title, price, type, condition/serviceType)
//   Step 2 — Details     (description + type-specific spec fields)
//   Step 3 — Photos      (image upload + submit)
//
// FIX: Moved all useState hooks above early returns to comply with Rules of Hooks.

import { useState, useRef, useCallback, ChangeEvent, useEffect } from 'react';
import { useRouter }       from '@/i18n/navigation';
import { useLocale }       from 'next-intl';
import { useQueryClient }  from '@tanstack/react-query';
import { queryKeys }       from '@/lib/queryKeys';
import { useAuthStore }    from '@/store/auth.store';
import { sellApi, type CreateListingPayload, type VehicleSpec, type SparePartSpec } from '@/lib/sell-api';
import { subscriptionApi, type PermissionStatus } from '@/lib/api';
import { ImageUploadGrid } from './ImageUploadGrid';
import { CAR_MAKES, getModelsByMake } from '@/data/carData';
import { SellFormField }   from './SellFormField';
import { SellProgress }    from './SellProgress';
import { UpgradePrompt }   from './UpgradePrompt';

// ── Type helpers ──────────────────────────────────────────────────────────────
type ListingTypeValue = 'CAR' | 'MOTORCYCLE' | 'SPARE_PART' | 'ACCESSORY' | 'SERVICE';

const VEHICLE_TYPES  = new Set<ListingTypeValue>(['CAR', 'MOTORCYCLE', 'SPARE_PART']);
const ACCESSORY_TYPES = new Set<ListingTypeValue>(['ACCESSORY', 'SERVICE']);

// ── Draft auto-save (Feature: Save Draft) ───────────────────────────────────
const DRAFT_KEY = 'carsauto_sell_draft';

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPES = [
  { value: 'CAR',        label: '🚗 Car',           labelKu: 'ئۆتۆمبێل' },
  { value: 'MOTORCYCLE', label: '🏍️ Motorcycle',    labelKu: 'مۆتۆسیکل' },
  { value: 'SPARE_PART', label: '🔧 Spare Part',    labelKu: 'یەدەک پارچە' },
  { value: 'ACCESSORY',  label: '🎁 Accessory',     labelKu: 'ئەکسسوار' },
  { value: 'SERVICE',    label: '⚙️ Service',        labelKu: 'خزمەتگوزاری' },
] as const;

const CONDITIONS = [
  { value: 'NEW',     label: 'New / نوێ' },
  { value: 'USED',    label: 'Used / بەکارهاتوو' },
  { value: 'SALVAGE', label: 'Salvage / خراپ' },
];

const SERVICE_TYPES = [
  { value: 'repair',      label: '🔧 Repair / چاکردنەوە' },
  { value: 'maintenance', label: '🛠️ Maintenance / چاودێری' },
  { value: 'inspection',  label: '🔍 Inspection / پشکنین' },
  { value: 'towing',      label: '🚚 Towing / کێشان' },
  { value: 'other',       label: '🔵 Other / جی' },
];

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
  mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th',
  fri: 'Fr', sat: 'Sa', sun: 'Su',
};

const CURRENCIES = ['USD', 'IQD', 'EUR'];

// ── Vehicle Details constants (Feature: VehicleSpec / SparePartSpec) ───────────
const CURRENT_YEAR = 2026;
const YEARS: number[] = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) => CURRENT_YEAR - i);

const COLORS = [
  { value: 'White',  labelKu: 'سپی',      labelAr: 'أبيض' },
  { value: 'Black',  labelKu: 'ڕەش',      labelAr: 'أسود' },
  { value: 'Silver', labelKu: 'زیوین',    labelAr: 'فضي' },
  { value: 'Red',    labelKu: 'سور',      labelAr: 'أحمر' },
  { value: 'Blue',   labelKu: 'شین',      labelAr: 'أزرق' },
  { value: 'Grey',   labelKu: 'خۆڵەمێشی', labelAr: 'رمادي' },
  { value: 'Brown',  labelKu: 'قاوەیی',   labelAr: 'بني' },
  { value: 'Green',  labelKu: 'سەوز',     labelAr: 'أخضر' },
  { value: 'Yellow', labelKu: 'زەرد',     labelAr: 'أصفر' },
  { value: 'Orange', labelKu: 'پرتەقاڵی', labelAr: 'برتقالي' },
  { value: 'Other',  labelKu: 'هیتر',     labelAr: 'آخر' },
];

// Hex swatches for the small colored badge in the Preview box (Feature: Step Two preview).
const COLOR_SWATCH: Record<string, string> = {
  White: '#f5f5f5', Black: '#1a1a1a', Silver: '#c0c0c0', Red: '#dc2626',
  Blue: '#2563eb', Grey: '#6b7280', Brown: '#78350f', Green: '#16a34a',
  Yellow: '#eab308', Orange: '#ea580c', Other: '#888888',
};

const FUEL_TYPES: { value: VehicleSpec['fuelType']; labelKu: string; labelAr: string }[] = [
  { value: 'PETROL',   labelKu: 'بەنزین',   labelAr: 'بنزين' },
  { value: 'DIESEL',   labelKu: 'گازوەیل',  labelAr: 'ديزل' },
  { value: 'HYBRID',   labelKu: 'هایبرید',  labelAr: 'هجين' },
  { value: 'ELECTRIC', labelKu: 'کارەبایی', labelAr: 'كهربائي' },
  { value: 'GAS',      labelKu: 'گاز',      labelAr: 'غاز' },
];

const TRANSMISSIONS: { value: VehicleSpec['transmission']; labelKu: string; labelAr: string }[] = [
  { value: 'AUTOMATIC',      labelKu: 'ئۆتۆماتیک',     labelAr: 'أوتوماتيك' },
  { value: 'MANUAL',         labelKu: 'یەدەستی',        labelAr: 'يدوي' },
  { value: 'SEMI_AUTOMATIC', labelKu: 'نیوە ئۆتۆماتیک', labelAr: 'نصف أوتوماتيك' },
];

const ENGINE_CCS = ['1000', '1300', '1600', '1800', '2000', '2500', '3000', '3500', '4000', '4500', '5000+'];

const BODY_TYPES: { value: VehicleSpec['bodyType']; labelKu: string; labelAr: string }[] = [
  { value: 'SEDAN',     labelKu: 'سیدان',      labelAr: 'سيدان' },
  { value: 'SUV',       labelKu: 'ئێس یوو ڤی', labelAr: 'دفع رباعي' },
  { value: 'PICKUP',    labelKu: 'پیکەپ',      labelAr: 'بيك أب' },
  { value: 'HATCHBACK', labelKu: 'هاچبەک',     labelAr: 'هاتشباك' },
  { value: 'COUPE',     labelKu: 'کوپێه',       labelAr: 'كوبيه' },
  { value: 'VAN',       labelKu: 'ڤان',         labelAr: 'فان' },
  { value: 'WAGON',     labelKu: 'واگۆن',       labelAr: 'واغن' },
];

const DRIVE_TYPES: { value: VehicleSpec['driveType']; labelKu: string }[] = [
  { value: 'FWD', labelKu: 'FWD' },
  { value: 'RWD', labelKu: 'RWD' },
  { value: 'AWD', labelKu: 'AWD' },
  { value: '4WD', labelKu: '4WD' },
];

const DOORS_OPTIONS: NonNullable<VehicleSpec['doors']>[] = [2, 3, 4];

const MOTO_TYPES: { value: VehicleSpec['motoType']; labelKu: string; labelAr: string }[] = [
  { value: 'SPORT',   labelKu: 'سپۆرت',  labelAr: 'رياضية' },
  { value: 'CRUISER', labelKu: 'کروزەر', labelAr: 'كروزر' },
  { value: 'SCOOTER', labelKu: 'سکوتەر', labelAr: 'سكوتر' },
  { value: 'DIRT',    labelKu: 'ئۆفرۆد', labelAr: 'دراجة ترابية' },
  { value: 'TOURING', labelKu: 'تۆرینگ', labelAr: 'سياحية' },
];

const PART_CATEGORIES = [
  { value: 'Engine',       labelKu: 'مۆتەر',                labelAr: 'المحرك' },
  { value: 'Brakes',       labelKu: 'بریک',                 labelAr: 'الفرامل' },
  { value: 'Suspension',   labelKu: 'سەسپێنشن',             labelAr: 'نظام التعليق' },
  { value: 'Body',         labelKu: 'جەستە',                labelAr: 'الهيكل' },
  { value: 'Electrical',   labelKu: 'کارەبایی',             labelAr: 'كهربائي' },
  { value: 'Transmission', labelKu: 'گێربۆکس',              labelAr: 'ناقل الحركة' },
  { value: 'Cooling',      labelKu: 'سیستەمی هێوربوونەوە',  labelAr: 'نظام التبريد' },
  { value: 'Exhaust',      labelKu: 'ئیگزۆست',              labelAr: 'العفس' },
  { value: 'Interior',     labelKu: 'ناوەوە',                labelAr: 'الداخلية' },
  { value: 'Wheels',       labelKu: 'تایەر',                 labelAr: 'العجلات' },
  { value: 'Other',        labelKu: 'هیتر',                  labelAr: 'أخرى' },
];

const PART_CONDITIONS: { value: SparePartSpec['condition']; labelKu: string; labelAr: string }[] = [
  { value: 'OEM',         labelKu: 'OEM ڕەسەن',   labelAr: 'أصلي OEM' },
  { value: 'AFTERMARKET', labelKu: 'ئەفتەرمارکێت', labelAr: 'غير أصلي' },
  { value: 'USED',        labelKu: 'بەکارهاتوو',   labelAr: 'مستعمل' },
];

const CITY_GROUPS: { group: string; groupKu: string; cities: string[] }[] = [
  { group: 'Kurdistan', groupKu: 'کوردستان', cities: ['Erbil', 'Sulaymaniyah', 'Duhok', 'Halabja', 'Zakho'] },
  { group: 'Iraq',      groupKu: 'عێراق',    cities: ['Baghdad', 'Basra', 'Mosul', 'Kirkuk', 'Najaf', 'Karbala'] },
  { group: 'UAE',       groupKu: 'ئیمارات',  cities: ['Dubai', 'Abu Dhabi', 'Sharjah'] },
];

// ── Form state ────────────────────────────────────────────────────────────────
export interface FormValues {
  // Core
  titleEn:       string;
  titleKu:       string;
  titleAr:       string;
  price:         string;
  currency:      string;
  type:          ListingTypeValue;
  negotiable:    boolean;
  descriptionEn: string;
  descriptionKu: string;
  images:        string[];
  images360:     string[];
  // Vehicle
  condition:     string;
  // Accessory
  accBrand:      string;
  accModel:      string;
  accCondition:  string;
  accColor:      string;
  accMaterial:   string;
  accWeight:     string;
  accDimensions: string;
  compatibleBrands: string;
  compatibleModels: string;
  // Service
  serviceType:   string;
  duration:      string;
  mobile:        boolean;
  warranty:      string;
  availableDays: string[];
  // Vehicle Details (Feature: CAR / MOTORCYCLE)
  brand:         string;
  model:         string;
  year:          string;
  mileage:       string;
  vColor:        string;
  fuelType:      VehicleSpec['fuelType'] | '';
  transmission:  VehicleSpec['transmission'] | '';
  engineCC:      string;
  bodyType:      VehicleSpec['bodyType'] | '';
  driveType:     VehicleSpec['driveType'] | '';
  doors:         string;
  motoType:      VehicleSpec['motoType'] | '';
  // Spare Part Details (Feature: SPARE_PART)
  partCategory:    string;
  partNumber:      string;
  partCondition:   SparePartSpec['condition'] | '';
  compatibleBrand: string;
  // Location & Contact (all listing types)
  city:            string;
  district:        string;
  contactPhone:    string;
  contactWhatsapp: string;
}

interface FormErrors {
  titleEn?:     string;
  titleKu?:     string;
  price?:       string;
  condition?:   string;
  type?:        string;
  serviceType?: string;
  images?:      string;
  general?:     string;
  brand?:       string;
  model?:       string;
  year?:        string;
  partCategory?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.titleEn.trim())       errors.titleEn   = 'English title is required';
  else if (values.titleEn.trim().length < 5)   errors.titleEn   = 'Min 5 characters';
  else if (values.titleEn.trim().length > 120)  errors.titleEn   = 'Max 120 characters';
  if (!values.titleKu.trim())       errors.titleKu   = 'Kurdish title is required';
  if (!values.price)                errors.price     = 'Price is required';
  else if (isNaN(Number(values.price)) || Number(values.price) < 0) errors.price = 'Enter a valid price';
  if (!values.type)                 errors.type      = 'Select a type';
  if (VEHICLE_TYPES.has(values.type) && !values.condition)
    errors.condition = 'Select a condition';
  if (values.type === 'SERVICE' && !values.serviceType)
    errors.serviceType = 'Select a service type';
  if (values.images.length === 0)   errors.images    = 'Upload at least one photo';
  if (values.type === 'CAR') {
    if (!values.brand.trim()) errors.brand = 'Brand is required';
    if (!values.model.trim()) errors.model = 'Model is required';
    if (!values.year)         errors.year  = 'Year is required';
  }
  if (values.type === 'MOTORCYCLE') {
    if (!values.brand.trim()) errors.brand = 'Brand is required';
    if (!values.year)         errors.year  = 'Year is required';
  }
  if (values.type === 'SPARE_PART' && !values.partCategory)
    errors.partCategory = 'Part category is required';
  return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SellCarForm() {
  const router        = useRouter();
  const locale        = useLocale();
  const queryClient   = useQueryClient();
  const { user, isHydrated } = useAuthStore((s) => ({ user: s.user, isHydrated: s.isHydrated }));

  // ── ALL hooks must be declared before any early return ────────────────────
  const [permStatus,  setPermStatus]  = useState<PermissionStatus | null>(null);
  const [permLoading, setPermLoading] = useState(true);

  const [step, setStep]     = useState(1);
  const [values, setValues] = useState<FormValues>({
    titleEn: '', titleKu: '', titleAr: '',
    price: '', currency: 'USD', type: 'CAR', negotiable: false,
    descriptionEn: '', descriptionKu: '',
    images: [],
    images360: [],
    condition: '',
    accBrand: '', accModel: '', accCondition: '', accColor: '',
    accMaterial: '', accWeight: '', accDimensions: '',
    compatibleBrands: '', compatibleModels: '',
    serviceType: '', duration: '', mobile: false,
    warranty: '', availableDays: [],
    brand: '', model: '', year: '', mileage: '', vColor: '',
    fuelType: '', transmission: '', engineCC: '', bodyType: '',
    driveType: '', doors: '', motoType: '',
    partCategory: '', partNumber: '', partCondition: '', compatibleBrand: '',
    city: '', district: '', contactPhone: '', contactWhatsapp: '',
  });
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSaved,  setDraftSaved]  = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!isHydrated || !user) return;
    setPermLoading(true);
    subscriptionApi
      .getStatus()
      .then(setPermStatus)
      .catch(() => setPermStatus({ canPost: false, reason: 'NOT_DEALER' }))
      .finally(() => setPermLoading(false));
  }, [isHydrated, user]);

  // ── Draft auto-save (Feature: Save Draft) ─────────────────────────────────
  // Restore a saved draft on mount. Image URLs are intentionally NOT restored —
  // blob: URLs created via URL.createObjectURL() die on reload and CDN URLs
  // would resurrect orphaned uploads, so photos must always be re-added.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setValues((v) => ({ ...v, ...parsed, images: v.images, images360: v.images360 }));
        setDraftRestored(true);
      } catch {
        // Corrupt draft — ignore and continue with defaults.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every form state change to localStorage (debounced via JSON diffing
  // is unnecessary here — writes are cheap and infrequent relative to keystrokes).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { images, images360, ...draftable } = values;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftable));
  }, [values]);

  const saveDraftNow = useCallback(() => {
    if (typeof window === 'undefined') return;
    const { images, images360, ...draftable } = values;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftable));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  }, [values]);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const set = useCallback(
    (field: keyof FormValues) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value =
          e.target.type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : e.target.value;
        setValues((v) => ({ ...v, [field]: value }));
        if (errors[field as keyof FormErrors]) setErrors((er) => ({ ...er, [field]: undefined }));
      },
    [errors],
  );

  const setImages = useCallback((imgs: string[]) => {
    setValues((v) => ({ ...v, images: imgs }));
    if (errors.images) setErrors((er) => ({ ...er, images: undefined }));
  }, [errors.images]);

  const setImages360 = useCallback((imgs: string[]) => {
    setValues((v) => ({ ...v, images360: imgs }));
  }, []);

  const toggleDay = (day: string) => {
    setValues((v) => ({
      ...v,
      availableDays: v.availableDays.includes(day)
        ? v.availableDays.filter((d) => d !== day)
        : [...v.availableDays, day],
    }));
  };

  // ── Early returns AFTER all hooks ─────────────────────────────────────────
  if (!isHydrated || permLoading) {
    return (
      <div className="min-h-screen bg-[var(--ink-950)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-faint)] text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (permStatus?.reason === 'NOT_DEALER') {
    return (
      <div className="min-h-screen bg-[var(--ink-950)] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}>
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-1" dir="rtl">ئەم تایبەتمەندییە تەنها بۆ فرۆشیارانە</h2>
          <p className="text-[var(--text-faint)] text-sm mb-6">This feature is for dealers only</p>
          <button onClick={() => router.push('/register')}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl font-bold text-sm
                       bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e] text-[#050b14]
                       hover:from-[#e8cc7a] hover:to-[#c9a84c] transition-all duration-200">
            بچۆ بۆ تۆمارکردن وەک فرۆشیار / Register as Dealer
          </button>
        </div>
      </div>
    );
  }

  if (permStatus?.reason === 'TRIAL_EXPIRED' || permStatus?.reason === 'LIMIT_REACHED') {
    return (
      <div className="min-h-screen bg-[var(--ink-950)] relative overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
          <UpgradePrompt reason={permStatus.reason as 'TRIAL_EXPIRED' | 'LIMIT_REACHED'} />
        </div>
      </div>
    );
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 1) {
      const errs = validate(values);
      const step1Errs: FormErrors = {};
      if (errs.titleEn)     step1Errs.titleEn     = errs.titleEn;
      if (errs.titleKu)     step1Errs.titleKu     = errs.titleKu;
      if (errs.price)       step1Errs.price       = errs.price;
      if (errs.type)        step1Errs.type        = errs.type;
      if (errs.condition)   step1Errs.condition   = errs.condition;
      if (errs.serviceType) step1Errs.serviceType = errs.serviceType;
      if (Object.keys(step1Errs).length) { setErrors(step1Errs); return; }
    }
    if (step === 2) {
      const errs = validate(values);
      const step2Errs: FormErrors = {};
      if (errs.brand)        step2Errs.brand        = errs.brand;
      if (errs.model)        step2Errs.model        = errs.model;
      if (errs.year)         step2Errs.year         = errs.year;
      if (errs.partCategory) step2Errs.partCategory = errs.partCategory;
      if (Object.keys(step2Errs).length) { setErrors((e) => ({ ...e, ...step2Errs })); return; }
    }
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate(values);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!user) { setSubmitError('You must be logged in.'); return; }

    setSubmitting(true);
    setSubmitError(null);

    const isVehicle    = VEHICLE_TYPES.has(values.type);
    const isAccessory  = values.type === 'ACCESSORY';
    const isService    = values.type === 'SERVICE';
    const isCar        = values.type === 'CAR';
    const isMoto       = values.type === 'MOTORCYCLE';
    const isSparePart  = values.type === 'SPARE_PART';

    try {
      const payload: CreateListingPayload = {
        titleEn:       values.titleEn.trim(),
        titleKu:       values.titleKu.trim(),
        titleAr:       values.titleAr.trim() || values.titleEn.trim(),
        titleZh:       values.titleEn.trim(),
        price:         Number(values.price),
        currency:      values.currency,
        type:          values.type,
        negotiable:    values.negotiable,
        descriptionEn: values.descriptionEn.trim() || undefined,
        descriptionKu: values.descriptionKu.trim() || undefined,
        images:        values.images,
        ...(isVehicle ? { condition: values.condition ?? 'USED' } : {}),
        ...((isAccessory || isService)
          ? {
              accessorySpec: {
                ...(isAccessory ? {
                  brand:            values.accBrand     || undefined,
                  model:            values.accModel     || undefined,
                  condition:        values.accCondition || undefined,
                  color:            values.accColor     || undefined,
                  material:         values.accMaterial  || undefined,
                  weight:           values.accWeight ? Number(values.accWeight) : undefined,
                  dimensions:       values.accDimensions || undefined,
                } : {}),
                ...(isService ? {
                  serviceType:   values.serviceType || undefined,
                  duration:      values.duration ? Number(values.duration) : undefined,
                  mobile:        values.mobile,
                  warranty:      values.warranty ? Number(values.warranty) : undefined,
                  availableDays: values.availableDays,
                } : {}),
                compatibleBrands: values.compatibleBrands
                  ? values.compatibleBrands.split(',').map((s) => s.trim()).filter(Boolean)
                  : [],
                compatibleModels: values.compatibleModels
                  ? values.compatibleModels.split(',').map((s) => s.trim()).filter(Boolean)
                  : [],
              },
            }
          : {}),
        ...((isCar || isMoto)
          ? {
              vehicleSpec: {
                brand:        values.brand.trim() || undefined,
                model:        values.model.trim() || undefined,
                year:         values.year ? Number(values.year) : undefined,
                mileage:      values.mileage ? Number(values.mileage) : undefined,
                color:        values.vColor || undefined,
                fuelType:     values.fuelType || undefined,
                transmission: values.transmission || undefined,
                engineCC:     values.engineCC ? Number(values.engineCC.replace('+', '')) : undefined,
                ...(isCar ? {
                  bodyType:  values.bodyType || undefined,
                  driveType: values.driveType || undefined,
                  doors:     values.doors ? (Number(values.doors) as VehicleSpec['doors']) : undefined,
                } : {}),
                ...(isMoto ? {
                  motoType: values.motoType || undefined,
                } : {}),
              },
            }
          : {}),
        ...(isSparePart
          ? {
              sparePartSpec: {
                partCategory:    values.partCategory || undefined,
                partNumber:      values.partNumber.trim() || undefined,
                condition:       values.partCondition || undefined,
                compatibleBrand: values.compatibleBrand.trim() || undefined,
              },
            }
          : {}),
        city:            values.city || undefined,
        district:        values.district.trim() || undefined,
        contactPhone:    values.contactPhone.trim() || undefined,
        contactWhatsapp: values.contactWhatsapp.trim() || undefined,
      };

      const listing = await sellApi.createListing(payload);
      await queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
      clearDraft();
      router.push(`/cars/${listing.id}`);
    } catch (err: any) {
      const status = err?.response?.status as number | undefined;
      if      (status === 401) setSubmitError('Session expired. Please log in again.');
      else if (status === 403) setSubmitError('Verify your email before publishing.');
      else if (status === 429) setSubmitError('Too many requests — please wait and try again.');
      else setSubmitError(
        err?.response?.data?.message ?? err?.message ?? 'Something went wrong.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const trialDaysRemaining = permStatus?.trialEnd
    ? Math.max(0, Math.ceil((new Date(permStatus.trialEnd).getTime() - Date.now()) / 86_400_000))
    : null;

  const isVehicle   = VEHICLE_TYPES.has(values.type);
  const isAccessory = values.type === 'ACCESSORY';
  const isService   = values.type === 'SERVICE';
  const isCar       = values.type === 'CAR';
  const isMoto      = values.type === 'MOTORCYCLE';
  const isSparePart = values.type === 'SPARE_PART';

  return (
    <div className="min-h-screen bg-[var(--ink-950)] relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.07)_0%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">

        {permStatus?.reason === 'TRIAL' && trialDaysRemaining !== null && (
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap
                          px-5 py-3 rounded-xl
                          bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.25)]">
            <div>
              <p className="text-[var(--gold)] text-sm font-semibold" dir="rtl">
                ماوەی تاقیکردنەوە: {trialDaysRemaining} رۆژ ماوە — {permStatus.trialPostsUsed ?? 0}/50 پۆست
              </p>
              <p className="text-[var(--text-faint)] text-xs">
                Trial: {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left — {permStatus.trialPostsUsed ?? 0}/50 posts used
              </p>
            </div>
            <a href="/pricing" className="text-xs font-bold text-[var(--gold)] underline underline-offset-2 whitespace-nowrap">
              Upgrade →
            </a>
          </div>
        )}

        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                          bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)]
                          text-[var(--gold)] text-xs font-semibold tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
            New Listing / ئیلانی نوێ
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Sell on CarsAuto</h1>
          <p className="text-[var(--text-faint)] text-sm">
            Cars · Accessories · Services — Kurdistan & Iraq
          </p>
        </div>

        <SellProgress step={step} />

        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] p-8 mt-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >

          {step === 1 && (
            <div className="space-y-6">
              <StepHeading icon="📋" title="Basic Information" subtitle="Title, price, and listing type" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SellFormField label="Title (English)" required error={errors.titleEn}>
                  <input type="text" placeholder="e.g. 2021 Toyota Camry SE"
                    value={values.titleEn} onChange={set('titleEn')} maxLength={120}
                    className={inputCls(!!errors.titleEn)} />
                </SellFormField>
                <SellFormField label="Title (Kurdish / ناونیشان)" required error={errors.titleKu}>
                  <input type="text" placeholder="ناونیشانی بابەتەکە"
                    value={values.titleKu} onChange={set('titleKu')} maxLength={120} dir="rtl"
                    className={inputCls(!!errors.titleKu)} />
                </SellFormField>
              </div>

              <SellFormField label="Title (Arabic)" optional>
                <input type="text" placeholder="عنوان العنصر" dir="rtl"
                  value={values.titleAr} onChange={set('titleAr')} maxLength={120}
                  className={inputCls(false)} />
              </SellFormField>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <SellFormField label="Price / نرخ" required error={errors.price} className="sm:col-span-2">
                  <div className="flex gap-2">
                    <input type="number" placeholder="0" min="0"
                      value={values.price} onChange={set('price')}
                      className={`${inputCls(!!errors.price)} flex-[3] min-w-0`} />
                    <select value={values.currency} onChange={set('currency')}
                      className={`${selectCls(false)} flex-[1] min-w-[72px] max-w-[88px]`}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </SellFormField>
                <SellFormField label="Negotiable / چانەپێکردن">
                  <label className="flex items-center gap-3 h-[42px] cursor-pointer select-none">
                    <span onClick={() => setValues((v) => ({ ...v, negotiable: !v.negotiable }))}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer border
                        ${values.negotiable ? 'bg-[var(--gold)] border-[var(--gold)]' : 'bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.12)]'}`}>
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
                        ${values.negotiable ? 'translate-x-5' : 'translate-x-0'}`} />
                    </span>
                    <span className="text-[var(--text-secondary)] text-sm">Yes</span>
                  </label>
                </SellFormField>
              </div>

              <SellFormField label="Listing Type / جۆری ئیلان" required error={errors.type}>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {TYPES.map((t) => (
                    <button key={t.value} type="button"
                      onClick={() => {
                        setValues((v) => ({ ...v, type: t.value as ListingTypeValue, condition: '', serviceType: '' }));
                        setErrors((e) => ({ ...e, type: undefined, condition: undefined, serviceType: undefined }));
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all duration-150
                        ${values.type === t.value
                          ? 'bg-[rgba(201,168,76,0.15)] border-[rgba(201,168,76,0.5)] text-[var(--gold)]'
                          : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[var(--text-muted)] hover:border-[rgba(255,255,255,0.2)]'
                        }`}
                    >
                      <span className="text-lg">{t.label.split(' ')[0]}</span>
                      <span>{t.label.split(' ').slice(1).join(' ')}</span>
                      <span className="text-[10px] opacity-70" dir="rtl">{t.labelKu}</span>
                    </button>
                  ))}
                </div>
                {errors.type && <p className="text-[#ef4444] text-xs mt-1">{errors.type}</p>}
              </SellFormField>

              {isVehicle && (
                <SellFormField label="Condition / حاڵەت" required error={errors.condition}>
                  <select value={values.condition} onChange={set('condition')} className={selectCls(!!errors.condition)}>
                    <option value="">Select condition…</option>
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </SellFormField>
              )}

              {isService && (
                <SellFormField label="Service Type / جۆری خزمەتگوزاری" required error={errors.serviceType}>
                  <select value={values.serviceType} onChange={set('serviceType')} className={selectCls(!!errors.serviceType)}>
                    <option value="">Select service type…</option>
                    {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </SellFormField>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <StepHeading
                icon={isService ? '⚙️' : isAccessory ? '🎁' : '📝'}
                title="Details"
                subtitle={isService ? 'Service info & availability' : isAccessory ? 'Accessory specifications' : 'Tell buyers about your listing'}
              />

              <SellFormField label="Description (English)" optional>
                <textarea placeholder="Describe your listing…"
                  value={values.descriptionEn} onChange={set('descriptionEn')}
                  rows={4} maxLength={2000} className={textareaCls(false)} />
                <CharCount current={values.descriptionEn.length} max={2000} />
              </SellFormField>

              <SellFormField label="Description (Kurdish / وەسف)" optional>
                <textarea placeholder="بابەتەکەت وەسف بکە…" dir="rtl"
                  value={values.descriptionKu} onChange={set('descriptionKu')}
                  rows={4} maxLength={2000} className={textareaCls(false)} />
                <CharCount current={values.descriptionKu.length} max={2000} />
              </SellFormField>

              {(isCar || isMoto || isSparePart) && (
                <>
                  <div className="h-px bg-[rgba(255,255,255,0.06)]" />
                  <p className="text-[var(--gold)] text-xs font-semibold uppercase tracking-widest" dir="auto">
                    🚗 زانیاری ئۆتۆمبێل · Vehicle Details
                  </p>

                  {isCar && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Brand / مارکە" required error={errors.brand}>
                          <select dir="auto" value={values.brand}
                            onChange={e => {
                              setValues(v => ({ ...v, brand: e.target.value, model: '' }));
                              if (errors.brand) setErrors(er => ({ ...er, brand: undefined }));
                            }}
                            className={selectCls(!!errors.brand)}>
                            <option value="">مارکە هەڵبژێرە / Select Brand</option>
                            {CAR_MAKES.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Model / مۆدێل" required error={errors.model}>
                          <select dir="auto" value={values.model}
                            onChange={e => {
                              setValues(v => ({ ...v, model: e.target.value }));
                              if (errors.model) setErrors(er => ({ ...er, model: undefined }));
                            }}
                            disabled={!values.brand}
                            className={`${selectCls(!!errors.model)} disabled:opacity-40 disabled:cursor-not-allowed`}>
                            <option value="">{values.brand ? 'مۆدێل هەڵبژێرە / Select Model' : 'پێشتر براند هەڵبژێرە'}</option>
                            {getModelsByMake(values.brand).map(m => <option key={m} value={m}>{m}</option>)}
                            <option value="__other__">Other / هیتر</option>
                          </select>
                        </SellFormField>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Year / ساڵ" required error={errors.year}>
                          <select dir="auto" value={values.year} onChange={set('year')} className={selectCls(!!errors.year)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Mileage (km) / کیلۆمەتر" optional>
                          <input type="number" dir="auto" placeholder="0" min="0"
                            value={values.mileage} onChange={set('mileage')}
                            className={inputCls(false)} />
                        </SellFormField>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Color / ڕەنگ" optional>
                          <select dir="auto" value={values.vColor} onChange={set('vColor')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {COLORS.map((c) => <option key={c.value} value={c.value}>{c.value} / {c.labelKu}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Fuel Type / سووتەمەنی" optional>
                          <select dir="auto" value={values.fuelType} onChange={set('fuelType')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.value} / {f.labelKu}</option>)}
                          </select>
                        </SellFormField>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Transmission / گێربۆکس" optional>
                          <select dir="auto" value={values.transmission} onChange={set('transmission')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {TRANSMISSIONS.map((t) => <option key={t.value} value={t.value}>{t.value} / {t.labelKu}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Engine CC / بەهێزی مۆتەر" optional>
                          <select dir="auto" value={values.engineCC} onChange={set('engineCC')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {ENGINE_CCS.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                          </select>
                        </SellFormField>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Body Type / جۆری جەستە" optional>
                          <select dir="auto" value={values.bodyType} onChange={set('bodyType')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {BODY_TYPES.map((b) => <option key={b.value} value={b.value}>{b.value} / {b.labelKu}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Drive Type / جۆری درایڤ" optional>
                          <select dir="auto" value={values.driveType} onChange={set('driveType')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {DRIVE_TYPES.map((d) => <option key={d.value} value={d.value}>{d.value}</option>)}
                          </select>
                        </SellFormField>
                      </div>
                      <SellFormField label="Doors / دەرگا" optional>
                        <select dir="auto" value={values.doors} onChange={set('doors')} className={selectCls(false)}>
                          <option value="">هەڵبژێرە / اختر / Select</option>
                          {DOORS_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </SellFormField>
                    </>
                  )}

                  {isMoto && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Brand / مارکە" required error={errors.brand}>
                          <select dir="auto" value={values.brand}
                            onChange={e => {
                              setValues(v => ({ ...v, brand: e.target.value, model: '' }));
                              if (errors.brand) setErrors(er => ({ ...er, brand: undefined }));
                            }}
                            className={selectCls(!!errors.brand)}>
                            <option value="">مارکە هەڵبژێرە / Select Brand</option>
                            {CAR_MAKES.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Model / مۆدێل" optional>
                          <input type="text" dir="auto"
                            placeholder={values.brand ? `e.g. ${getModelsByMake(values.brand)[0] ?? 'Model'}` : 'براند هەڵبژێرە'}
                            value={values.model} onChange={set('model')} maxLength={50}
                            className={inputCls(false)} />
                        </SellFormField>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Year / ساڵ" required error={errors.year}>
                          <select dir="auto" value={values.year} onChange={set('year')} className={selectCls(!!errors.year)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Mileage (km) / کیلۆمەتر" optional>
                          <input type="number" dir="auto" placeholder="0" min="0"
                            value={values.mileage} onChange={set('mileage')}
                            className={inputCls(false)} />
                        </SellFormField>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Color / ڕەنگ" optional>
                          <select dir="auto" value={values.vColor} onChange={set('vColor')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {COLORS.map((c) => <option key={c.value} value={c.value}>{c.value} / {c.labelKu}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Fuel Type / سووتەمەنی" optional>
                          <select dir="auto" value={values.fuelType} onChange={set('fuelType')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.value} / {f.labelKu}</option>)}
                          </select>
                        </SellFormField>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Transmission / گێربۆکس" optional>
                          <select dir="auto" value={values.transmission} onChange={set('transmission')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {TRANSMISSIONS.map((t) => <option key={t.value} value={t.value}>{t.value} / {t.labelKu}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Moto Type / جۆری مۆتۆ" optional>
                          <select dir="auto" value={values.motoType} onChange={set('motoType')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {MOTO_TYPES.map((m) => <option key={m.value} value={m.value}>{m.value} / {m.labelKu}</option>)}
                          </select>
                        </SellFormField>
                      </div>
                    </>
                  )}

                  {isSparePart && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Part Category / کەتەگۆری" required error={errors.partCategory}>
                          <select dir="auto" value={values.partCategory} onChange={set('partCategory')} className={selectCls(!!errors.partCategory)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {PART_CATEGORIES.map((p) => <option key={p.value} value={p.value}>{p.value} / {p.labelKu}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Part Number / ژمارەی پارچە" optional>
                          <input type="text" dir="auto" placeholder="e.g. 04465-33450"
                            value={values.partNumber} onChange={set('partNumber')} maxLength={100}
                            className={inputCls(false)} />
                        </SellFormField>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <SellFormField label="Condition / حاڵەت" optional>
                          <select dir="auto" value={values.partCondition} onChange={set('partCondition')} className={selectCls(false)}>
                            <option value="">هەڵبژێرە / اختر / Select</option>
                            {PART_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.value} / {c.labelKu}</option>)}
                          </select>
                        </SellFormField>
                        <SellFormField label="Compatible Brand / گونجاو بۆ" optional>
                          <input type="text" dir="auto" placeholder="e.g. Toyota"
                            value={values.compatibleBrand} onChange={set('compatibleBrand')} maxLength={100}
                            className={inputCls(false)} />
                        </SellFormField>
                      </div>
                    </>
                  )}
                </>
              )}

              {isAccessory && (
                <>
                  <div className="h-px bg-[rgba(255,255,255,0.06)]" />
                  <p className="text-[var(--gold)] text-xs font-semibold uppercase tracking-widest">
                    🎁 Accessory Specifications
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SellFormField label="Brand" optional>
                      <input type="text" placeholder="e.g. Bosch"
                        value={values.accBrand} onChange={set('accBrand')} maxLength={100}
                        className={inputCls(false)} />
                    </SellFormField>
                    <SellFormField label="Model" optional>
                      <input type="text" placeholder="e.g. Premium Line"
                        value={values.accModel} onChange={set('accModel')} maxLength={100}
                        className={inputCls(false)} />
                    </SellFormField>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <SellFormField label="Condition">
                      <select value={values.accCondition} onChange={set('accCondition')} className={selectCls(false)}>
                        <option value="">Any</option>
                        <option value="NEW">New / نوێ</option>
                        <option value="USED">Used / بەکارهاتوو</option>
                      </select>
                    </SellFormField>
                    <SellFormField label="Color" optional>
                      <input type="text" placeholder="e.g. Black"
                        value={values.accColor} onChange={set('accColor')} maxLength={50}
                        className={inputCls(false)} />
                    </SellFormField>
                    <SellFormField label="Material" optional>
                      <input type="text" placeholder="e.g. Rubber"
                        value={values.accMaterial} onChange={set('accMaterial')} maxLength={100}
                        className={inputCls(false)} />
                    </SellFormField>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SellFormField label="Weight (kg)" optional>
                      <input type="number" placeholder="0.0" min="0" step="0.1"
                        value={values.accWeight} onChange={set('accWeight')}
                        className={inputCls(false)} />
                    </SellFormField>
                    <SellFormField label="Dimensions" optional>
                      <input type="text" placeholder="30x20x15 cm"
                        value={values.accDimensions} onChange={set('accDimensions')} maxLength={100}
                        className={inputCls(false)} />
                    </SellFormField>
                  </div>
                </>
              )}

              {isService && (
                <>
                  <div className="h-px bg-[rgba(255,255,255,0.06)]" />
                  <p className="text-[var(--gold)] text-xs font-semibold uppercase tracking-widest">
                    ⚙️ Service Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SellFormField label="Estimated Duration (minutes)" optional>
                      <input type="number" placeholder="e.g. 60" min="1"
                        value={values.duration} onChange={set('duration')}
                        className={inputCls(false)} />
                    </SellFormField>
                    <SellFormField label="Warranty (days)" optional>
                      <input type="number" placeholder="e.g. 30" min="0"
                        value={values.warranty} onChange={set('warranty')}
                        className={inputCls(false)} />
                    </SellFormField>
                  </div>
                  <SellFormField label="Mobile Service / خزمەتگوزاری مۆبایل">
                    <label className="flex items-center gap-3 h-[42px] cursor-pointer select-none">
                      <span onClick={() => setValues((v) => ({ ...v, mobile: !v.mobile }))}
                        className={`relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 cursor-pointer border
                          ${values.mobile ? 'bg-[var(--gold)] border-[var(--gold)]' : 'bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.12)]'}`}>
                        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
                          ${values.mobile ? 'translate-x-5' : 'translate-x-0'}`} />
                      </span>
                      <span className="text-[var(--text-secondary)] text-sm">
                        We come to you / ئێمە دێینە لای تۆ
                      </span>
                    </label>
                  </SellFormField>
                  <SellFormField label="Available Days / رۆژانی بەردەستبوون" optional>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {DAYS.map((day) => (
                        <button key={day} type="button" onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
                            ${values.availableDays.includes(day)
                              ? 'bg-[rgba(201,168,76,0.2)] border border-[rgba(201,168,76,0.5)] text-[var(--gold)]'
                              : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[var(--text-muted)] hover:border-[rgba(255,255,255,0.2)]'
                            }`}>
                          {DAY_LABELS[day]}
                        </button>
                      ))}
                    </div>
                  </SellFormField>
                </>
              )}

              {(isAccessory || isService) && (
                <>
                  <div className="h-px bg-[rgba(255,255,255,0.06)]" />
                  <p className="text-[var(--text-faint)] text-xs font-semibold uppercase tracking-widest">
                    🔗 Compatible Vehicles (optional / ئۆتۆمبێلی گونجاو)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <SellFormField label="Compatible Brands (comma-separated)" optional>
                      <input type="text" placeholder="Toyota, Honda, Kia"
                        value={values.compatibleBrands} onChange={set('compatibleBrands')}
                        className={inputCls(false)} />
                    </SellFormField>
                    <SellFormField label="Compatible Models (comma-separated)" optional>
                      <input type="text" placeholder="Camry, Civic, Sportage"
                        value={values.compatibleModels} onChange={set('compatibleModels')}
                        className={inputCls(false)} />
                    </SellFormField>
                  </div>
                </>
              )}

              <div className="h-px bg-[rgba(255,255,255,0.06)]" />
              <p className="text-[var(--gold)] text-xs font-semibold uppercase tracking-widest" dir="auto">
                📍 شوێن و پەیوەندی · Location &amp; Contact
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SellFormField label="City / شار" optional>
                  <select dir="auto" value={values.city} onChange={set('city')} className={selectCls(false)}>
                    <option value="">هەڵبژێرە / اختر / Select</option>
                    {CITY_GROUPS.map((g) => (
                      <optgroup key={g.group} label={`${g.group} / ${g.groupKu}`}>
                        {g.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </SellFormField>
                <SellFormField label="District / ناوچە" optional>
                  <input type="text" dir="auto" placeholder="e.g. Ankawa"
                    value={values.district} onChange={set('district')} maxLength={100}
                    className={inputCls(false)} />
                </SellFormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SellFormField label="Phone / تەلەفۆن" optional>
                  <input type="tel" dir="auto" placeholder="+964 750 000 0000"
                    value={values.contactPhone} onChange={set('contactPhone')} maxLength={20}
                    className={inputCls(false)} />
                </SellFormField>
                <SellFormField label="WhatsApp" optional>
                  <input type="tel" dir="auto" placeholder="+964 750 000 0000"
                    value={values.contactWhatsapp} onChange={set('contactWhatsapp')} maxLength={20}
                    className={inputCls(false)} />
                </SellFormField>
              </div>

              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] p-4 bg-[rgba(255,255,255,0.02)]">
                <p className="text-xs text-[var(--text-faint)] mb-2 uppercase tracking-wider">Preview</p>
                <p className="text-white font-semibold">{values.titleEn || 'Title'}</p>
                <p className="text-[var(--gold)] text-sm mt-1">
                  {values.price ? `${Number(values.price).toLocaleString()} ${values.currency}` : 'Price not set'}
                </p>
                {(values.brand || values.model || values.year) && (
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    {[values.brand, values.model, values.year].filter(Boolean).join(' ')}
                  </p>
                )}
                {values.mileage && (
                  <p className="text-[var(--text-faint)] text-xs mt-1">
                    {Number(values.mileage).toLocaleString()} km
                  </p>
                )}
                {values.city && (
                  <p className="text-[var(--text-faint)] text-xs mt-1 flex items-center gap-1">
                    <span>📍</span>{values.city}
                  </p>
                )}
                {(values.vColor || values.fuelType || values.transmission) && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {values.vColor && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium
                                       bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[var(--text-secondary)]">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20"
                          style={{ backgroundColor: COLOR_SWATCH[values.vColor] ?? '#888' }}
                        />
                        {values.vColor}
                      </span>
                    )}
                    {values.fuelType && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium
                                       bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)]">
                        {values.fuelType}
                      </span>
                    )}
                    {values.transmission && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium
                                       bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)]">
                        {values.transmission}
                      </span>
                    )}
                  </div>
                )}
                {values.descriptionEn && (
                  <p className="text-[var(--text-muted)] text-sm mt-2 line-clamp-2">{values.descriptionEn}</p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <StepHeading icon="📸" title="Photos / وێنەکان" subtitle="Upload up to 10 photos" />
              <ImageUploadGrid images={values.images} onChange={setImages} error={errors.images} />
              {(values.type === 'CAR' || values.type === 'MOTORCYCLE') && (
                <Upload360Section images360={values.images360} onChange={setImages360} />
              )}
              {submitError && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)]">
                  <span className="text-xl">⚠️</span>
                  <p className="text-[#ef4444] text-sm">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {draftRestored && step === 1 && (
            <div className="flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl text-xs
                            bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)] text-[var(--gold)]">
              <span>📝</span>
              <span dir="auto">درافتێکی پاشەکەوتکراو گەڕێنرایەوە · تم استرجاع مسودة محفوظة · A saved draft was restored</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[rgba(255,255,255,0.06)] flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {step > 1 ? (
                <button onClick={goBack} className={ghostBtn}>← Back</button>
              ) : <div />}
              <button type="button" onClick={saveDraftNow} className={draftBtn} dir="auto">
                💾 دراف پاراستن · حفظ كمسودة · Save Draft
              </button>
            </div>
            <div className="flex items-center gap-3">
              {draftSaved && (
                <span className="text-xs text-[#4ade80] flex items-center gap-1.5 animate-pulse" dir="auto">
                  ✓ پاشەکەوتکرا · تم الحفظ · Saved
                </span>
              )}
              {step < 3 ? (
                <button onClick={goNext} className={goldBtn}>Continue →</button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting} className={`${goldBtn} min-w-[160px]`}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#050b14] border-t-transparent rounded-full animate-spin" />
                      Publishing…
                    </span>
                  ) : '🚀 Publish Listing'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 flex-wrap">
          {[
            { icon: '🔒', label: 'Secure & Private' },
            { icon: '⚡', label: 'Goes Live Instantly' },
            { icon: '💬', label: 'Direct Buyer Inquiries' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
              <span>{b.icon}</span><span>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StepHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-white font-bold text-xl">{title}</h2>
        <p className="text-[var(--text-faint)] text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

function CharCount({ current, max }: { current: number; max: number }) {
  const pct = current / max;
  return (
    <p className={`text-xs mt-1 text-right ${pct > 0.9 ? 'text-[#ef4444]' : 'text-[var(--text-faint)]'}`}>
      {current}/{max}
    </p>
  );
}

// ── Tailwind helpers ──────────────────────────────────────────────────────────
const baseInput = `
  w-full h-[42px] px-4 rounded-xl text-sm text-white placeholder-[var(--text-faint)]
  bg-[rgba(255,255,255,0.05)] border transition-all duration-150
  focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-0
  focus:bg-[rgba(255,255,255,0.07)]
`;
const inputCls    = (e: boolean) => `${baseInput} ${e ? 'border-[rgba(220,38,38,0.5)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;
const selectCls   = (e: boolean) => `${baseInput} cursor-pointer appearance-none [&>option]:bg-[#0b1525] [&>option]:text-white [&>optgroup]:bg-[#0b1525] [&>optgroup]:text-[#c9a84c] ${e ? 'border-[rgba(220,38,38,0.5)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;
const textareaCls = (e: boolean) =>
  `w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[var(--text-faint)]
   bg-[rgba(255,255,255,0.05)] border transition-all duration-150 resize-none
   focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:bg-[rgba(255,255,255,0.07)]
   ${e ? 'border-[rgba(220,38,38,0.5)]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`;
const goldBtn = `
  inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm
  bg-gradient-to-r from-[#c9a84c] to-[#9e6e1e] text-[#050b14]
  border border-[rgba(201,168,76,0.4)] shadow-[0_3px_14px_rgba(201,168,76,0.22)]
  hover:from-[#e8cc7a] hover:to-[#c9a84c] hover:shadow-[0_6px_28px_rgba(201,168,76,0.28)]
  hover:-translate-y-px active:translate-y-0 transition-all duration-200 cursor-pointer
  disabled:opacity-50 disabled:pointer-events-none
`;
const ghostBtn = `
  inline-flex items-center gap-2 h-11 px-5 rounded-xl font-semibold text-sm
  bg-transparent text-[var(--text-muted)] border border-[rgba(255,255,255,0.08)]
  hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all duration-200 cursor-pointer
`;
const draftBtn = `
  inline-flex items-center gap-2 h-11 px-5 rounded-xl font-semibold text-sm
  bg-transparent text-[var(--gold)] border border-[#c9a84c]
  hover:bg-[rgba(201,168,76,0.08)] transition-all duration-200 cursor-pointer
`;

// ── Upload360Section ──────────────────────────────────────────────────────────
const TOTAL_FRAMES = 36;

function Upload360Section({
  images360,
  onChange,
}: {
  images360: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropTarget   = useRef<number | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const updated = [...images360];
    let slot = dropTarget.current ?? updated.findIndex((u) => !u);
    if (slot === -1) slot = updated.length;
    for (const file of files.slice(0, TOTAL_FRAMES)) {
      const url = URL.createObjectURL(file);
      updated[slot < TOTAL_FRAMES ? slot : TOTAL_FRAMES - 1] = url;
      slot++;
    }
    onChange(updated.slice(0, TOTAL_FRAMES));
    dropTarget.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [images360, onChange]);

  const openFilePicker = useCallback((slotIndex?: number) => {
    dropTarget.current = slotIndex ?? null;
    fileInputRef.current?.click();
  }, []);

  const removeFrame = useCallback((idx: number) => {
    const updated = [...images360];
    updated[idx] = '';
    onChange(updated);
  }, [images360, onChange]);

  const filledCount = images360.filter(Boolean).length;
  const is360Ready  = filledCount >= 18;

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-[rgba(201,168,76,0.25)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4
                   bg-[rgba(201,168,76,0.04)] hover:bg-[rgba(201,168,76,0.08)]
                   transition-colors duration-200 text-start"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔄</span>
          <div>
            <p className="text-white font-semibold text-sm">
              360° Photo Set
              <span className="ms-2 text-[10px] font-bold uppercase tracking-wider
                               px-2 py-0.5 rounded-md bg-[#c9a84c]/15 text-[#c9a84c]">
                Optional
              </span>
            </p>
            <p className="text-[var(--text-faint)] text-xs mt-0.5">
              {filledCount === 0
                ? 'Add 18–36 photos taken every 10° around the car'
                : is360Ready
                  ? `✓ ${filledCount} frames ready — 360° view enabled`
                  : `${filledCount}/18 frames uploaded — ${18 - filledCount} more needed`
              }
            </p>
          </div>
        </div>
        <span className="text-white/40 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-3 bg-[rgba(0,0,0,0.3)]">
          <p className="text-[var(--text-faint)] text-xs mb-4">
            Take photos every 10° around the car for a full 360° view. Start from the front-left
            and rotate clockwise. Minimum 18 photos required to enable the 360° viewer.
          </p>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 mb-4">
            {Array.from({ length: TOTAL_FRAMES }, (_, i) => {
              const url = images360[i];
              const angle = i * 10;
              return (
                <div key={i} className="relative aspect-square group">
                  {url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Frame ${i + 1} (${angle}°)`}
                        className="w-full h-full object-cover rounded-lg border border-[#c9a84c]/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeFrame(i)}
                        className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full
                                   bg-[#ef4444] text-white text-xs font-bold
                                   flex items-center justify-center
                                   opacity-0 group-hover:opacity-100 transition-opacity duration-150
                                   shadow-lg z-10"
                        aria-label={`Remove frame ${i + 1}`}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker(i)}
                      className="w-full h-full flex flex-col items-center justify-center gap-0.5
                                 rounded-lg border border-dashed border-[rgba(255,255,255,0.08)]
                                 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]
                                 hover:border-[#c9a84c]/30 transition-all duration-150 group/slot"
                      aria-label={`Upload frame ${i + 1} (${angle}°)`}
                    >
                      <span className="text-[8px] text-[var(--text-faint)] group-hover/slot:text-[#c9a84c]/60 font-bold tabular-nums">
                        {i + 1}
                      </span>
                      <span className="text-[7px] text-[var(--text-faint)]/50 tabular-nums">
                        {angle}°
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => openFilePicker()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                         bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)]
                         text-[#c9a84c] hover:bg-[rgba(201,168,76,0.18)] transition-all duration-200"
            >
              <span>📁</span> Upload multiple frames
            </button>
            {is360Ready && (
              <div className="flex items-center gap-2 text-xs text-[#4ade80]">
                <span>✓</span>
                <span>360° view ready — buyers can rotate the car</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
