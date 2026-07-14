// apps/web/src/app/[locale]/dashboard/layout.tsx
// Server component wrapper — its only job is to export metadata (robots:
// noindex, since dashboard pages are private/per-user and were previously
// crawlable with no signal telling search engines not to index them) and
// hand off to the real client-side layout (DashboardLayoutClient.tsx),
// which owns the sidebar/nav/role-routing logic and needs 'use client'.
import type { Metadata } from 'next';
import { DashboardLayoutClient } from './DashboardLayoutClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
