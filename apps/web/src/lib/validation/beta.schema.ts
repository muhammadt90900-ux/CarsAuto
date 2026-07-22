// apps/web/src/lib/validation/beta.schema.ts
//
// Mirrors apps/api/src/modules/beta/dto/register-beta.dto.ts exactly, so a
// submission that passes client-side validation never bounces off the
// server's rules unexpectedly.

import { z } from 'zod';
import { ListingType } from '@cars-auto/types';

// Same phone pattern as the backend DTO (and lib/validation/auth.schema.ts's
// register form) — accepts +/digits/spaces/dashes/parens and Eastern
// Arabic-Indic digits.
const PHONE_REGEX = /^[+\d\s\-()\u0660-\u0669]{7,20}$/;
const URL_MESSAGE = 'Please enter a valid URL';

const optionalUrl = z
  .string()
  .trim()
  .max(255)
  .optional()
  .refine((v) => !v || /^https?:\/\/.+/.test(v), URL_MESSAGE);

export const betaRegistrationSchema = z.object({
  dealerName: z.string().trim().min(2, 'Please enter at least 2 characters').max(150),
  ownerName: z.string().trim().min(2, 'Please enter at least 2 characters').max(150),
  phone: z
    .string()
    .trim()
    .min(1, 'This field is required')
    .regex(PHONE_REGEX, 'Please enter a valid phone number'),
  city: z.string().trim().min(1, 'This field is required'),
  businessType: z.nativeEnum(ListingType, { errorMap: () => ({ message: 'This field is required' }) }),
  facebookUrl: optionalUrl,
  website: optionalUrl,
  notes: z.string().trim().max(1000).optional(),
  betaAcknowledged: z
    .boolean()
    .refine((v) => v === true, {
      message: 'Please confirm you understand CarsAuto is currently in Beta',
    }),
});

export type BetaRegistrationFormValues = z.infer<typeof betaRegistrationSchema>;
