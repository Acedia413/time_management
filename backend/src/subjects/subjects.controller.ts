import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Request } from 'express';
// Добавлена исключительная ситуация под неверный идентификатор кафедры
type AuthenticatedRequest = Request & { user?: { roles?: string[] } };
@UseGuards(JwtAuthGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  findAll(@Query('departmentId') departmentId?: string) {
    if (departmentId && Number.isNaN(Number(departmentId))) {
      throw new BadRequestException('Некорректный идентификатор кафедры.');
    }

    const parsedDepartmentId = departmentId
      ? Number(departmentId)
      : undefined;

    return this.subjectsService.findAll(parsedDepartmentId);
  }
  // Добавление предмета
  @Post()
  create(
    @Body() dto: CreateSubjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.subjectsService.create(dto);
  }
  // Обновление предмета
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.subjectsService.update(id, dto);
  }
  // Удаление предмета
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.ensureAdmin(req);
    return this.subjectsService.remove(id);
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
