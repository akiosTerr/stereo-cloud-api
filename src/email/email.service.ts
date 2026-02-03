import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface ActivationUserInfo {
  id: string;
  email: string;
  name: string;
  channel_name: string;
  updated_at?: Date;
}

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

  async sendActivationNotification(user: ActivationUserInfo): Promise<void> {
    const from = this.configService.get<string>('RESEND_FROM') || 'Cloud Midia <onboarding@resend.dev>';
    const to = this.configService.get<string>('SUPPORT_EMAIL');
    const body = [
      `New account activated:`,
      ``,
      `Email: ${user.email}`,
      `Name: ${user.name}`,
      `Channel: ${user.channel_name}`,
      `User ID: ${user.id}`,
      `Activated at: ${user.updated_at?.toISOString() ?? new Date().toISOString()}`,
    ].join('\n');

    const { error } = await this.resend.emails.send({
      from,
      to: [to],
      subject: `[WaffleStream] New account activated: ${user.email}`,
      text: body,
    });
    if (error) {
      throw new Error(`Failed to send activation notification: ${error.message}`);
    }
  }
}
