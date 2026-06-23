// apps/api/src/common/email/email.service.ts
//
// Black & Gold luxury email service — CarsAuto / CarsAuto
// Supports Gmail App Password and SMTP providers.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { buildVerificationEmail } from './templates/verification.template';
import { buildPasswordResetEmail } from './templates/password-reset.template';

const MAX_RETRIES     = 3;
const RETRY_DELAY_MS  = 1_000;
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET']);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private configured = false;

  onModuleInit() {
    const host      = process.env.SMTP_HOST;
    const user      = process.env.SMTP_USER;
    const pass      = process.env.SMTP_PASS;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    // FIX: When both SMTP_HOST and GMAIL_USER are set (common in dev — people
    // leave both blocks filled in from copy-pasted .env templates), prefer the
    // Gmail "service" transport. nodemailer's `service: 'gmail'` preset picks
    // the correct host/port/secure combination internally, avoiding the
    // "wrong version number" TLS error caused by a mismatched SMTP_PORT /
    // SMTP_SECURE pair on the generic host transport.
    if (gmailUser && gmailPass) {
      if (host && user && pass) {
        this.logger.warn(
          '⚠️  Both SMTP_HOST and GMAIL_USER are set in .env — using GMAIL_USER ' +
          '(remove SMTP_HOST/SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_APP_PASSWORD to silence this).',
        );
      }
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
      this.configured = true;
      this.logger.log(`✅ SMTP configured via GMAIL_USER (${gmailUser})`);
    } else if (host && user && pass) {
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
      this.logger.log('✅ SMTP configured via SMTP_HOST');
    } else {
      this.logger.warn(
        '⚠️  Email NOT configured — set GMAIL_USER + GMAIL_APP_PASSWORD in .env. Emails will be skipped.',
      );
    }
  }

  private get fromAddress(): string {
    return process.env.MAIL_FROM
      ?? process.env.SMTP_USER
      ?? process.env.GMAIL_USER
      ?? 'noreply@carsauto.app';
  }

  private sanitise(v: string) { return v.replace(/[\r\n]/g, ' '); }

  async sendMail(options: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    if (!this.configured || !this.transporter) {
      this.logger.warn(`📧 Email skipped (unconfigured): to=${options.to}`);
      return;
    }
    const mail = {
      from:    `"CarsAuto" <${this.fromAddress}>`,
      to:      this.sanitise(options.to),
      subject: this.sanitise(options.subject),
      html:    options.html,
      text:    options.text,
    };
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.transporter.sendMail(mail);
        this.logger.log(`📧 Email sent → ${options.to} | "${options.subject}"`);
        return;
      } catch (err: any) {
        lastError = err;
        if (!RETRYABLE_CODES.has(err?.code ?? '') || attempt === MAX_RETRIES) break;
        this.logger.warn(`📧 Attempt ${attempt} failed (${err.code}), retrying…`);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
    this.logger.error(`📧 Delivery failed → ${options.to}: ${lastError?.message}`);
    // Non-fatal — do not rethrow
  }

  // ─── OTP ─────────────────────────────────────────────────────────────────────

  async sendOtp(email: string, code: string): Promise<void> {
    const year = new Date().getFullYear();
    const html = `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>کۆدی دەستپێکردن — CarsAuto</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Georgia,serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="480"
               style="max-width:480px;width:100%;background:#111111;
                      border-radius:4px;overflow:hidden;border:1px solid #2a2a2a;">

          <!-- Top gold line -->
          <tr>
            <td style="background:linear-gradient(90deg,#8b6914 0%,#c9a84c 50%,#8b6914 100%);
                       height:3px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;background:#0d0d0d;">
              <h1 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;
                         font-weight:400;letter-spacing:4px;text-transform:uppercase;
                         color:#c9a84c;">CARS AUTO</h1>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;
                        letter-spacing:3px;text-transform:uppercase;color:#555;">
                CARSAUTO PRO
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;
                        letter-spacing:2px;text-transform:uppercase;color:#c9a84c;">
                کۆدی دەستپێکردن
              </p>
              <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:13px;
                        color:#666;">
                ئەم کۆدەی خوارەوە بنووسە بۆ دەستپێکردن
              </p>

              <!-- OTP Code box -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                     style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#0d0d0d;border:1px solid #c9a84c;
                             border-radius:4px;padding:20px 48px;text-align:center;">
                    <span style="font-family:'Courier New',monospace;font-size:42px;
                                 font-weight:700;letter-spacing:12px;color:#c9a84c;
                                 display:block;">
                      ${code}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Expiry -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                     style="margin-bottom:24px;">
                <tr>
                  <td style="background:#1a1500;border:1px solid #3d3000;
                             border-radius:2px;padding:12px 20px;text-align:center;">
                    <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#a07820;">
                      ⏱ &nbsp;تەنها
                      <strong style="color:#c9a84c;">٥ خولەک</strong>
                      کاریگەرە
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;
                        color:#444;line-height:1.6;">
                ئەگەر ئەتو ئەم داواکاریەت نەکردووە،<br/>
                ئەم ئیمەیڵە پشتگوێ بخە.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 24px;text-align:center;background:#0d0d0d;
                       border-top:1px solid #1e1e1e;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;
                        letter-spacing:1px;color:#333;">
                © ${year} CarsAuto &nbsp;·&nbsp; CarsAuto
              </p>
            </td>
          </tr>

          <!-- Bottom gold line -->
          <tr>
            <td style="background:linear-gradient(90deg,#8b6914 0%,#c9a84c 50%,#8b6914 100%);
                       height:3px;font-size:0;">&nbsp;</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await this.sendMail({
      to:      email,
      subject: '✦ کۆدی دەستپێکردن — CarsAuto',
      html,
      text: `CarsAuto — کۆدی دەستپێکردن\n\nکۆدەکەت: ${code}\n\nتەنها ٥ خولەک کاریگەرە.`,
    });
  }

  // ─── Verification email ───────────────────────────────────────────────────

  async sendVerificationEmail(options: {
    to: string;
    userName: string;
    verificationUrl: string;
    expiresInHours: number;
  }): Promise<void> {
    const { html, text } = buildVerificationEmail({
      userName:        options.userName,
      verificationUrl: options.verificationUrl,
      expiresInHours:  options.expiresInHours,
    });
    await this.sendMail({
      to:      options.to,
      subject: '✦ پشتڕاستکردنەوەی ئیمەیڵ — CarsAuto',
      html,
      text,
    });
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  async sendPasswordResetEmail(options: {
    to: string;
    userName: string;
    resetUrl: string;
    expiresInMinutes: number;
    ipAddress?: string;
  }): Promise<void> {
    const { html, text } = buildPasswordResetEmail({
      userName:         options.userName,
      resetUrl:         options.resetUrl,
      expiresInMinutes: options.expiresInMinutes,
      ipAddress:        options.ipAddress,
    });
    await this.sendMail({
      to:      options.to,
      subject: '🔐 گۆڕینی پاسوۆرد — CarsAuto',
      html,
      text,
    });
  }
}
