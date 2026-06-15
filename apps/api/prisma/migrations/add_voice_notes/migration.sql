-- Migration: add_voice_notes
-- Adds voice note support fields to the messages table.
-- Run: npx prisma migrate dev --name add_voice_notes

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "messageType"   VARCHAR(20)  NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS "audioUrl"      VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "audioDuration" INTEGER;

-- Index: fast lookup of voice messages per chat (e.g. voice-note history view)
CREATE INDEX IF NOT EXISTS "messages_messageType_chatId_idx"
  ON "messages" ("messageType", "chatId");

-- NOTE: The existing `type` column remains unchanged (kept for backward compat).
-- New code writes `messageType`; legacy code that wrote `type` still works.
