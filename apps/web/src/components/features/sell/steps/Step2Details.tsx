'use client';
// apps/web/src/components/features/sell/steps/Step2Details.tsx
//
// F-QUALITY fix: this file isn't one of the explicitly-named extraction
// targets, but is necessary glue. In the original, several sections of
// `step === 2` are shared across MULTIPLE listing types rather than owned
// by exactly one:
//   - Description (English/Kurdish): every type
//   - Compatible Vehicles: ACCESSORY *and* SERVICE together
//   - Location & Contact: every type
//   - Preview box: every type
// Splitting strictly into "one component per type" would have meant either
// duplicating these sections into multiple files (real risk of the copies
// drifting apart over time) or dropping them for some types entirely (a
// regression — see Step2AccessoryDetails.tsx's header comment for a
// concrete example of how that almost happened with Compatible Vehicles).
// This wrapper renders the shared sections directly and delegates only the
// genuinely type-specific parts to Step2VehicleDetails / Step2AccessoryDetails /
// Step2ServiceDetails.

import { SellFormField } from '../SellFormField';
import { StepHeading, CharCount, textareaCls, selectCls, inputCls, COLOR_SWATCH } from '../SellFormUI';
import { Step2VehicleDetails } from './Step2VehicleDetails';
import { Step2AccessoryDetails } from './Step2AccessoryDetails';
import { Step2ServiceDetails } from './Step2ServiceDetails';
import type { UseSellFormReturn } from '../hooks/useSellForm';

const CITY_GROUPS: { group: string; groupKu: string; cities: string[] }[] = [
  { group: 'Kurdistan', groupKu: 'کوردستان', cities: ['Erbil', 'Sulaymaniyah', 'Duhok', 'Halabja', 'Zakho'] },
  { group: 'Iraq',      groupKu: 'عێراق',    cities: ['Baghdad', 'Basra', 'Mosul', 'Kirkuk', 'Najaf', 'Karbala'] },
  { group: 'UAE',       groupKu: 'ئیمارات',  cities: ['Dubai', 'Abu Dhabi', 'Sharjah'] },
];

interface Props {
  form: UseSellFormReturn;
}

export function Step2Details({ form }: Props) {
  const { values, set, isCar, isMoto, isSparePart, isAccessory, isService } = form;
  const isVehicleSpecific = isCar || isMoto || isSparePart;

  return (
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

      {isVehicleSpecific && <Step2VehicleDetails form={form} />}
      {isAccessory && <Step2AccessoryDetails form={form} />}
      {isService && <Step2ServiceDetails form={form} />}

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
  );
}
