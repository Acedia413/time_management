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
  UploadedFile,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService, TaskResponse } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Request } from 'express';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
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
  // Обновляет статус задачи
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TaskResponse> {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.updateTaskStatus(id, dto.status, userId, roles);
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
  // Создает отправку с файлом
  @Post(':id/submissions/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadSubmission(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    const fileUrl = file ? `/uploads/${file.filename}` : null;
    return this.tasksService.createSubmission(id, userId, roles, {
      content: null,
      fileUrl,
    });
  }
  // Удаляет отправку
  @Delete(':taskId/submissions/:submissionId')
  deleteSubmission(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.sub;
    const roles = req.user?.roles ?? [];
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tasksService.deleteSubmission(taskId, submissionId, userId, roles);
  }
}
