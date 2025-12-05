import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

export type DepartmentResponse = {
  id: number;
  name: string;
};

export type SubjectResponse = {
  id: number;
  name: string;
  departmentId: number;
};

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<DepartmentResponse[]> {
    return this.prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async create(
    dto: CreateDepartmentDto,
  ): Promise<DepartmentResponse> {
    const name = dto.name?.trim();

    if (!name) {
      throw new BadRequestException('Название кафедры обязательно.');
    }

    try {
      return await this.prisma.department.create({
        data: { name },
        select: { id: true, name: true },
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Кафедра с таким названием уже существует.',
        );
      }

      throw err;
    }
  }

  async update(
    id: number,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponse> {
    const data: { name?: string } = {};

    if (typeof dto.name !== 'undefined') {
      const trimmed = dto.name?.trim();
      if (!trimmed) {
        throw new BadRequestException(
          'Название кафедры не может быть пустым.',
        );
      }

      data.name = trimmed;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Нет данных для обновления.');
    }

    try {
      return await this.prisma.department.update({
        where: { id },
        data,
        select: { id: true, name: true },
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Кафедра не найдена.');
      }

      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Кафедра с таким названием уже существует.',
        );
      }

      throw err;
    }
  }

  async remove(id: number): Promise<{ success: true }> {
    try {
      await this.prisma.department.delete({ where: { id } });
      return { success: true };
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Кафедра не найдена.');
      }

      throw err;
    }
  }

  async findSubjects(departmentId: number): Promise<SubjectResponse[]> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        subjects: { select: { id: true, name: true, departmentId: true } },
      },
    });

    if (!department) {
      throw new NotFoundException('Кафедра не найдена.');
    }

    return department.subjects.sort((a, b) =>
      a.name.localeCompare(b.name, 'ru'),
    );
  }
}
