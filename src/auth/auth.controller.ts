import { Controller, Post, Body, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  @Post('signup')
  async signup(@Body() body: { email: string; name: string; password: string }) {
    try {
      const user = await this.usersService.create(body.email, body.name, body.password);
      return this.authService.login({ id: user.id, email: user.email });
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        throw new ConflictException('Email already exists');
      }
      throw err;
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login({ id: user.id, email: user.email });
  }
}
