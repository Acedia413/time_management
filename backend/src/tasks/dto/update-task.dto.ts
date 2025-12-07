import { TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: Date | string | null;
  status?: TaskStatus;
  groupId?: number | null;
  subjectId?: number | null;
  inReviewStudentId?: number | null;
}
