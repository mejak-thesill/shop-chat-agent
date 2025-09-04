-- Use public schema
CREATE SCHEMA IF NOT EXISTS "public";

-- ==========================
-- Table: Session
-- ==========================
CREATE TABLE IF NOT EXISTS "public"."Session" (
    "id" TEXT PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMPTZ,
    "accessToken" TEXT,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- ==========================
-- Table: CustomerToken
-- ==========================
CREATE TABLE IF NOT EXISTS "public"."CustomerToken" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_customerToken_conversationId"
ON "public"."CustomerToken" ("conversationId");

-- ==========================
-- Table: CodeVerifier
-- ==========================
CREATE TABLE IF NOT EXISTS "public"."CodeVerifier" (
    "id" TEXT PRIMARY KEY,
    "state" TEXT NOT NULL UNIQUE,
    "verifier" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_codeVerifier_state"
ON "public"."CodeVerifier" ("state");

-- ==========================
-- Table: Conversation
-- ==========================
CREATE TABLE IF NOT EXISTS "public"."Conversation" (
    "id" TEXT PRIMARY KEY,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================
-- Table: Message
-- ==========================
CREATE TABLE IF NOT EXISTS "public"."Message" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_message_conversation"
        FOREIGN KEY ("conversationId")
        REFERENCES "public"."Conversation" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_message_conversationId"
ON "public"."Message" ("conversationId");

-- ==========================
-- Table: CustomerAccountUrl
-- ==========================
CREATE TABLE IF NOT EXISTS "public"."CustomerAccountUrl" (
    "id" TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL UNIQUE,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);