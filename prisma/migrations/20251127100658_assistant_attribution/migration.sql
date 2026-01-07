/*
  Warnings:

  - You are about to alter the column `userId` on the `Session` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - Made the column `accessToken` on table `Session` required. This step will fail if there are existing NULL values in that column.
  - Made the column `collaborator` on table `Session` required. This step will fail if there are existing NULL values in that column.
  - Made the column `emailVerified` on table `Session` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "idx_codeVerifier_state";

-- AlterTable
ALTER TABLE "CodeVerifier" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CustomerAccountUrl" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CustomerToken" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "expires" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "accessToken" SET NOT NULL,
ALTER COLUMN "userId" SET DATA TYPE INTEGER,
ALTER COLUMN "collaborator" SET NOT NULL,
ALTER COLUMN "emailVerified" SET NOT NULL;

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

-- RenameForeignKey
ALTER TABLE "Message" RENAME CONSTRAINT "fk_message_conversation" TO "Message_conversationId_fkey";

-- AddForeignKey
ALTER TABLE "AssistantCartItem" ADD CONSTRAINT "AssistantCartItem_assistantCartId_fkey" FOREIGN KEY ("assistantCartId") REFERENCES "AssistantCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantOrderItemAttribution" ADD CONSTRAINT "AssistantOrderItemAttribution_orderAttrId_fkey" FOREIGN KEY ("orderAttrId") REFERENCES "AssistantOrderAttribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_customerToken_conversationId" RENAME TO "CustomerToken_conversationId_idx";

-- RenameIndex
ALTER INDEX "idx_message_conversationId" RENAME TO "Message_conversationId_idx";