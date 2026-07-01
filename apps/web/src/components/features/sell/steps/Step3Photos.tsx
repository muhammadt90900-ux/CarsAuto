'use client';
// apps/web/src/components/features/sell/steps/Step3Photos.tsx
//
// F-QUALITY fix: extracted verbatim from SellCarForm.tsx's `step === 3` block.

import { ImageUploadGrid } from '../ImageUploadGrid';
import { StepHeading, Upload360Section } from '../SellFormUI';
import type { UseSellFormReturn } from '../hooks/useSellForm';

interface Props {
  form: UseSellFormReturn;
}

export function Step3Photos({ form }: Props) {
  const { values, errors, setImages, setImages360, submitError } = form;

  return (
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
  );
}
