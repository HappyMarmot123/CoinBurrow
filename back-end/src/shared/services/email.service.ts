import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter, SentMessageInfo } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'reyna.denesik48@ethereal.email',
        pass: 'mZPEsMjKj7GDRpTAtn',
      },
    });
  }

  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    const mailOptions = {
      from: '"CoinBurrow" <noreply@coinburrow.com>',
      to,
      subject: 'Welcome to CoinBurrow!',
      html: `<h1>Welcome, ${username}!</h1><p>Thank you for signing up. You can now log in to your account.</p>`,
    };

    try {
      const info: SentMessageInfo =
        await this.transporter.sendMail(mailOptions);
      console.log('Message sent: %s', info.messageId);
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.error('Failed to send welcome email', error);
    }
  }
}
