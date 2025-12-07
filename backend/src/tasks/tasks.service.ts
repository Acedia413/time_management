import {
  BadRequestException,
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
  subject: { id: number; name: string } | null;
  createdBy: { id: number; fullName: string; roles: RoleName[] };
  inReviewStudent: { id: number; fullName: string } | null;
};
// Ответ для списка задач по студенту
export type StudentTasksResponse = {
  student: {
    id: number;
    fullName: string;
    group: { id: number; name: string } | null;
  };
  tasks: TaskResponse[];
};
// Ответ для списка отправок по задаче
export type SubmissionResponse = {
  id: number;
  content: string | null;
  fileUrl: string | null;
  submittedAt: Date;
  student: { id: number; fullName: string };
};
// Ответ для списка групп по преподавателю
export type TeacherGroupStudentsResponse = {
  group: { id: number; name: string };
  students: { id: number; fullName: string }[];
};

type SimpleGroupResponse = { id: number; name: string };

type TaskWithRelations = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: Date;
  dueDate: Date | null;
  group: { id: number; name: string } | null;
  subject: { id: number; name: string } | null;
  inReviewStudent: { id: number; fullName: string } | null;
  createdBy: {
    id: number;
    fullName: string;
    roles: { name: RoleName }[];
  };
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private mapTask(task: TaskWithRelations): TaskResponse {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      createdAt: task.createdAt,
      dueDate: task.dueDate ?? null,
      group: task.group ? { id: task.group.id, name: task.group.name } : null,
      subject: task.subject
        ? { id: task.subject.id, name: task.subject.name }
        : null,
      inReviewStudent: task.inReviewStudent
        ? {
            id: task.inReviewStudent.id,
            fullName: task.inReviewStudent.fullName,
          }
        : null,
      createdBy: {
        id: task.createdBy.id,
        fullName: task.createdBy.fullName,
        roles: task.createdBy.roles.map((role) => role.name),
      },
    };
  }

  // Отдает список групп по преподавателю
  async findGroupsForTeacher(
    userId: number,
    roles: string[],
  ): Promise<TeacherGroupStudentsResponse[]> {
    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isTeacherOrAdmin = normalizedRoles.some(
      (role) => role === RoleName.TEACHER || role === RoleName.ADMIN,
    );

    if (!isTeacherOrAdmin) {
      throw new ForbiddenException('Access denied');
    }

    const groupRefs = await this.prisma.task.findMany({
      where: { createdById: userId, groupId: { not: null } },
      select: { groupId: true },
    });

    const groupIds = Array.from(
      new Set(
        groupRefs
          .map((ref) => ref.groupId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );

    if (!groupIds.length) {
      return [];
    }

    const groups = await this.prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: {
        students: {
          select: { id: true, fullName: true },
          orderBy: { fullName: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return groups.map((group) => ({
      group: { id: group.id, name: group.name },
      students: group.students.map((student) => ({
        id: student.id,
        fullName: student.fullName,
      })),
    }));
  }

  async listAvailableGroups(roles: string[]): Promise<SimpleGroupResponse[]> {
    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isTeacherOrAdmin = normalizedRoles.some(
      (role) => role === RoleName.TEACHER || role === RoleName.ADMIN,
    );

    if (!isTeacherOrAdmin) {
      throw new ForbiddenException('Access denied');
    }

    const groups = await this.prisma.group.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return groups;
  }
  async findAllForUser(
    userId: number,
    roles: string[],
  ): Promise<TaskResponse[]> {
    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isStudentOnly =
      normalizedRoles.includes(RoleName.STUDENT) &&
      !normalizedRoles.includes(RoleName.TEACHER) &&
      !normalizedRoles.includes(RoleName.ADMIN);
    let groupId: number | null = null;

    if (isStudentOnly) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { groupId: true },
      });
      groupId = user?.groupId ?? null;
    }

    const tasks = await this.prisma.task.findMany({
      where: isStudentOnly
        ? {
            OR: [
              { groupId: null },
              groupId !== null ? { groupId } : undefined,
            ].filter(Boolean) as Record<string, unknown>[],
          }
        : {},
      include: {
        group: true,
        subject: { select: { id: true, name: true } },
        inReviewStudent: { select: { id: true, fullName: true } },
        submissions: isStudentOnly
          ? { where: { studentId: userId }, select: { id: true } }
          : false,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            roles: { select: { name: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return tasks.map((task) => {
      const mapped = this.mapTask(task as TaskWithRelations);
      if (isStudentOnly && task.status !== TaskStatus.CLOSED) {
        const hasSubmission =
          Array.isArray((task as any).submissions) &&
          (task as any).submissions.length > 0;
        if (hasSubmission) {
          mapped.status = TaskStatus.IN_REVIEW;
        } else if (task.status === TaskStatus.IN_REVIEW) {
          mapped.status = TaskStatus.ACTIVE;
        }
      }
      return mapped;
    });
  }

  // Отдает задачи для студента
  async findForStudent(
    studentId: number,
    teacherId: number,
    roles: string[],
  ): Promise<StudentTasksResponse> {
    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isTeacherOrAdmin = normalizedRoles.some(
      (r) => r === RoleName.TEACHER || r === RoleName.ADMIN,
    );
    if (!isTeacherOrAdmin) {
      throw new ForbiddenException('Access denied');
    }
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        group: { select: { id: true, name: true } },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    // Получаем id группы студента
    const studentGroupId = student.group?.id ?? null;
    const tasks = await this.prisma.task.findMany({
      where: {
        createdById: teacherId,
        OR: [
          { groupId: null },
          studentGroupId !== null ? { groupId: studentGroupId } : undefined,
        ].filter(Boolean) as Record<string, unknown>[],
      },
      include: {
        group: true,
        subject: { select: { id: true, name: true } },
        inReviewStudent: { select: { id: true, fullName: true } },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            roles: { select: { name: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        group: student.group
          ? { id: student.group.id, name: student.group.name }
          : null,
      },
      tasks: tasks.map((task) => this.mapTask(task as TaskWithRelations)),
    };
  }

  async findOneForUser(
    taskId: number,
    userId: number,
    roles: string[],
  ): Promise<TaskResponse> {
    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isStudentOnly =
      normalizedRoles.includes(RoleName.STUDENT) &&
      !normalizedRoles.includes(RoleName.TEACHER) &&
      !normalizedRoles.includes(RoleName.ADMIN);
    let userGroupId: number | null = null;

    if (isStudentOnly) {
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
        subject: { select: { id: true, name: true } },
        inReviewStudent: { select: { id: true, fullName: true } },
        submissions: isStudentOnly
          ? { where: { studentId: userId }, select: { id: true } }
          : false,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            roles: { select: { name: true } },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Задача не найдена.');
    }

    if (isStudentOnly) {
      const allowed =
        task.groupId === null ||
        (userGroupId !== null && task.groupId === userGroupId);
      if (!allowed) {
        throw new ForbiddenException('Недостаточно прав для просмотра задачи.');
      }
    }

    const mapped = this.mapTask(task as TaskWithRelations);

    if (isStudentOnly && task.status !== TaskStatus.CLOSED) {
      const hasSubmission =
        Array.isArray((task as any).submissions) &&
        (task as any).submissions.length > 0;
      if (hasSubmission) {
        mapped.status = TaskStatus.IN_REVIEW;
      } else if (task.status === TaskStatus.IN_REVIEW) {
        mapped.status = TaskStatus.ACTIVE;
      }
    }

    return mapped;
  }
  async getSubmissionsForTask(
    taskId: number,
    userId: number,
    roles: string[],
    filterStudentId?: number,
  ): Promise<SubmissionResponse[]> {
    await this.findOneForUser(taskId, userId, roles);

    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isStudent =
      normalizedRoles.includes(RoleName.STUDENT) &&
      !normalizedRoles.includes(RoleName.TEACHER) &&
      !normalizedRoles.includes(RoleName.ADMIN);

    let whereClause: { taskId: number; studentId?: number };
    if (isStudent) {
      whereClause = { taskId, studentId: userId };
    } else if (
      typeof filterStudentId === 'number' &&
      !Number.isNaN(filterStudentId)
    ) {
      whereClause = { taskId, studentId: filterStudentId };
    } else {
      whereClause = { taskId };
    }

    const submissions = await this.prisma.submission.findMany({
      where: whereClause,
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

    const subjectIdRaw =
      typeof dto.subjectId === 'undefined' || dto.subjectId === null
        ? null
        : Number(dto.subjectId);
    if (subjectIdRaw !== null) {
      const isValidSubject = Number.isInteger(subjectIdRaw) && subjectIdRaw > 0;
      if (!isValidSubject) {
        throw new BadRequestException('Некорректный идентификатор предмета.');
      }
    }

    const data = {
      title: dto.title,
      description: dto.description,
      status: dto.status ?? TaskStatus.ACTIVE,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdById: userId,
      groupId: dto.groupId ?? null,
      subjectId: subjectIdRaw,
      inReviewStudentId: null,
    };

    const created = await this.prisma.task.create({
      data,
      include: {
        group: true,
        subject: { select: { id: true, name: true } },
        inReviewStudent: { select: { id: true, fullName: true } },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            roles: { select: { name: true } },
          },
        },
      },
    });

    return this.mapTask(created as TaskWithRelations);
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

    const data: {
      title: string;
      description: string;
      status: TaskStatus;
      dueDate: Date | null;
      groupId: number | null;
      subjectId?: number | null;
      inReviewStudentId?: number | null;
    } = {
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

    if (typeof dto.subjectId !== 'undefined') {
      if (dto.subjectId === null) {
        data.subjectId = null;
      } else {
        const parsedSubjectId = Number(dto.subjectId);
        if (!Number.isInteger(parsedSubjectId) || parsedSubjectId <= 0) {
          throw new BadRequestException('Некорректный идентификатор предмета.');
        }
        data.subjectId = parsedSubjectId;
      }
    }

    if (typeof dto.inReviewStudentId !== 'undefined') {
      if (dto.inReviewStudentId === null) {
        data.inReviewStudentId = null;
      } else {
        const parsedStudentId = Number(dto.inReviewStudentId);
        if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
          throw new BadRequestException('Некорректный идентификатор студента.');
        }
        data.inReviewStudentId = parsedStudentId;
      }
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        group: true,
        subject: { select: { id: true, name: true } },
        inReviewStudent: { select: { id: true, fullName: true } },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            roles: { select: { name: true } },
          },
        },
      },
    });

    return this.mapTask(updated as TaskWithRelations);
  }
  // Обновление статуса задачи
  async updateTaskStatus(
    taskId: number,
    status: TaskStatus,
    studentId: number | null | undefined,
    userId: number,
    roles: string[],
  ): Promise<TaskResponse> {
    const payload: UpdateTaskDto = { status };
    let parsedStudentId: number | null | undefined = undefined;
    if (typeof studentId !== 'undefined') {
      if (studentId === null) {
        parsedStudentId = null;
      } else {
        const numeric = Number(studentId);
        if (!Number.isInteger(numeric) || numeric <= 0) {
          throw new BadRequestException('Некорректный идентификатор студента.');
        }
        parsedStudentId = numeric;
      }
    }

    if (status === TaskStatus.IN_REVIEW) {
      payload.inReviewStudentId =
        typeof parsedStudentId === 'undefined' ? null : parsedStudentId;
    } else {
      payload.inReviewStudentId = null;
    }
    return this.updateTask(taskId, payload, userId, roles);
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

    const submissions = await this.prisma.submission.findMany({
      where: { taskId },
      select: { fileUrl: true },
    });

    await Promise.all(
      submissions.map(async (submission) => {
        if (submission.fileUrl) {
          const filePath = path.join(process.cwd(), submission.fileUrl);
          try {
            await fs.promises.unlink(filePath);
          } catch (err) {
            console.error('Не удалось удалить файл отправки:', err);
          }
        }
      }),
    );

    await this.prisma.submission.deleteMany({ where: { taskId } });
    await this.prisma.task.delete({ where: { id: taskId } });
    return { success: true as const };
  }

  // Получение приоритетов задач
  async getTaskPriorities(
    userId: number,
  ): Promise<{ taskId: number; priority: number }[]> {
    const priorities = await this.prisma.taskPriority.findMany({
      where: { userId },
      select: { taskId: true, priority: true },
      orderBy: { priority: 'asc' },
    });
    return priorities;
  }

  // Обновление приоритета задачи
  async updateTaskPriority(
    userId: number,
    taskId: number,
    priority: number,
  ): Promise<{ taskId: number; priority: number }> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException('Задача не найдена.');
    }

    const saved = await this.prisma.taskPriority.upsert({
      where: { userId_taskId: { userId, taskId } },
      update: { priority },
      create: { userId, taskId, priority },
      select: { taskId: true, priority: true },
    });
    return saved;
  }
}
