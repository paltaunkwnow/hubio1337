-- xd
-- Wallet, crypto payments, withdrawals, POS payment fields

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('SALE', 'SUBSCRIPTION', 'WITHDRAWAL', 'FEE', 'REFUND');
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "CryptoPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "CryptoPaymentPurpose" AS ENUM ('POS_SALE', 'SUBSCRIPTION', 'RENEWAL', 'INTERNAL_CHARGE', 'OTHER');
CREATE TYPE "WithdrawalMethod" AS ENUM ('BANK_ACCOUNT', 'QR');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateTable WalletBalance
CREATE TABLE "WalletBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceUSDT" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "balanceBOB" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable WalletTransaction
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "txid" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable CryptoPaymentOrder
CREATE TABLE "CryptoPaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "purpose" "CryptoPaymentPurpose" NOT NULL,
    "amountUSDT" DECIMAL(18,6) NOT NULL,
    "status" "CryptoPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "txid" TEXT,
    "walletAddress" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoPaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable WithdrawalRequest
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountBOB" DECIMAL(18,2) NOT NULL,
    "feeBOB" DECIMAL(18,2) NOT NULL,
    "netAmountBOB" DECIMAL(18,2) NOT NULL,
    "method" "WithdrawalMethod" NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountHolder" TEXT,
    "qrImageUrl" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "bankReference" TEXT,
    "wallbitRef" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- AlterTable POSSale
ALTER TABLE "POSSale" ADD COLUMN     "sellerId" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
ADD COLUMN     "commission" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "CryptoPaymentStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "paymentTxid" TEXT,
ADD COLUMN     "cryptoPaymentOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WalletBalance_userId_key" ON "WalletBalance"("userId");
CREATE UNIQUE INDEX "WalletTransaction_reference_key" ON "WalletTransaction"("reference");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE UNIQUE INDEX "CryptoPaymentOrder_reference_key" ON "CryptoPaymentOrder"("reference");
CREATE INDEX "CryptoPaymentOrder_userId_status_idx" ON "CryptoPaymentOrder"("userId", "status");
CREATE INDEX "CryptoPaymentOrder_reference_idx" ON "CryptoPaymentOrder"("reference");
CREATE INDEX "WithdrawalRequest_userId_status_idx" ON "WithdrawalRequest"("userId", "status");
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");
CREATE UNIQUE INDEX "POSSale_cryptoPaymentOrderId_key" ON "POSSale"("cryptoPaymentOrderId");

-- AddForeignKey
ALTER TABLE "WalletBalance" ADD CONSTRAINT "WalletBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CryptoPaymentOrder" ADD CONSTRAINT "CryptoPaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "POSSale" ADD CONSTRAINT "POSSale_cryptoPaymentOrderId_fkey" FOREIGN KEY ("cryptoPaymentOrderId") REFERENCES "CryptoPaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
