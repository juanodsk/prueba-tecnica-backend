/*
  Warnings:

  - A unique constraint covering the columns `[batch_id,currency]` on the table `settlements` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `batch_id` to the `settlements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `settlements` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "settlements" ADD COLUMN     "batch_id" UUID NOT NULL,
ADD COLUMN     "currency" "Currency" NOT NULL;

-- CreateTable
CREATE TABLE "settlement_batches" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "transaction_count" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlement_batches_merchant_id_status_created_at_idx" ON "settlement_batches"("merchant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "settlement_batches_merchant_id_period_start_period_end_idx" ON "settlement_batches"("merchant_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_batch_id_currency_key" ON "settlements"("batch_id", "currency");

-- AddForeignKey
ALTER TABLE "settlement_batches" ADD CONSTRAINT "settlement_batches_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "settlement_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
