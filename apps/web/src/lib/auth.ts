// apps/web/src/lib/auth.ts
// Server-side auth helpers.
// requireAdmin() is a placeholder — admin access is currently enforced
// client-side via AdminLayout until server-side cookie handling is fixed.

export async function requireAdmin(): Promise<void> {
  // TODO: verify admin session server-side via HttpOnly cookie
  // For now, admin guard is handled client-side in AdminLayout.tsx
}
