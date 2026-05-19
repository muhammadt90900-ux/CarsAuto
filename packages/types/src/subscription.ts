// packages/types/src/subscription.ts
export enum SubscriptionPlan {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  DEALER = 'DEALER',
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
}
