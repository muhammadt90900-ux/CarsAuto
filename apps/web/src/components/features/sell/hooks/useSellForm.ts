// apps/web/src/components/features/sell/hooks/useSellForm.ts
//
// F-QUALITY fix: extracted from SellCarForm.tsx (was a 1,431-line God
// Component). This hook owns every useState/useEffect/useCallback the form
// needs — draft autosave/restore, validation, and the submit handler — so
// SellCarForm.tsx itself can shrink down to step orchestration only.
// No business logic changed here, only moved.

import { useState, useCallback, useEffect, ChangeEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { sellApi, type CreateListingPayload, type VehicleSpec, type SparePartSpec } from '@/lib/sell-api';

// ── Type helpers ──────────────────────────────────────────────────────────────
export type ListingTypeValue = 'CAR' | 'MOTORCYCLE' | 'SPARE_PART' | 'ACCESSORY' | 'SERVICE';

export const VEHICLE_TYPES   = new Set<ListingTypeValue>(['CAR', 'MOTORCYCLE', 'SPARE_PART']);
export const ACCESSORY_TYPES = new Set<ListingTypeValue>(['ACCESSORY', 'SERVICE']);

// ── Draft auto-save (Feature: Save Draft) ───────────────────────────────────
const DRAFT_KEY = 'carsauto_sell_draft';

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

export interface FormErrors {
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

export function validate(values: FormValues): FormErrors {
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

const INITIAL_VALUES: FormValues = {
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
};

export function useSellForm(user: { id: string } | null | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep]     = useState(1);
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSaved,  setDraftSaved]  = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

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

  const toggleDay = useCallback((day: string) => {
    setValues((v) => ({
      ...v,
      availableDays: v.availableDays.includes(day)
        ? v.availableDays.filter((d) => d !== day)
        : [...v.availableDays, day],
    }));
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
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
  }, [step, values]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
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
  }, [values, user, queryClient, clearDraft, router]);

  // Derived type flags — used throughout the step components to decide what to render.
  const isVehicle   = VEHICLE_TYPES.has(values.type);
  const isAccessory = values.type === 'ACCESSORY';
  const isService   = values.type === 'SERVICE';
  const isCar       = values.type === 'CAR';
  const isMoto      = values.type === 'MOTORCYCLE';
  const isSparePart = values.type === 'SPARE_PART';

  return {
    step, setStep, goNext, goBack,
    values, setValues, set,
    errors, setErrors,
    submitting, submitError,
    draftSaved, draftRestored, saveDraftNow,
    setImages, setImages360, toggleDay,
    handleSubmit,
    isVehicle, isAccessory, isService, isCar, isMoto, isSparePart,
  };
}

export type UseSellFormReturn = ReturnType<typeof useSellForm>;
