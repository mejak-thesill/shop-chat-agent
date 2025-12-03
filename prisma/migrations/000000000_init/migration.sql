-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" INTEGER,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerToken" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeVerifier" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeVerifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAccountUrl" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAccountUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantCart" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantCartItem" (
    "id" TEXT NOT NULL,
    "assistantCartId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantOrderAttribution" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "checkoutToken" TEXT,
    "totalAttributed" DOUBLE PRECISION NOT NULL,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantOrderAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantOrderItemAttribution" (
    "id" TEXT NOT NULL,
    "orderAttrId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "linePrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantOrderItemAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "conversationId" TEXT,
    "productVariantId" TEXT,
    "quantity" INTEGER,
    "checkoutUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" JSONB,

    CONSTRAINT "AssistantEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerToken_conversationId_idx" ON "CustomerToken"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeVerifier_state_key" ON "CodeVerifier"("state");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccountUrl_conversationId_key" ON "CustomerAccountUrl"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantCart_cartId_key" ON "AssistantCart"("cartId");

-- CreateIndex
CREATE INDEX "AssistantCartItem_assistantCartId_idx" ON "AssistantCartItem"("assistantCartId");

-- CreateIndex
CREATE INDEX "AssistantCartItem_productVariantId_idx" ON "AssistantCartItem"("productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantOrderAttribution_orderId_key" ON "AssistantOrderAttribution"("orderId");

-- CreateIndex
CREATE INDEX "AssistantOrderItemAttribution_orderAttrId_idx" ON "AssistantOrderItemAttribution"("orderAttrId");

-- CreateIndex
CREATE INDEX "AssistantOrderItemAttribution_productVariantId_idx" ON "AssistantOrderItemAttribution"("productVariantId");

-- CreateIndex
CREATE INDEX "AssistantEvent_eventType_idx" ON "AssistantEvent"("eventType");

-- CreateIndex
CREATE INDEX "AssistantEvent_conversationId_idx" ON "AssistantEvent"("conversationId");

-- CreateIndex
CREATE INDEX "AssistantEvent_productVariantId_idx" ON "AssistantEvent"("productVariantId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantCartItem" ADD CONSTRAINT "AssistantCartItem_assistantCartId_fkey" FOREIGN KEY ("assistantCartId") REFERENCES "AssistantCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantOrderItemAttribution" ADD CONSTRAINT "AssistantOrderItemAttribution_orderAttrId_fkey" FOREIGN KEY ("orderAttrId") REFERENCES "AssistantOrderAttribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

