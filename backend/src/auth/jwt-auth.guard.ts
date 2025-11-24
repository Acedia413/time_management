import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        username: string;
        roles?: string[];
      }>(token);
      (
        req as Request & {
          user?: { sub: number; username: string; roles?: string[] };
        }
      ).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
