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
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Request } from 'express';

type AuthenticatedRequest = Request & { user?: { roles?: string[] } };

@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }
  // Добавление Кафедры
  @Post()
  create(@Body() dto: CreateDepartmentDto, @Req() req: AuthenticatedRequest) {
    this.ensureAdmin(req);
    return this.departmentsService.create(dto);
  }
  // Обновление Кафедры
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.departmentsService.update(id, dto);
  }
  // Удаление Кафедры
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.departmentsService.remove(id);
  }

  // Получение списка предметов для кафедры
  @Get(':id/subjects')
  findSubjects(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findSubjects(id);
  }

  private ensureAdmin(req: AuthenticatedRequest) {
    const roles = req.user?.roles ?? [];
    if (!roles.map((role) => role.toUpperCase()).includes('ADMIN')) {
      throw new ForbiddenException(
        'Доступ запрещен: требуется роль администратора.',
      );
    }
  }
}
