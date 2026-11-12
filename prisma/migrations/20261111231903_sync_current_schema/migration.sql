-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "usedAt" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiConsentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolyricsConfig" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT '127.0.0.1',
    "port" INTEGER NOT NULL DEFAULT 8091,
    "pathPrefix" TEXT NOT NULL DEFAULT '/api/',
    "connectorUrl" TEXT,
    "connectorKey" TEXT,
    "baseUrl" TEXT,
    "secretEnc" TEXT NOT NULL DEFAULT '',
    "secret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "textBody" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,

    CONSTRAINT "HolyricsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Sermão',
    "type" TEXT NOT NULL DEFAULT 'SERMON',
    "ref" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Rascunho',
    "content" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "HolyricsConfig_churchId_key" ON "HolyricsConfig"("churchId");

-- CreateIndex
CREATE INDEX "Document_churchId_idx" ON "Document"("churchId");

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolyricsConfig" ADD CONSTRAINT "HolyricsConfig_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
