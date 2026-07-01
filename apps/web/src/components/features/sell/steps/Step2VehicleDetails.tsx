'use client';
// apps/web/src/components/features/sell/steps/Step2VehicleDetails.tsx
//
// F-QUALITY fix: extracted verbatim from SellCarForm.tsx's
// `{(isCar || isMoto || isSparePart) && (...)}` block. Covers CAR,
// MOTORCYCLE, and SPARE_PART together — exactly as grouped in the original
// (SPARE_PART is a "vehicle type" alongside CAR/MOTORCYCLE in VEHICLE_TYPES,
// see hooks/useSellForm.ts).

import type { VehicleSpec, SparePartSpec } from '@/lib/sell-api';
import { CAR_MAKES, getModelsByMake } from '@/data/carData';
import { SellFormField } from '../SellFormField';
import { inputCls, selectCls } from '../SellFormUI';
import type { UseSellFormReturn } from '../hooks/useSellForm';

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

interface Props {
  form: UseSellFormReturn;
}

export function Step2VehicleDetails({ form }: Props) {
  const { values, setValues, errors, setErrors, set, isCar, isMoto, isSparePart } = form;

  return (
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
  );
}
