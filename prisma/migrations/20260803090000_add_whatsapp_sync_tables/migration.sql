CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "phone" TEXT,
  "name" TEXT,
  "pushName" TEXT,
  "contactName" TEXT,
  "shortName" TEXT,
  "verifiedName" TEXT,
  "customName" TEXT,
  "profilePic" TEXT,
  "isGroup" BOOLEAN NOT NULL DEFAULT false,
  "isBusiness" BOOLEAN NOT NULL DEFAULT false,
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "lastMessage" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leadId" TEXT,
  "clientId" TEXT,
  "userId" TEXT,
  CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" TEXT NOT NULL,
  "remoteId" TEXT,
  "companyId" TEXT,
  "chatId" TEXT NOT NULL,
  "fromMe" BOOLEAN NOT NULL DEFAULT false,
  "senderJid" TEXT,
  "senderName" TEXT,
  "body" TEXT,
  "type" TEXT NOT NULL DEFAULT 'text',
  "mediaUrl" TEXT,
  "mediaMime" TEXT,
  "mediaFileName" TEXT,
  "mediaSize" INTEGER,
  "quotedId" TEXT,
  "quotedBody" TEXT,
  "ack" INTEGER NOT NULL DEFAULT 1,
  "reactions" JSONB,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "remoteId" TEXT;

CREATE INDEX IF NOT EXISTS "whatsapp_contacts_phone_idx" ON "whatsapp_contacts"("phone");
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_lastMessageAt_idx" ON "whatsapp_contacts"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_chatId_timestamp_idx" ON "whatsapp_messages"("chatId", "timestamp");
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_messages_chatId_remoteId_key" ON "whatsapp_messages"("chatId", "remoteId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_contacts_leadId_fkey'
  ) THEN
    ALTER TABLE "whatsapp_contacts"
      ADD CONSTRAINT "whatsapp_contacts_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_contacts_clientId_fkey'
  ) THEN
    ALTER TABLE "whatsapp_contacts"
      ADD CONSTRAINT "whatsapp_contacts_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_contacts_userId_fkey'
  ) THEN
    ALTER TABLE "whatsapp_contacts"
      ADD CONSTRAINT "whatsapp_contacts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_messages_chatId_fkey'
  ) THEN
    ALTER TABLE "whatsapp_messages"
      ADD CONSTRAINT "whatsapp_messages_chatId_fkey"
      FOREIGN KEY ("chatId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
