import { RoleName } from '@prisma/client';

type RoleInput = RoleName | Lowercase<RoleName>;

export class CreateUserDto {
  username: string;
  password: string;
  fullName: string;
  role: RoleInput;
  groupId?: number;
  departmentId?: number | null;
  subjectIds?: number[];
}
