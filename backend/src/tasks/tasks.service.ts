import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { RoleName, TaskStatus } from '@prisma/client';

export type TaskResponse = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: Date;
  dueDate: Date | null;
  group: { id: number; name: string } | null;
  createdBy: { id: number; fullName: string };
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: number, roles: string[]): Promise<TaskResponse[]> {
    const isStudent = roles.map((r) => r.toUpperCase()).includes(RoleName.STUDENT);
    let groupId: number | null = null;

    if (isStudent) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { groupId: true },
      });
      groupId = user?.groupId ?? null;
    }

    const tasks = await this.prisma.task.findMany({
      where: isStudent
        ? {
            OR: [
              { groupId: null },
              groupId !== null ? { groupId } : undefined,
            ].filter(Boolean) as Record<string, unknown>[],
          }
        : {},
      include: {
        group: true,
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      createdAt: task.createdAt,
      dueDate: task.dueDate ?? null,
      group: task.group ? { id: task.group.id, name: task.group.name } : null,
      createdBy: {
        id: task.createdBy.id,
        fullName: task.createdBy.fullName,
      },
    }));
  }

  async createTask(
    dto: CreateTaskDto,
    userId: number,
    roles: string[],
  ): Promise<TaskResponse> {
    const isAllowed = roles
      .map((r) => r.toUpperCase())
      .some((r) => [RoleName.TEACHER, RoleName.ADMIN].includes(r as RoleName));

    if (!isAllowed) {
      throw new ForbiddenException('Недостаточно прав для создания задачи.');
    }

    const data = {
      title: dto.title,
      description: dto.description,
      status: dto.status ?? TaskStatus.ACTIVE,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdById: userId,
      groupId: dto.groupId ?? null,
    };

    const created = await this.prisma.task.create({
      data,
      include: {
        group: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return {
      id: created.id,
      title: created.title,
      description: created.description,
      status: created.status,
      createdAt: created.createdAt,
      dueDate: created.dueDate ?? null,
      group: created.group
        ? { id: created.group.id, name: created.group.name }
        : null,
      createdBy: {
        id: created.createdBy.id,
        fullName: created.createdBy.fullName,
      },
    };
  }
}
