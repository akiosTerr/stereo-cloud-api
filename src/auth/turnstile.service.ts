import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

@Injectable()
export class TurnstileService {
  constructor(private configService: ConfigService) {}

  async verify(token: string): Promise<void> {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new BadRequestException('Verification failed. Please try again.');
    }
    const secret = this.configService.get<string>('TURNISTLE_SECRET_KEY');
    if (!secret) {
      throw new Error('TURNISTLE_SECRET_KEY is not configured');
    }
    const body = new URLSearchParams({
      secret,
      response: token,
    });
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      throw new BadRequestException('Verification failed. Please try again.');
    }
  }
}
