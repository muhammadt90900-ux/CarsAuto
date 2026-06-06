// packages/types/src/chat.ts

// ─── Enums ───────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'offer' | 'voice' | 'location' | 'listing-card';

/** Lifecycle of an outbound message from the sender's perspective */
export type MessageStatus =
  | 'pending'    // optimistically rendered, not yet ACKed by server
  | 'sent'       // server persisted, ACK received
  | 'delivered'  // server confirmed recipient is online and event was emitted
  | 'read'       // recipient explicitly sent a read receipt
  | 'failed';    // server rejected or timed-out

// ─── Core models ─────────────────────────────────────────────────────────────

export interface ReadReceipt {
  userId: string;
  readAt: string; // ISO-8601
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  /** From DB — the per-message read receipt rows */
  readReceipts?: ReadReceipt[];
  createdAt: string; // ISO-8601
  /** Client-only: optimistic status */
  status?: MessageStatus;
  /** Client-only: the client-generated id before server assigns a real id */
  tempId?: string;
}

export interface Chat {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessage?: Message;
  unreadCount: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ─── Socket.io event payloads ────────────────────────────────────────────────

/** Server → Client */
export interface SocketEvents {
  // Connection
  connected: { userId: string; serverTime: number };

  // Messages
  newMessage: Message & { status: 'delivered' };
  messageSent: Message & { tempId?: string; status: 'sent' };
  messageDelivered: { messageId: string; chatId: string; deliveredAt: string };
  messageError: { tempId?: string; error: string };
  missedMessages: { chatId: string; messages: Message[] };

  // Read receipts
  messagesRead: { chatId: string; readBy: string; readAt: string; messageIds: string[] | null };
  markReadAck: { chatId: string; readAt: string };

  // Typing
  userTyping: { userId: string; chatId: string; startedAt: number };
  userStoppedTyping: { userId: string; chatId: string };

  // Presence
  userJoined: { userId: string; chatId: string };
  userOnline: { userId: string };
  userOffline: { userId: string; lastSeen: string };
  presenceSync: { chatId: string; onlineUsers: string[] };

  // Notifications
  notification: unknown;
}

/** Client → Server */
export interface ClientEvents {
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendMessage: (data: {
    chatId: string;
    content: string;
    type?: MessageType;
    tempId?: string;
  }) => void;
  typing: (data: { chatId: string }) => void;
  stopTyping: (data: { chatId: string }) => void;
  markRead: (data: { chatId: string; messageIds?: string[] }) => void;
  getOnlineStatus: (userIds: string[]) => void;
  catchUp: (data: { chatId: string; since: string }) => void;
}
