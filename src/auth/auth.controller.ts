import { Controller, Post, Body, ConflictException, Get, UseGuards, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';

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

  @Post('validateToken')
  async validateToken(@Body() body: { token?: string }, @Headers('authorization') authHeader?: string) {
    let token: string | undefined;
    
    // Try to get token from body first
    if (body.token) {
      token = body.token;
    } 
    // Otherwise, try to extract from Authorization header
    else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      return { valid: false, error: 'Token not provided' };
    }
    
    return this.authService.validateToken(token);
  }

  @Get('validateToken')
  @UseGuards(JwtAuthGuard)
  async validateTokenFromHeader() {
    // This endpoint validates token from Authorization header using the guard
    return { valid: true, message: 'Token is valid' };
  }
}
