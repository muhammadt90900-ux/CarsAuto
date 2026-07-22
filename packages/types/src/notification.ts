// packages/types/src/notification.ts

export type NotificationType =
  | 'listing-approved'
  | 'listing-rejected'
  | 'new-message'
  | 'new-offer'
  | 'price-drop'
  | 'subscription-expiring'
  | 'dealer-follow'
  | 'system'
  // ADDED (Referral & Rewards System) — matches the uppercase literals
  // AuthService/NotificationsService write server-side (Notification.type
  // is a free-form string column; the frontend union just needs to stay in
  // sync for display purposes).
  | 'REFERRAL_QUALIFIED'
  | 'REFERRAL_REWARD_PREMIUM'
  | 'REFERRAL_BADGE_EARNED';

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
