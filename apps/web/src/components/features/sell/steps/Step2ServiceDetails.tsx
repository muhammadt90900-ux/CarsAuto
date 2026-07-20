'use client';
// apps/web/src/components/features/sell/steps/Step2ServiceDetails.tsx
//
// F-QUALITY fix: extracted verbatim from SellCarForm.tsx's
// `{isService && (...)}` block. Service type itself is selected back in
// Step1BasicInfo.tsx (alongside Condition) — it was never part of this
// block in the original, so it isn't duplicated here either.

import { SellFormField } from '../SellFormField';
import { inputCls } from '../SellFormUI';
import type { UseSellFormReturn } from '../hooks/useSellForm';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
  mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th',
  fri: 'Fr', sat: 'Sa', sun: 'Su',
};

interface Props {
  form: UseSellFormReturn;
}

export function Step2ServiceDetails({ form }: Props) {
  const { values, setValues, set, toggleDay } = form;

  return (
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
            <span className={`absolute top-0.5 start-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
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
  );
}
