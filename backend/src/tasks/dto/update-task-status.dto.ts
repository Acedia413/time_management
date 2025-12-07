import { TaskStatus } from '@prisma/client';

export class UpdateTaskStatusDto {
  status: TaskStatus;
  studentId?: number | null;
}
