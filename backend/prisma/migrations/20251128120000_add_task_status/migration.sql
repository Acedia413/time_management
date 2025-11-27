-- Add enum for task status
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- Add status column with default
ALTER TABLE "Task" ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'ACTIVE';
