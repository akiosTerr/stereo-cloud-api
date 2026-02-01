import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendVerificationEmail(to: string, confirmLink: string): Promise<void> {
    const from = this.configService.get<string>('RESEND_FROM') || 'Cloud Midia <onboarding@resend.dev>';
    const { error } = await this.resend.emails.send({
      from,
      to: [to],
      subject: 'Confirm your email',
      template: {
        id: 'email-confirmation',
        variables: { confirmLink },
      },
    });
    if (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }
}
