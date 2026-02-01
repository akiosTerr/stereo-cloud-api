import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.validatePassword(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.email_verified) {
      throw new UnauthorizedException('Please confirm your email before signing in.');
    }
    return user;
  }

  async login(user: { id: string; email: string; channel_name: string }) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      channel_name: user.channel_name,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const confirmLink = `${frontendUrl}/confirm-email?token=${token}`;
    await this.emailService.sendVerificationEmail(email, confirmLink);
  }

  async resendVerificationEmail(email: string): Promise<boolean> {
    const result = await this.usersService.regenerateVerificationToken(email);
    if (!result) {
      return false;
    }
    await this.sendVerificationEmail(email, result.token);
    return true;
  }
}