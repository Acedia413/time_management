import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserResponse, UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { Request } from 'express';

type AuthenticatedRequest = Request & { user?: { roles?: string[] } };

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<UserResponse[]> {
    return this.usersService.findStudentsAndTeachers();
  }
  // Метод создания пользователя
  @Post()
  create(
    @Body() dto: CreateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
    this.ensureAdmin(req);
    return this.usersService.createUser(dto);
  }
  // Метод удаления пользователя
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    this.ensureAdmin(req);
    return this.usersService.deleteUser(id);
  }
  // Метод проверки "админа"
  private ensureAdmin(req: AuthenticatedRequest) {
    const roles = req.user?.roles ?? [];
    if (!roles.map((r) => r.toUpperCase()).includes('ADMIN')) {
      throw new ForbiddenException(
        'Только администратор может выполнять это действие',
      );
    }
  }
}
