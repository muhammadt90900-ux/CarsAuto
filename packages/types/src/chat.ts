// packages/types/src/chat.ts
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'location' | 'listing-card';
  mediaUrl?: string;
  readAt?: Date;
  createdAt: Date;
}

export interface Chat {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessage?: Message;
  status: 'active' | 'archived';
  createdAt: Date;
}
