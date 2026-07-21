import type { Metadata } from 'next';
import OfflineClient from './OfflineClient';

export const metadata: Metadata = {
  title: 'Offline — CarsAuto',
  robots: { index: false },
};

export default function OfflinePage() {
  return <OfflineClient />;
}