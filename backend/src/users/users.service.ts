import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, RoleName } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userRelationsInclude = Prisma.validator<Prisma.UserInclude>()({
  roles: true,
  group: true,
  department: true,
  subjects: { select: { id: true, name: true } },
});

type UserWithRelations = Prisma.UserGetPayload<{
  include: typeof userRelationsInclude;
}>;

export type UserResponse = {
  id: number;
  username: string;
  fullName: string;
  roles: RoleName[];
  group: { id: number; name: string } | null;
  department: { id: number; name: string } | null;
  subjects: { id: number; name: string }[];
};

@Injectable()
export class UsersService {
  private readonly userInclude = userRelationsInclude;

  constructor(private readonly prisma: PrismaService) {}

  async countAll(): Promise<{ count: number }> {
    const count = await this.prisma.user.count();
    return { count };
  }

  // Получение списка студентов и преподавателей
  async findStudentsAndTeachers(): Promise<UserResponse[]> {
    const users = (await this.prisma.user.findMany({
      where: {
        roles: {
          some: { name: { in: [RoleName.STUDENT, RoleName.TEACHER] } },
        },
      },
      include: this.userInclude,
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    })) as UserWithRelations[];

    return users.map((user) => this.mapUser(user));
  }

  // Создание пользователя
  async createUser(data: CreateUserDto): Promise<UserResponse> {
    const roleName = data.role.toUpperCase() as RoleName;
    if (!Object.values(RoleName).includes(roleName)) {
      throw new BadRequestException('Недопустимая роль.');
    }

    const departmentRelation = this.buildConnectRelation(
      data.departmentId,
      'department',
    );
    const subjectIds = this.normalizeSubjectIds(data.subjectIds);
    const subjectsRelation =
      subjectIds && subjectIds.length > 0
        ? { connect: subjectIds.map((subjectId) => ({ id: subjectId })) }
        : undefined;
    const groupRelation = this.buildConnectRelation(data.groupId, 'group');

    try {
      const user = (await this.prisma.user.create({
        data: {
          username: data.username,
          password: data.password,
          fullName: data.fullName,
          roles: { connect: { name: roleName } },
          ...(groupRelation ? { group: groupRelation } : {}),
          ...(departmentRelation ? { department: departmentRelation } : {}),
          ...(subjectsRelation ? { subjects: subjectsRelation } : {}),
        },
        include: this.userInclude,
      })) as UserWithRelations;

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
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Указанная группа, кафедра или предмет не найдены.',
        );
      }

      throw err;
    }
  }

  // Обновление пользователя
  async updateUser(
    id: number,
    dto: UpdateUserDto,
  ): Promise<UserResponse> {
    if (
      typeof dto.fullName === 'undefined' &&
      typeof dto.password === 'undefined' &&
      typeof dto.groupId === 'undefined' &&
      typeof dto.departmentId === 'undefined' &&
      typeof dto.subjectIds === 'undefined'
    ) {
      throw new BadRequestException('Нет данных для обновления.');
    }

    const dataToUpdate: Prisma.UserUpdateInput = {};

    if (typeof dto.fullName !== 'undefined') {
      const fullName = dto.fullName.trim();
      if (!fullName) {
        throw new BadRequestException(
          'ФИО не может быть пустым.',
        );
      }
      dataToUpdate.fullName = fullName;
    }

    if (typeof dto.password !== 'undefined') {
      if (!dto.password.trim()) {
        throw new BadRequestException(
          'Пароль не может быть пустым.',
        );
      }
      dataToUpdate.password = dto.password;
    }

    const groupRelation = this.buildUpdateRelation(dto.groupId, 'group');
    if (groupRelation) {
      dataToUpdate.group = groupRelation;
    }

    const departmentRelation = this.buildUpdateRelation(
      dto.departmentId,
      'department',
    );
    if (departmentRelation) {
      dataToUpdate.department = departmentRelation;
    }

    if (typeof dto.subjectIds !== 'undefined') {
      const subjectIds = this.normalizeSubjectIds(dto.subjectIds) ?? [];
      dataToUpdate.subjects = {
        set: subjectIds.map((subjectId) => ({ id: subjectId })),
      };
    }

    try {
      const user = (await this.prisma.user.update({
        where: { id },
        data: dataToUpdate,
        include: this.userInclude,
      })) as UserWithRelations;

      return this.mapUser(user);
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Пользователь или связанные записи не найдены.',
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

  private buildConnectRelation(
    value: number | null | undefined,
    field: 'group' | 'department',
  ): { connect: { id: number } } | undefined {
    if (typeof value === 'undefined' || value === null) {
      return undefined;
    }

    const parsed = this.parseRelationId(value, field);
    return { connect: { id: parsed } };
  }

  private buildUpdateRelation(
    value: number | null | undefined,
    field: 'group' | 'department',
  ):
    | { connect: { id: number } }
    | { disconnect: true }
    | undefined {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (value === null) {
      return { disconnect: true };
    }

    const parsed = this.parseRelationId(value, field);
    return { connect: { id: parsed } };
  }

  private parseRelationId(
    value: number | null | undefined,
    field: 'group' | 'department',
  ): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      const fieldName = field === 'group' ? 'группы' : 'кафедры';
      throw new BadRequestException(
        `Некорректный идентификатор ${fieldName}.`,
      );
    }

    return parsed;
  }

  private normalizeSubjectIds(
    subjectIds?: number[],
  ): number[] | undefined {
    if (typeof subjectIds === 'undefined') {
      return undefined;
    }

    if (!Array.isArray(subjectIds)) {
      throw new BadRequestException(
        'Список предметов должен быть массивом чисел.',
      );
    }

    const normalized = subjectIds.map((value) => Number(value));

    if (
      normalized.some(
        (subjectId) => !Number.isInteger(subjectId) || subjectId <= 0,
      )
    ) {
      throw new BadRequestException(
        'Некорректный идентификатор предмета.',
      );
    }

    return Array.from(new Set(normalized));
  }

  private mapUser(user: UserWithRelations): UserResponse {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roles: user.roles.map((role) => role.name),
      group: user.group ? { id: user.group.id, name: user.group.name } : null,
      department: user.department
        ? { id: user.department.id, name: user.department.name }
        : null,
      subjects: (user.subjects ?? []).map((subject) => ({
        id: subject.id,
        name: subject.name,
      })),
    };
  }
}
