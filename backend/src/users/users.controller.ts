import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse, UsersService } from './users.service';

type AuthenticatedRequest = Request & { user?: { roles?: string[] } };

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('teacher-stats')
  getTeacherStats(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ activeStudents: number }> {
    const user = req.user as any;
    const id = Number(user?.sub);

    if (!id || isNaN(id)) {
      throw new ForbiddenException('Не удалось определить пользователя');
    }
    return this.usersService.getTeacherStats(id);
  }

  @Get('count')
  count(): Promise<{ count: number }> {
    return this.usersService.countAll();
  }

  @Get()
  findAll(): Promise<UserResponse[]> {
    return this.usersService.findStudentsAndTeachers();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
    this.ensureAdmin(req);
    return this.usersService.findOne(id);
  }

  // Создание записи пользователя
  @Post()
  create(
    @Body() dto: CreateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
    this.ensureAdmin(req);
    return this.usersService.createUser(dto);
  }
  // Обновление записи пользователя
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
    this.ensureAdmin(req);
    return this.usersService.updateUser(id, dto);
  }

  // Удаление записи пользователя
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    this.ensureAdmin(req);
    return this.usersService.deleteUser(id);
  }

  // Проверка роли "админ"
  private ensureAdmin(req: AuthenticatedRequest) {
    const roles = req.user?.roles ?? [];
    if (!roles.map((r) => r.toUpperCase()).includes('ADMIN')) {
      throw new ForbiddenException(
        'Доступ запрещен: требуется роль администратора.',
      );
    }
  }
}
