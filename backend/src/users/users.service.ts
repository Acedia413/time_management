import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleName } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findStudentsAndTeachers() {
    const users = await this.prisma.user.findMany({
      where: {
        roles: {
          some: { name: { in: [RoleName.STUDENT, RoleName.TEACHER] } },
        },
      },
      include: { roles: true, group: true },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roles: user.roles.map((role) => role.name),
      group: user.group ? { id: user.group.id, name: user.group.name } : null,
    }));
  }
}
