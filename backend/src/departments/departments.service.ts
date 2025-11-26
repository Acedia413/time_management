import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
