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
  grade: number | null;
  gradedAt: Date | null;
  gradedBy: { id: number; fullName: string } | null;
  student: { id: number; fullName: string };
};
// Ответ для списка групп по преподавателю
export type TeacherGroupStudentsResponse = {
  group: { id: number; name: string };
  students: { id: number; fullName: string }[];
};

export type CommentResponse = {
  id: number;
  content: string;
  createdAt: Date;
  author: { id: number; fullName: string };
};

type SimpleGroupResponse = { id: number; name: string };

export type CalendarTaskResponse = {
  id: number;
  title: string;
  dueDate: Date;
  status: TaskStatus;
  group: { id: number; name: string } | null;
};

export type StudentSubmissionStatus = {
  id: number;
  fullName: string;
  submittedAt?: Date;
  grade?: number | null;
};

export type TaskStudentsStatusResponse = {
  submitted: StudentSubmissionStatus[];
  notSubmitted: StudentSubmissionStatus[];
};

export type StudentDashboardResponse = {
  totalTasks: number;
  submittedCount: number;
  notSubmittedCount: number;
  overdueCount: number;
  nearestDeadline: {
    taskId: number;
    title: string;
    dueDate: Date;
    daysLeft: number;
  } | null;
  recentGrades: {
    taskId: number;
    title: string;
    grade: number;
    gradedAt: Date;
  }[];
};

export type TeacherDashboardResponse = {
  myTasksCount: number;
  pendingReviewCount: number;
  overdueStudentsCount: number;
  recentSubmissions: {
    studentName: string;
    taskTitle: string;
    taskId: number;
    submittedAt: Date;
  }[];
};

export type AdminDashboardResponse = {
  recentUsers: {
    id: number;
    fullName: string;
    username: string;
    roles: string[];
  }[];
  groupStats: {
    groupId: number;
    groupName: string;
    studentsCount: number;
    tasksCount: number;
  }[];
  totalOverdueCount: number;
};

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
      include: {
        student: { select: { id: true, fullName: true } },
        gradedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((submission) => ({
      id: submission.id,
      content: submission.content ?? null,
      fileUrl: submission.fileUrl ?? null,
      submittedAt: submission.submittedAt,
      grade: submission.grade ?? null,
      gradedAt: submission.gradedAt ?? null,
      gradedBy: submission.gradedBy
        ? { id: submission.gradedBy.id, fullName: submission.gradedBy.fullName }
        : null,
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

    const task = await this.findOneForUser(taskId, userId, roles);

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
      include: {
        student: { select: { id: true, fullName: true } },
        gradedBy: { select: { id: true, fullName: true } },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'SUBMISSION_SENT',
        details: `Ответ на задачу "${task.title}" отправлен`,
      },
    });

    return {
      id: saved.id,
      content: saved.content ?? null,
      fileUrl: saved.fileUrl ?? null,
      submittedAt: saved.submittedAt,
      grade: saved.grade ?? null,
      gradedAt: saved.gradedAt ?? null,
      gradedBy: saved.gradedBy
        ? { id: saved.gradedBy.id, fullName: saved.gradedBy.fullName }
        : null,
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

  async gradeSubmission(
    submissionId: number,
    grade: number,
    graderId: number,
    roles: string[],
  ): Promise<SubmissionResponse> {
    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isTeacherOrAdmin = normalizedRoles.some(
      (r) => r === RoleName.TEACHER || r === RoleName.ADMIN,
    );

    if (!isTeacherOrAdmin) {
      throw new ForbiddenException('Недостаточно прав для выставления оценки.');
    }

    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Отправка не найдена.');
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade,
        gradedAt: new Date(),
        gradedById: graderId,
      },
      include: {
        student: { select: { id: true, fullName: true } },
        gradedBy: { select: { id: true, fullName: true } },
      },
    });

    return {
      id: updated.id,
      content: updated.content ?? null,
      fileUrl: updated.fileUrl ?? null,
      submittedAt: updated.submittedAt,
      grade: updated.grade ?? null,
      gradedAt: updated.gradedAt ?? null,
      gradedBy: updated.gradedBy
        ? { id: updated.gradedBy.id, fullName: updated.gradedBy.fullName }
        : null,
      student: {
        id: updated.student.id,
        fullName: updated.student.fullName,
      },
    };
  }
  // Получить все комментарии к задаче
  async getCommentsForTask(taskId: number): Promise<CommentResponse[]> {
    const comments = await this.prisma.taskComment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        fullName: comment.author.fullName,
      },
    }));
  }


  async createComment(
    taskId: number,
    content: string,
    authorId: number,
  ): Promise<CommentResponse> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Задача не найдена.');
    }

    const comment = await this.prisma.taskComment.create({
      data: {
        content,
        taskId,
        authorId,
      },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: {
        id: comment.author.id,
        fullName: comment.author.fullName,
      },
    };
  }

  
  async deleteComment(
    commentId: number,
    userId: number,
    roles: string[],
  ): Promise<{ success: true }> {
    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Комментарий не найден.');
    }

    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isAdmin = normalizedRoles.includes(RoleName.ADMIN);
    const isAuthor = comment.authorId === userId;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenException('Недостаточно прав для удаления комментария.');
    }

    await this.prisma.taskComment.delete({ where: { id: commentId } });
    return { success: true as const };
  }

  async getTasksForCalendar(
    userId: number,
    roles: string[],
    month: string,
  ): Promise<CalendarTaskResponse[]> {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('Некорректный формат месяца. Используйте YYYY-MM.');
    }

    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

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
      where: {
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(isStudentOnly
          ? {
              OR: [
                { groupId: null },
                groupId !== null ? { groupId } : undefined,
              ].filter(Boolean) as Record<string, unknown>[],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        group: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks
      .filter((task): task is typeof task & { dueDate: Date } => task.dueDate !== null)
      .map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        status: task.status,
        group: task.group ? { id: task.group.id, name: task.group.name } : null,
      }));
  }

  async getStudentsStatusForTask(
    taskId: number,
    userId: number,
    roles: string[],
  ): Promise<TaskStudentsStatusResponse> {
    const normalizedRoles = roles.map((r) => r.toUpperCase()) as RoleName[];
    const isTeacherOrAdmin = normalizedRoles.some(
      (r) => r === RoleName.TEACHER || r === RoleName.ADMIN,
    );

    if (!isTeacherOrAdmin) {
      throw new ForbiddenException('Недостаточно прав.');
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, groupId: true },
    });

    if (!task) {
      throw new NotFoundException('Задача не найдена.');
    }

    if (!task.groupId) {
      return { submitted: [], notSubmitted: [] };
    }

    const students = await this.prisma.user.findMany({
      where: {
        groupId: task.groupId,
        roles: { some: { name: RoleName.STUDENT } },
      },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });

    const submissions = await this.prisma.submission.findMany({
      where: { taskId },
      select: {
        studentId: true,
        submittedAt: true,
        grade: true,
      },
    });

    const submissionMap = new Map(
      submissions.map((s) => [s.studentId, s]),
    );

    const submitted: StudentSubmissionStatus[] = [];
    const notSubmitted: StudentSubmissionStatus[] = [];

    for (const student of students) {
      const submission = submissionMap.get(student.id);
      if (submission) {
        submitted.push({
          id: student.id,
          fullName: student.fullName,
          submittedAt: submission.submittedAt,
          grade: submission.grade,
        });
      } else {
        notSubmitted.push({
          id: student.id,
          fullName: student.fullName,
        });
      }
    }

    return { submitted, notSubmitted };
  }

  async getStudentDashboard(userId: number): Promise<StudentDashboardResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { groupId: true },
    });

    const groupId = user?.groupId ?? null;

    const tasks = await this.prisma.task.findMany({
      where: {
        status: { in: [TaskStatus.ACTIVE, TaskStatus.IN_REVIEW] },
        OR: [
          { groupId: null },
          groupId !== null ? { groupId } : undefined,
        ].filter(Boolean) as Record<string, unknown>[],
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
      },
    });

    const taskIds = tasks.map((t) => t.id);

    const submissions = await this.prisma.submission.findMany({
      where: {
        studentId: userId,
        taskId: { in: taskIds },
      },
      select: {
        taskId: true,
        grade: true,
        gradedAt: true,
        task: { select: { title: true } },
      },
    });

    const submittedTaskIds = new Set(submissions.map((s) => s.taskId));

    const totalTasks = tasks.length;
    const submittedCount = submittedTaskIds.size;
    const notSubmittedCount = totalTasks - submittedCount;

    const now = new Date();
    let overdueCount = 0;
    let nearestDeadline: StudentDashboardResponse['nearestDeadline'] = null;

    for (const task of tasks) {
      if (!submittedTaskIds.has(task.id) && task.dueDate) {
        if (task.dueDate < now) {
          overdueCount++;
        } else {
          const daysLeft = Math.ceil(
            (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (!nearestDeadline || task.dueDate < nearestDeadline.dueDate) {
            nearestDeadline = {
              taskId: task.id,
              title: task.title,
              dueDate: task.dueDate,
              daysLeft,
            };
          }
        }
      }
    }

    const recentGrades = submissions
      .filter((s) => s.grade !== null && s.gradedAt !== null)
      .sort((a, b) => {
        const dateA = a.gradedAt?.getTime() ?? 0;
        const dateB = b.gradedAt?.getTime() ?? 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((s) => ({
        taskId: s.taskId,
        title: s.task.title,
        grade: s.grade as number,
        gradedAt: s.gradedAt as Date,
      }));

    return {
      totalTasks,
      submittedCount,
      notSubmittedCount,
      overdueCount,
      nearestDeadline,
      recentGrades,
    };
  }

  async getTeacherDashboard(userId: number): Promise<TeacherDashboardResponse> {
    const myTasks = await this.prisma.task.findMany({
      where: { createdById: userId },
      select: {
        id: true,
        title: true,
        dueDate: true,
        groupId: true,
      },
    });

    const myTasksCount = myTasks.length;
    const myTaskIds = myTasks.map((t) => t.id);

    const submissions = await this.prisma.submission.findMany({
      where: { taskId: { in: myTaskIds } },
      select: {
        id: true,
        taskId: true,
        studentId: true,
        submittedAt: true,
        grade: true,
        student: { select: { fullName: true } },
        task: { select: { title: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const pendingReviewCount = submissions.filter((s) => s.grade === null).length;

    const recentSubmissions = submissions.slice(0, 5).map((s) => ({
      studentName: s.student.fullName,
      taskTitle: s.task.title,
      taskId: s.taskId,
      submittedAt: s.submittedAt,
    }));

    const now = new Date();
    let overdueStudentsCount = 0;

    for (const task of myTasks) {
      if (task.dueDate && task.dueDate < now && task.groupId) {
        const studentsInGroup = await this.prisma.user.count({
          where: {
            groupId: task.groupId,
            roles: { some: { name: RoleName.STUDENT } },
          },
        });

        const submissionsForTask = submissions.filter((s) => s.taskId === task.id);
        const notSubmittedCount = studentsInGroup - submissionsForTask.length;
        if (notSubmittedCount > 0) {
          overdueStudentsCount += notSubmittedCount;
        }
      }
    }

    return {
      myTasksCount,
      pendingReviewCount,
      overdueStudentsCount,
      recentSubmissions,
    };
  }

  async getAdminDashboard(): Promise<AdminDashboardResponse> {
    const recentUsers = await this.prisma.user.findMany({
      orderBy: { id: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        username: true,
        roles: { select: { name: true } },
      },
    });

    const groups = await this.prisma.group.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            students: true,
            tasks: true,
          },
        },
      },
    });

    const groupStats = groups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      studentsCount: g._count.students,
      tasksCount: g._count.tasks,
    }));

    const now = new Date();
    const tasksWithDueDate = await this.prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        groupId: { not: null },
      },
      select: {
        id: true,
        groupId: true,
      },
    });

    let totalOverdueCount = 0;

    for (const task of tasksWithDueDate) {
      if (!task.groupId) continue;

      const studentsInGroup = await this.prisma.user.count({
        where: {
          groupId: task.groupId,
          roles: { some: { name: RoleName.STUDENT } },
        },
      });

      const submissionsCount = await this.prisma.submission.count({
        where: { taskId: task.id },
      });

      const notSubmitted = studentsInGroup - submissionsCount;
      if (notSubmitted > 0) {
        totalOverdueCount += notSubmitted;
      }
    }

    return {
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        roles: u.roles.map((r) => r.name),
      })),
      groupStats,
      totalOverdueCount,
    };
  }
}
