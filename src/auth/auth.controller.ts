import { Controller, Post, Body, Get, UseGuards, Headers, Query } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TurnstileService } from './turnstile.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private turnstileService: TurnstileService,
  ) {}

  @Post('signup')
  async signup(
    @Body()
    body: {
      email: string;
      name: string;
      password: string;
      channel_name: string;
      turnstileToken: string;
    },
  ) {
    await this.turnstileService.verify(body.turnstileToken);
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = await this.usersService.create(
      body.email,
      body.name,
      body.password,
      body.channel_name,
      token,
      expires,
    );
    await this.authService.sendVerificationEmail(user.email, token);
    return { message: 'Please check your email to confirm your account.' };
  }

  @Get('confirm-email')
  async confirmEmail(@Query('token') token: string) {
    const user = await this.usersService.confirmEmailByToken(token);
    return { message: 'Email confirmed. You can sign in.', email: user.email };
  }

  @Post('resend-confirmation')
  async resendConfirmation(@Body() body: { email: string }) {
    const sent = await this.authService.resendVerificationEmail(body.email);
    if (!sent) {
      return { message: 'User not found or email already verified.', sent: false };
    }
    return { message: 'Confirmation email sent. Please check your inbox.', sent: true };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login({ id: user.id, email: user.email, channel_name: user.channel_name });
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
