import { TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  title: string;
  description: string;
  dueDate?: Date | string;
  status?: TaskStatus;
  groupId?: number;
  subjectId?: number;
}
