import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter, SentMessageInfo } from 'nodemailer';

@Injectable()
export class EmailService {
  private GMAIL_ID = process.env.GMAIL_ID;
  private GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;

  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: this.GMAIL_ID, pass: this.GMAIL_PASSWORD },
    });
  }

  async sendResetPWEmail(to: string, resetLink: string): Promise<void> {
    const mailOptions = {
      from: '"CoinBurrow" <mdnsw28@gmail.com>',
      to,
      subject: 'CoinBurrow Password Reset',
      html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #bee3f8; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #bee3f8;">
                    <h1 style="color: #2c5282; margin: 0; font-size: 28px;">&#x1F9AB; CoinBurrow</h1>
                </div>
                <div style="padding: 20px 0;">
                    <p style="margin: 0 0 20px; font-size: 16px;">안녕하세요,</p>
                    <p style="margin: 0 0 20px; font-size: 16px;">비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 계정의 비밀번호를 재설정해주세요.</p>
                    <div style="text-align: center; padding: 20px 0;">
                        <a href="${resetLink}" style="background-color: #3182ce; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">비밀번호 재설정</a>
                    </div>
                    <p style="margin: 0 0 20px; font-size: 16px;">만약 본인이 요청한 것이 아니라면 이 이메일을 무시해 주세요.</p>
                    <p style="margin: 0 0 10px; font-size: 16px;">감사합니다.<br/>CoinBurrow 팀 드림</p>
                </div>
                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #bee3f8; font-size: 12px; color: #777;">
                    <p style="margin: 0 0 10px;">&copy; ${new Date().getFullYear()} CoinBurrow. All Rights Reserved.</p>
                </div>
            </div>
            `,
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
