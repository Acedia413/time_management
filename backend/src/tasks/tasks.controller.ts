import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService, TaskResponse } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Request } from 'express';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
// Интерфейс для аутентифицированного запроса
type AuthenticatedRequest = Request & {
  user?: { sub: number; roles?: string[] };
};
// Контроллер задач
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest): Promise<TaskResponse[]> {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.findAllForUser(userId, roles);
  }
  // Отдает конкретную задачу, чтобы не подгружать лишние данные
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<TaskResponse> {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.findOneForUser(id, userId, roles);
  }
  // Создает задачу
  @Post()
  create(
    @Body() dto: CreateTaskDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TaskResponse> {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.createTask(dto, userId, roles);
  }

  // Обновляет задачу
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TaskResponse> {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.updateTask(id, dto, userId, roles);
  }

  // Удаляет задачу
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.deleteTask(id, userId, roles);
  }
  // Получить отправки по задаче
  @Get(':id/submissions')
  findSubmissions(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.getSubmissionsForTask(id, userId, roles);
  }
  // Создает отправку
  @Post(':id/submissions')
  createSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSubmissionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.createSubmission(id, userId, roles, dto);
  }
}
