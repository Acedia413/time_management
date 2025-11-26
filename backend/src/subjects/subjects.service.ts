import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
}
