import { RoleName } from '@prisma/client';

export class CreateUserDto {
  username: string;
  password: string;
  fullName: string;
  role: RoleName | string;
  groupId?: number;
}
