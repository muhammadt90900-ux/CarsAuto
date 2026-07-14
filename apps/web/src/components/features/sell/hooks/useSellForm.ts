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

// ── Edit mode: map an existing listing back into FormValues ────────────────
// Used by the /dashboard/listings/[id]/edit page to pre-fill the form.
//
// Caveat worth knowing: the Brand/Model fields in Step 2 are plain <select>
// dropdowns sourced from a small hardcoded local list (getModelsByMake),
// while the backend's real vehicleSpec.brand/model are relations to the
// CarMake/CarModel tables (id + multilingual names) — a pre-existing
// mismatch between the create flow and the real data model, not something
// introduced here. We map the relation's English name back into the
// brand/model text fields as the closest available match; if a listing's
// real brand isn't in the local hardcoded list, the seller will need to
// re-pick it from the dropdown when editing. Everything else (title,
// price, description, photos, spec numbers, location, contact) maps
// cleanly since those are plain scalar fields both sides agree on.
export function listingToFormValues(listing: any): FormValues {
  const vs = listing.vehicleSpec ?? {};
  const as = listing.accessorySpec ?? {};
  const sp = listing.sparePartSpec ?? {};
  const images = (listing.images ?? []).filter((img: any) => (img.tag ?? 'standard') !== '360_view').map((img: any) => img.url);
  const images360 = (listing.images ?? []).filter((img: any) => img.tag === '360_view').map((img: any) => img.url);

  return {
    ...INITIAL_VALUES,
    titleEn: listing.title?.en ?? listing.titleEn ?? '',
    titleKu: listing.title?.ku ?? listing.titleKu ?? '',
    titleAr: listing.title?.ar ?? listing.titleAr ?? '',
    price: listing.price != null ? String(listing.price) : '',
    currency: listing.currency ?? 'USD',
    type: listing.type ?? 'CAR',
    negotiable: !!listing.negotiable,
    descriptionEn: listing.description?.en ?? listing.descriptionEn ?? '',
    descriptionKu: listing.description?.ku ?? listing.descriptionKu ?? '',
    images,
    images360,
    condition: listing.condition ?? '',
    // Accessory — defensive against both `accessorySpec.field` (nested,
    // per the Prisma include the backend uses) and a flat `listing.field`
    // (per the AccessoryListing TS type, which doesn't declare the nested
    // shape) — checking both means this works whichever shape the real
    // response turns out to be.
    accBrand: as.brand ?? listing.brand ?? '',
    accModel: as.model ?? listing.model ?? '',
    accCondition: as.condition ?? listing.condition ?? '',
    accColor: as.color ?? listing.color ?? '',
    accMaterial: as.material ?? listing.material ?? '',
    accWeight: (as.weight ?? listing.weight) != null ? String(as.weight ?? listing.weight) : '',
    accDimensions: as.dimensions ?? listing.dimensions ?? '',
    compatibleBrands: (as.compatibleBrands ?? listing.compatibleBrands ?? []).join(', '),
    compatibleModels: (as.compatibleModels ?? listing.compatibleModels ?? []).join(', '),
    // Service — same defensive nested-or-flat handling as accessory above.
    serviceType: as.serviceType ?? listing.serviceType ?? '',
    duration: (as.duration ?? listing.duration) != null ? String(as.duration ?? listing.duration) : '',
    mobile: !!(as.mobile ?? listing.mobile),
    warranty: (as.warranty ?? listing.warranty) != null ? String(as.warranty ?? listing.warranty) : '',
    availableDays: as.availableDays ?? listing.availableDays ?? [],
    // Vehicle — see brand/model caveat above
    brand: vs.brand?.nameEn ?? vs.brand ?? '',
    model: vs.model?.nameEn ?? vs.model ?? '',
    year: vs.year != null ? String(vs.year) : (listing.year != null ? String(listing.year) : ''),
    mileage: vs.mileageKm != null ? String(vs.mileageKm) : ((vs.mileage ?? listing.mileage) != null ? String(vs.mileage ?? listing.mileage) : ''),
    vColor: vs.color ?? listing.color ?? '',
    fuelType: vs.fuelType ?? listing.fuelType ?? '',
    transmission: vs.transmission ?? listing.transmission ?? '',
    engineCC: (vs.engineCC ?? listing.engineSize ?? listing.engineCC) != null ? String(vs.engineCC ?? listing.engineSize ?? listing.engineCC) : '',
    bodyType: vs.bodyType ?? listing.bodyType ?? '',
    driveType: vs.drivetrain ?? vs.driveType ?? listing.driveType ?? '',
    doors: (vs.doors ?? listing.doors) != null ? String(vs.doors ?? listing.doors) : '',
    motoType: vs.motoType ?? listing.motoType ?? '',
    // Spare part — SparePartListing's real fields are `partNumber`,
    // `condition`, and `compatibleMakes` (array), not the `sp.partCategory`/
    // `sp.compatibleBrand` shape assumed below; checked defensively.
    partCategory: sp.partCategory ?? listing.categoryId ?? '',
    partNumber: sp.partNumber ?? listing.partNumber ?? '',
    partCondition: sp.condition ?? listing.condition ?? '',
    compatibleBrand: sp.compatibleBrand ?? (Array.isArray(listing.compatibleMakes) ? listing.compatibleMakes.join(', ') : ''),
    // Location & contact
    city: listing.location?.city ?? listing.city ?? '',
    district: listing.location?.district ?? listing.district ?? '',
    contactPhone: listing.contactPhone ?? listing.user?.phone ?? '',
    contactWhatsapp: listing.contactWhatsapp ?? '',
  };
}

export function useSellForm(user: { id: string } | null | undefined, editListing?: any) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep]     = useState(1);
  const [values, setValues] = useState<FormValues>(() =>
    editListing ? listingToFormValues(editListing) : INITIAL_VALUES
  );
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSaved,  setDraftSaved]  = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const isEditMode = !!editListing;

  // ── Draft auto-save (Feature: Save Draft) ─────────────────────────────────
  // Restore a saved draft on mount. Image URLs are intentionally NOT restored —
  // blob: URLs created via URL.createObjectURL() die on reload and CDN URLs
  // would resurrect orphaned uploads, so photos must always be re-added.
  //
  // Skipped entirely in edit mode: the form is already pre-filled from the
  // real listing being edited, and restoring an unrelated "new listing"
  // draft on top of that would silently clobber the seller's existing data.
  useEffect(() => {
    if (typeof window === 'undefined' || isEditMode) return;
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
  // Skipped in edit mode for the same reason as the restore above.
  useEffect(() => {
    if (typeof window === 'undefined' || isEditMode) return;
    const { images, images360, ...draftable } = values;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftable));
  }, [values, isEditMode]);

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
        // Feature: 360° Photo Set — merge values.images360 into the payload,
        // tagged '360_view', alongside the standard images.
        images: [
          ...values.images.map((url) => ({ url, tag: 'standard' as const })),
          ...values.images360.map((url) => ({ url, tag: '360_view' as const })),
        ],
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

      const listing = isEditMode
        ? await sellApi.updateListing(editListing.id, payload)
        : await sellApi.createListing(payload);
      await queryClient.invalidateQueries({ queryKey: queryKeys.listings.all });
      if (!isEditMode) clearDraft();
      router.push(isEditMode ? `/dashboard/listings` : `/cars/${listing.id}`);
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
  }, [values, user, queryClient, clearDraft, router, isEditMode, editListing]);

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
    isEditMode,
  };
}

export type UseSellFormReturn = ReturnType<typeof useSellForm>;
