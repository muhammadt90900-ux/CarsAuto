// apps/api/src/common/utils/referral-code.util.ts
//
// Shared "CA-XXXXXX" referral code generator. Originally hand-written inside
// beta.service.ts for BetaRegistration.referralId; extracted here so the
// Dealer/Seller Referral & Rewards System (Dealer.referralCode) can reuse the
// exact same format/charset instead of a second copy-pasted implementation.
// BetaService now delegates to this too (see beta.service.ts).

import * as crypto from 'crypto';

// Excludes visually ambiguous characters (0/O, 1/I/L) so codes are easy to
// read aloud over the phone and type correctly from a screenshot.
const REFERRAL_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REFERRAL_CODE_LENGTH = 6;
const MAX_REFERRAL_CODE_ATTEMPTS = 8;

export function generateReferralCode(): string {
  const bytes = crypto.randomBytes(REFERRAL_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CHARSET[bytes[i] % REFERRAL_CHARSET.length];
  }
  return `CA-${code}`;
}

/**
 * Generates a referral code and retries against a caller-supplied
 * existence-check until a free one is found (or falls back to a
 * guaranteed-unique randomUUID-derived code after MAX_REFERRAL_CODE_ATTEMPTS —
 * astronomically unlikely with a 32^6 keyspace, but never loop forever).
 */
export async function generateUniqueReferralCode(
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_REFERRAL_CODE_ATTEMPTS; attempt++) {
    const candidate = generateReferralCode();
    if (!(await exists(candidate))) return candidate;
  }
  return `CA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
