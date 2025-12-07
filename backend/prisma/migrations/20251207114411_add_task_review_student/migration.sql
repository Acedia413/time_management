-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "inReviewStudentId" INTEGER;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_inReviewStudentId_fkey" FOREIGN KEY ("inReviewStudentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
