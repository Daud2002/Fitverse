-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "recommendations" JSONB,
ADD COLUMN     "recommendationsAt" TIMESTAMP(3);
