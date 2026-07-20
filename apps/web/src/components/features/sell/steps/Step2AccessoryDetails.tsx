'use client';
// apps/web/src/components/features/sell/steps/Step2AccessoryDetails.tsx
//
// F-QUALITY fix: extracted verbatim from SellCarForm.tsx's
// `{isAccessory && (...)}` block. Covers only the ACCESSORY-specific
// fields (accBrand/accModel/accCondition/accColor/accMaterial/accWeight/
// accDimensions). "Compatible Vehicles" (compatibleBrands/compatibleModels)
// is shared between ACCESSORY *and* SERVICE, so it is NOT duplicated here —
// it's rendered once by the parent, Step2Details.tsx, for both types.
// Duplicating it into this file too would have meant two independent copies
// silently drifting apart over time; dropping it from here entirely is the
// correct move since the parent already covers it.

import { SellFormField } from '../SellFormField';
import { inputCls, selectCls } from '../SellFormUI';
import type { UseSellFormReturn } from '../hooks/useSellForm';

const ACC_CONDITIONS = [
  { value: 'NEW',  labelKu: 'نوێ',        labelAr: 'جديد' },
  { value: 'USED', labelKu: 'بەکارهاتوو', labelAr: 'مستعمل' },
];

const ACC_COLORS = [
  { value: 'White',  labelKu: 'سپی' },
  { value: 'Black',  labelKu: 'ڕەش' },
  { value: 'Silver', labelKu: 'زیوین' },
  { value: 'Red',    labelKu: 'سور' },
  { value: 'Blue',   labelKu: 'شین' },
  { value: 'Grey',   labelKu: 'خۆڵەمێشی' },
  { value: 'Brown',  labelKu: 'قاوەیی' },
  { value: 'Other',  labelKu: 'هیتر' },
];

interface Props {
  form: UseSellFormReturn;
}

export function Step2AccessoryDetails({ form }: Props) {
  const { values, set } = form;

  return (
    <>
      <div className="h-px bg-[rgba(255,255,255,0.06)]" />
      <p className="text-[var(--gold)] text-xs font-semibold uppercase tracking-widest" dir="auto">
        🎁 زانیاری ئامرازەکان · Accessory Details
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SellFormField label="Brand / مارکە" optional>
          <input type="text" dir="auto" placeholder="e.g. Thule"
            value={values.accBrand} onChange={set('accBrand')} maxLength={100}
            className={inputCls(false)} />
        </SellFormField>
        <SellFormField label="Model / مۆدێل" optional>
          <input type="text" dir="auto" placeholder="e.g. WingBar Edge"
            value={values.accModel} onChange={set('accModel')} maxLength={100}
            className={inputCls(false)} />
        </SellFormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SellFormField label="Condition / حاڵەت" optional>
          <select dir="auto" value={values.accCondition} onChange={set('accCondition')} className={selectCls(false)}>
            <option value="">هەڵبژێرە / اختر / Select</option>
            {ACC_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.value} / {c.labelKu}</option>)}
          </select>
        </SellFormField>
        <SellFormField label="Color / ڕەنگ" optional>
          <select dir="auto" value={values.accColor} onChange={set('accColor')} className={selectCls(false)}>
            <option value="">هەڵبژێرە / اختر / Select</option>
            {ACC_COLORS.map((c) => <option key={c.value} value={c.value}>{c.value} / {c.labelKu}</option>)}
          </select>
        </SellFormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SellFormField label="Material / کەرەستە" optional>
          <input type="text" dir="auto" placeholder="e.g. Aluminum, Leather"
            value={values.accMaterial} onChange={set('accMaterial')} maxLength={100}
            className={inputCls(false)} />
        </SellFormField>
        <SellFormField label="Weight (kg) / کێش" optional>
          <input type="number" dir="auto" placeholder="0" min="0" step="0.1"
            value={values.accWeight} onChange={set('accWeight')}
            className={inputCls(false)} />
        </SellFormField>
      </div>

      <SellFormField label="Dimensions / قەبارە" optional>
        <input type="text" dir="auto" placeholder="e.g. 120 x 30 x 15 cm"
          value={values.accDimensions} onChange={set('accDimensions')} maxLength={100}
          className={inputCls(false)} />
      </SellFormField>
    </>
  );
}