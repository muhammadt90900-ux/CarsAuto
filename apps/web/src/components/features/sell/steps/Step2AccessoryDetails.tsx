'use client';
// apps/web/src/components/features/sell/steps/Step2AccessoryDetails.tsx
//
// F-QUALITY fix: extracted verbatim from SellCarForm.tsx's
// `{isAccessory && (...)}` block.
//
// Note: "Compatible brands/models" is NOT in this file even though it's
// accessory-related — the original renders that section once, shared
// between ACCESSORY *and* SERVICE (`{(isAccessory || isService) && ...}`).
// Splitting it into this component only would have silently dropped it for
// SERVICE listings, a real regression. It stays in Step2Details.tsx (the
// shared wrapper) instead — see that file's comment for the full reasoning.

import { SellFormField } from '../SellFormField';
import { inputCls, selectCls } from '../SellFormUI';
import type { UseSellFormReturn } from '../hooks/useSellForm';

interface Props {
  form: UseSellFormReturn;
}

export function Step2AccessoryDetails({ form }: Props) {
  const { values, set } = form;

  return (
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
  );
}
