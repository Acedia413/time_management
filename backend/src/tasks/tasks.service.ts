import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleName, TaskStatus } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

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
  // Отдает все доступные пользователю задачи
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

  // Обработка GET /tasks/:id с проверкой доступа для студента
  async findOneForUser(
    taskId: number,
    userId: number,
    roles: string[],
  ): Promise<TaskResponse> {
    const isStudent = roles.map((r) => r.toUpperCase()).includes(RoleName.STUDENT);
    let userGroupId: number | null = null;

    if (isStudent) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { groupId: true },
      });
      userGroupId = user?.groupId ?? null;
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        group: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Задача не найдена.');
    }

    if (isStudent) {
      const allowed =
        task.groupId === null || (userGroupId !== null && task.groupId === userGroupId);
      if (!allowed) {
        throw new ForbiddenException('Недостаточно прав для просмотра задачи.');
      }
    }

    return {
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
    };
  }
// Обработка POST /tasks
  async createTask(
    dto: CreateTaskDto,
    userId: number,
    roles: string[],
  ): Promise<TaskResponse> {
    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isAllowed = normalizedRoles.some(
      (r) => r === RoleName.TEACHER || r === RoleName.ADMIN,
    );

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
  // Обработка PATCH /tasks/:id
  async updateTask(
    taskId: number,
    dto: UpdateTaskDto,
    userId: number,
    roles: string[],
  ): Promise<TaskResponse> {
    const existing = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { createdBy: true, group: true },
    });

    if (!existing) {
      throw new NotFoundException('Задача не найдена.');
    }
    // Проверка прав доступа на изменение и удаление (только Автор и Админ)
    const isAdmin = roles.map((r) => r.toUpperCase()).includes(RoleName.ADMIN);
    const isAuthor = existing.createdById === userId;
    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('Недостаточно прав для изменения задачи.');
    }

    const data = {
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      status: dto.status ?? existing.status,
      dueDate:
        dto.dueDate === null
          ? null
          : dto.dueDate
            ? new Date(dto.dueDate)
            : existing.dueDate,
      groupId:
        dto.groupId === undefined
          ? existing.groupId
          : dto.groupId === null
            ? null
            : dto.groupId,
    };

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        group: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      createdAt: updated.createdAt,
      dueDate: updated.dueDate ?? null,
      group: updated.group
        ? { id: updated.group.id, name: updated.group.name }
        : null,
      createdBy: {
        id: updated.createdBy.id,
        fullName: updated.createdBy.fullName,
      },
    };
  }
  // Обработка DELETE /tasks/:id
  async deleteTask(
    taskId: number,
    userId: number,
    roles: string[],
  ): Promise<{ success: true }> {
    const existing = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { createdById: true },
    });

    if (!existing) {
      throw new NotFoundException('Задача не найдена.');
    }
    // Проверка прав доступа на удаление задачи (только Автор и Админ)
    const isAdmin = roles.map((r) => r.toUpperCase()).includes(RoleName.ADMIN);
    const isAuthor = existing.createdById === userId;
    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('Недостаточно прав для удаления задачи.');
    }

    await this.prisma.task.delete({ where: { id: taskId } });
    return { success: true as const };
  }
}
