// apps/web/src/lib/validation/auth.schema.ts
//
// zod schemas for the auth forms, migrated 1:1 from the manual
// useState + handleSubmit validation that used to live in each component.
//
// IMPORTANT — read before touching these:
// Every form's <form> tag has `noValidate`, which means the browser's
// native `required` / `minLength` / `maxLength` / `type="email"` checks
// were NEVER actually enforced — they were purely visual/semantic HTML.
// The only validation that ever *ran* was the JS inside each handleSubmit.
// Below, each schema is commented to say which rules came from real JS
// checks (must be preserved exactly) vs. which came from inert HTML
// attributes (now made to actually work, since that's the point of this
// migration — see the PROMPT 2 report for the full list).

import { z } from 'zod';

// ── Login ────────────────────────────────────────────────────────────────
// Original LoginForm.handleSubmit had ZERO client-side checks — it called
// login(email, password) unconditionally and let the server reject bad
// credentials. Preserved exactly: no constraints here either.
export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

// ── Register ─────────────────────────────────────────────────────────────
// JS-enforced today (must match exactly):
//   - password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
//   - agreed must be true
// HTML-declared but previously inert (required name/email, name
// minLength=2/maxLength=80, type="email"): now enforced via zod, since
// this migration is exactly what's meant to make them work.
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must be at most 80 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Password must be at least 8 characters with uppercase, lowercase, and a number.',
    ),
  phone: z.string().optional(),
  role: z.enum(['BUYER', 'DEALER']),
  agreed: z.boolean().refine((v) => v === true, {
    message: 'Please accept the terms to continue.',
  }),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Forgot password ─────────────────────────────────────────────────────
// Original only checked `!email.trim()` — no format check ran (native
// type="email" was inert due to noValidate). Preserved exactly: presence
// only, no .email() format rule.
export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Please enter your email address.'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ── Reset password ───────────────────────────────────────────────────────
// JS-enforced today: password must satisfy all 4 rules (>=8 chars, upper,
// lower, digit) and confirmPassword must match. Same 4 conditions as
// Register's regex, just expressed as separate rules in the original UI
// checklist — reproduced the same way here for identical error messages.
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password does not meet requirements.')
      .regex(/[A-Z]/, 'Password does not meet requirements.')
      .regex(/[a-z]/, 'Password does not meet requirements.')
      .regex(/\d/, 'Password does not meet requirements.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
