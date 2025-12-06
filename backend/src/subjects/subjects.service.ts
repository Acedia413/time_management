import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

export type SubjectListItem = {
  id: number;
  name: string;
  departmentId: number;
  department?: { id: number; name: string };
};

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(departmentId?: number): Promise<SubjectListItem[]> {
    return this.prisma.subject.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findForTeacher(teacherId: number): Promise<SubjectListItem[]> {
    return this.prisma.subject.findMany({
      where: { teachers: { some: { id: teacherId } } },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateSubjectDto): Promise<SubjectListItem> {
    const name = dto.name?.trim();
    const departmentId = Number(dto.departmentId);

    if (!name) {
      throw new BadRequestException('Название предмета обязательно.');
    }

    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      throw new BadRequestException(
        'Некорректный идентификатор кафедры.',
      );
    }

    try {
      return await this.prisma.subject.create({
        data: { name, departmentId },
        include: { department: { select: { id: true, name: true } } },
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new NotFoundException('Кафедра не найдена.');
      }

      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Предмет с таким названием уже существует в выбранной кафедре.',
        );
      }

      throw err;
    }
  }

  async update(
    id: number,
    dto: UpdateSubjectDto,
  ): Promise<SubjectListItem> {
    const data: { name?: string; departmentId?: number } = {};

    if (typeof dto.name !== 'undefined') {
      const trimmed = dto.name?.trim();
      if (!trimmed) {
        throw new BadRequestException(
          'Название предмета не может быть пустым.',
        );
      }
      data.name = trimmed;
    }

    if (typeof dto.departmentId !== 'undefined') {
      const departmentId = Number(dto.departmentId);
      if (!Number.isInteger(departmentId) || departmentId <= 0) {
        throw new BadRequestException(
          'Некорректный идентификатор кафедры.',
        );
      }
      data.departmentId = departmentId;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Нет данных для обновления.');
    }

    try {
      return await this.prisma.subject.update({
        where: { id },
        data,
        include: { department: { select: { id: true, name: true } } },
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Предмет не найден.');
      }

      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new NotFoundException('Кафедра не найдена.');
      }

      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Предмет с таким названием уже существует в выбранной кафедре.',
        );
      }

      throw err;
    }
  }

  async remove(id: number): Promise<{ success: true }> {
    try {
      await this.prisma.subject.delete({ where: { id } });
      return { success: true };
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Предмет не найден.');
      }

      throw err;
    }
  }
}
