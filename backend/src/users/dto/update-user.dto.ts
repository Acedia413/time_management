export class UpdateUserDto {
  fullName?: string;
  password?: string;
  groupId?: number | null;
  departmentId?: number | null;
  subjectIds?: number[];
}
