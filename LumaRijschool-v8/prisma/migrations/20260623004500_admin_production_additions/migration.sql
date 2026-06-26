-- Backward-compatible admin production additions.
-- All changes are additive and preserve existing rows/data.

ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Topic_isPublished_idx" ON "Topic"("isPublished");

ALTER TABLE "LessonRating" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LessonRating" ADD COLUMN IF NOT EXISTS "isVisible" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "LessonRating_status_idx" ON "LessonRating"("status");

ALTER TABLE "TrafficSign" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TrafficSign" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "TrafficSign_isPublished_idx" ON "TrafficSign"("isPublished");

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "checksum" TEXT;
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "BackupRecord" ADD COLUMN IF NOT EXISTS "restoredAt" TIMESTAMP(3);

ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ISSUED';
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AdminVideo" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "youtubeUrl" TEXT,
  "mp4Url" TEXT,
  "thumbnailUrl" TEXT,
  "durationSec" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminVideo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminVideo_isPublished_idx" ON "AdminVideo"("isPublished");
CREATE INDEX IF NOT EXISTS "AdminVideo_createdAt_idx" ON "AdminVideo"("createdAt");

CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "userId" TEXT,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EmailLog_audience_idx" ON "EmailLog"("audience");
CREATE INDEX IF NOT EXISTS "EmailLog_userId_idx" ON "EmailLog"("userId");
CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_slug_key" ON "EmailTemplate"("slug");
CREATE INDEX IF NOT EXISTS "EmailTemplate_isActive_idx" ON "EmailTemplate"("isActive");

CREATE TABLE IF NOT EXISTS "SupportTicketAttachment" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "replyId" TEXT,
  "userId" TEXT,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_ticketId_idx" ON "SupportTicketAttachment"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_replyId_idx" ON "SupportTicketAttachment"("replyId");
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_userId_idx" ON "SupportTicketAttachment"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicketAttachment_ticketId_fkey'
  ) THEN
    ALTER TABLE "SupportTicketAttachment"
      ADD CONSTRAINT "SupportTicketAttachment_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicketAttachment_replyId_fkey'
  ) THEN
    ALTER TABLE "SupportTicketAttachment"
      ADD CONSTRAINT "SupportTicketAttachment_replyId_fkey"
      FOREIGN KEY ("replyId") REFERENCES "SupportTicketReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicketAttachment_userId_fkey'
  ) THEN
    ALTER TABLE "SupportTicketAttachment"
      ADD CONSTRAINT "SupportTicketAttachment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
