'use client';
// apps/web/src/components/features/sell/steps/Step1BasicInfo.tsx
//
// F-QUALITY fix: extracted from SellCarForm.tsx's `step === 1` block.
// No behaviour changed — same fields, same validation hookup, same markup.

import { SellFormField } from '../SellFormField';
import { StepHeading, inputCls, selectCls } from '../SellFormUI';
import type { UseSellFormReturn, ListingTypeValue } from '../hooks/useSellForm';

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

const CURRENCIES = ['USD', 'IQD', 'EUR'];

interface Step1Props {
  form: UseSellFormReturn;
}

export function Step1BasicInfo({ form }: Step1Props) {
  const { values, setValues, errors, setErrors, set, isVehicle, isService } = form;

  return (
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
  );
}
