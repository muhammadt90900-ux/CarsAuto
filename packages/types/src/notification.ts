// packages/types/src/notification.ts

export type NotificationType =
  | 'listing-approved'
  | 'listing-rejected'
  | 'new-message'
  | 'new-offer'
  | 'price-drop'
  | 'subscription-expiring'
  | 'dealer-follow'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  /** Type-specific payload, e.g. { listingId } or { chatId } for deep-linking. */
  data?: Record<string, unknown>;
}
