import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  async sendOtp(email: string, code: string) {
    await this.transporter.sendMail({
      from: `"Cars Auto" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'کۆدی دەستپێکردن - Cars Auto',
      html: `
        <div style="font-family: Arial; direction: rtl; text-align: center; padding: 40px;">
          <h2 style="color: #2563eb;">Cars Auto</h2>
          <p>کۆدی دەستپێکردنەکەت:</p>
          <h1 style="letter-spacing: 8px; color: #1e40af; font-size: 40px;">${code}</h1>
          <p style="color: #6b7280;">ئەم کۆدە تەنها <strong>٥ خولەک</strong> کاریگەرە</p>
        </div>
      `,
    });
  }
}
