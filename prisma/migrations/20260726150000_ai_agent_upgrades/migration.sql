-- AI agent upgrades: memoria larga (summary) y favoritos en conversaciones del asistente

-- AlterTable
ALTER TABLE "AiConversation" ADD COLUMN IF NOT EXISTS "summary" TEXT;

-- AlterTable
ALTER TABLE "AiConversation" ADD COLUMN IF NOT EXISTS "favorite" BOOLEAN NOT NULL DEFAULT false;
