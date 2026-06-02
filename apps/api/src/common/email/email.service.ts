// apps/api/src/common/email/email.service.ts
// Production-ready email service:
//   - SMTP (not gmail-specific) — works with SendGrid, Mailgun, SES, etc.
//   - Graceful degradation: logs a warning and continues if email is unconfigured
//   - Retry on transient SMTP errors (connection refused, timeout)

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { buildVerificationEmail } from './templates/verification.template';
import { buildPasswordResetEmail } from './templates/password-reset.template';

const MAX_RETRIES    = 3;
const RETRY_DELAY_MS = 1_000;
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET']);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private configured = false;

  onModuleInit() {
    const host     = process.env.SMTP_HOST;
    const user     = process.env.SMTP_USER;
    const pass     = process.env.SMTP_PASS;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port:           parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure:         process.env.SMTP_SECURE === 'true',
        auth:           { user, pass },
        pool:           true,
        maxConnections: 5,
        maxMessages:    100,
      });
      this.configured = true;
      this.logger.log('SMTP configured via SMTP_HOST');
    } else if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
      this.configured = true;
      this.logger.log('SMTP configured via GMAIL_USER');
    } else {
      this.logger.warn(
        'Email NOT configured — set SMTP_HOST/SMTP_USER/SMTP_PASS. Emails will be silently skipped.',
      );
    }
  }

  private get fromAddress(): string {
    return process.env.MAIL_FROM ?? process.env.SMTP_USER ?? process.env.GMAIL_USER ?? 'noreply@carsauto.app';
  }

  private sanitise(v: string) { return v.replace(/[\r\n]/g, ' '); }

  async sendMail(options: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    if (!this.configured || !this.transporter) {
      this.logger.warn(`Email skipped (unconfigured): to=${options.to}`);
      return;
    }
    const mail = {
      from:    `"Cars Auto" <${this.fromAddress}>`,
      to:      this.sanitise(options.to),
      subject: this.sanitise(options.subject),
      html:    options.html,
      text:    options.text,
    };
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.transporter.sendMail(mail);
        this.logger.debug(`Email sent to ${options.to}`);
        return;
      } catch (err: any) {
        lastError = err;
        if (!RETRYABLE_CODES.has(err?.code ?? '') || attempt === MAX_RETRIES) break;
        this.logger.warn(`Email attempt ${attempt} failed (${err.code}), retrying…`);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
    this.logger.error(`Email delivery failed to ${options.to}: ${lastError?.message}`);
    // Non-fatal — do not rethrow
  }

  async sendOtp(email: string, code: string): Promise<void> {
    await this.sendMail({
      to:      email,
      subject: 'کۆدی دەستپێکردن - Cars Auto',
      html: `
        <div style="font-family: Arial; direction: rtl; text-align: center; padding: 40px;">
          <h2 style="color: #2563eb;">Cars Auto</h2>
          <p>کۆدی دەستپێکردنەکەت:</p>
          <h1 style="letter-spacing: 8px; color: #1e40af; font-size: 40px;">${code}</h1>
          <p style="color: #6b7280;">ئەم کۆدە تەنها <strong>٥ خولەک</strong> کاریگەرە</p>
        </div>
      `,
      text: `Your OTP: ${code}`,
    });
  }

  async sendVerificationEmail(options: {
    to: string;
    userName: string;
    verificationUrl: string;
    expiresInHours: number;
  }): Promise<void> {
    const { html, text } = buildVerificationEmail({
      userName: options.userName,
      verificationUrl: options.verificationUrl,
      expiresInHours: options.expiresInHours,
    });
    await this.sendMail({
      to:      options.to,
      subject: 'پشتڕاستکردنەوەی ئیمەیڵ / Verify your Cars Auto email',
      html,
      text,
    });
  }
}

  async sendPasswordResetEmail(options: {
    to: string;
    userName: string;
    resetUrl: string;
    expiresInMinutes: number;
    ipAddress?: string;
  }): Promise<void> {
    const { html, text } = buildPasswordResetEmail({
      userName: options.userName,
      resetUrl: options.resetUrl,
      expiresInMinutes: options.expiresInMinutes,
      ipAddress: options.ipAddress,
    });
    await this.sendMail({
      to:      options.to,
      subject: '🔐 گۆڕینی پاسوۆرد / Reset your Cars Auto password',
      html,
      text,
    });
  }
}
