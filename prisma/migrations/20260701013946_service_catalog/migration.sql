/*
  Warnings:

  - Added the required column `defaultPrice` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMinutes` to the `Service` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "ProfessionalService" ADD COLUMN     "customPrice" DECIMAL(10,2),
ADD COLUMN     "useCustomPrice" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "defaultPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL,
ADD COLUMN     "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
