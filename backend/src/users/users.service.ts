import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleName } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateUserDto } from './dto/create-user.dto';

export type UserResponse = {
  id: number;
  username: string;
  fullName: string;
  roles: RoleName[];
  group: { id: number; name: string } | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async countAll(): Promise<{ count: number }> {
    const count = await this.prisma.user.count();
    return { count };
  }

  // Получение списка студентов и преподавателей
  async findStudentsAndTeachers(): Promise<UserResponse[]> {
    const users = await this.prisma.user.findMany({
      where: {
        roles: {
          some: { name: { in: [RoleName.STUDENT, RoleName.TEACHER] } },
        },
      },
      include: { roles: true, group: true },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    });

    return users.map((user) => this.mapUser(user));
  }

  // Создание пользователя
  async createUser(data: CreateUserDto): Promise<UserResponse> {
    const roleName = data.role.toUpperCase() as RoleName;
    if (!Object.values(RoleName).includes(roleName)) {
      throw new BadRequestException('Недопустимая роль.');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          username: data.username,
          password: data.password,
          fullName: data.fullName,
          roles: { connect: { name: roleName } },
          group: data.groupId
            ? { connect: { id: data.groupId } }
            : undefined,
        },
        include: { roles: true, group: true },
      });

      return this.mapUser(user);
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Пользователь с таким логином уже существует.',
        );
      }

      throw err;
    }
  }

  // Удаление пользователя
  async deleteUser(id: number): Promise<{ success: true }> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return { success: true };
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Пользователь не найден.');
      }

      throw err;
    }
  }

  private mapUser(user: {
    id: number;
    username: string;
    fullName: string;
    roles: { name: RoleName }[];
    group: { id: number; name: string } | null;
  }): UserResponse {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roles: user.roles.map((role) => role.name),
      group: user.group ? { id: user.group.id, name: user.group.name } : null,
    };
  }
}
