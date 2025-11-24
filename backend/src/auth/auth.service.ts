import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { roles: true, group: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(data: LoginDto) {
    const { username, password } = data;

    if (!username || !password) {
      throw new BadRequestException('Username and password are required');
    }

    const user = await this.validateUser(username, password);

    const roles = user.roles.map((role) => role.name);
    const payload = { sub: user.id, username: user.username, roles };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roles,
        group: user.group ? { id: user.group.id, name: user.group.name } : null,
      },
    };
  }

  async profile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true, group: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const roles = user.roles.map((role) => role.name);

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roles,
      group: user.group ? { id: user.group.id, name: user.group.name } : null,
    };
  }
}
