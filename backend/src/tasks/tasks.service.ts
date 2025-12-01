import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName, TaskStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
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
// Ответ для списка отправок по задаче
export type SubmissionResponse = {
  id: number;
  content: string | null;
  fileUrl: string | null;
  submittedAt: Date;
  student: { id: number; fullName: string };
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
  // Метод проверки доступа к задаче
  async getSubmissionsForTask(
    taskId: number,
    userId: number,
    roles: string[],
  ): Promise<SubmissionResponse[]> {
    // Проверяем, что задача видима пользователю
    await this.findOneForUser(taskId, userId, roles);

    const submissions = await this.prisma.submission.findMany({
      where: { taskId },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      content: submission.content ?? null,
      fileUrl: submission.fileUrl ?? null,
      submittedAt: submission.submittedAt,
      student: {
        id: submission.student.id,
        fullName: submission.student.fullName,
      },
    }));
  }
  // Метод создания отправки
  async createSubmission(
    taskId: number,
    userId: number,
    roles: string[],
    dto: CreateSubmissionDto,
  ): Promise<SubmissionResponse> {
    // Проверяем доступ к задаче
    await this.findOneForUser(taskId, userId, roles);

    const data = {
      content: dto.content ?? null,
      fileUrl: dto.fileUrl ?? null,
      submittedAt: new Date(),
      taskId,
      studentId: userId,
    };

    const saved = await this.prisma.submission.upsert({
      where: { taskId_studentId: { taskId, studentId: userId } },
      update: data,
      create: data,
      include: { student: { select: { id: true, fullName: true } } },
    });

    return {
      id: saved.id,
      content: saved.content ?? null,
      fileUrl: saved.fileUrl ?? null,
      submittedAt: saved.submittedAt,
      student: {
        id: saved.student.id,
        fullName: saved.student.fullName,
      },
    };
  }

  async deleteSubmission(
    taskId: number,
    submissionId: number,
    userId: number,
    roles: string[],
  ): Promise<{ success: true }> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.taskId !== taskId) {
      throw new NotFoundException('Отправка не найдена.');
    }

    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isAdminOrTeacher = normalizedRoles.some(
      (r) => r === RoleName.ADMIN || r === RoleName.TEACHER,
    );
    const isOwner = submission.studentId === userId;

    if (!isOwner && !isAdminOrTeacher) {
      throw new ForbiddenException('Недостаточно прав для удаления отправки.');
    }

    if (submission.fileUrl) {
      const filePath = path.join(process.cwd(), submission.fileUrl);
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.error('Ошибка удаления файла:', err);
      }
    }

    await this.prisma.submission.delete({ where: { id: submissionId } });
    return { success: true as const };
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
