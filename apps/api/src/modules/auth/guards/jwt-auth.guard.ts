// F10 fix: This duplicate file is intentionally replaced with a re-export.
// The canonical JwtAuthGuard lives at:
//   src/common/guards/jwt-auth.guard.ts
//
// All new imports should use the canonical path directly.
// This re-export exists only to avoid breaking any existing imports
// until they are migrated; it can be deleted once all imports are updated.

export { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
