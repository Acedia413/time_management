import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// Добавлена исключительная ситуация под неверный идентификатор кафедры
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
}
