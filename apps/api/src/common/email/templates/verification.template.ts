// apps/api/src/common/email/templates/verification.template.ts
//
// Returns an HTML email for email address verification.
// Designed to render well in Gmail, Outlook, Apple Mail, and plain text.

export function buildVerificationEmail(options: {
  userName: string;
  verificationUrl: string;
  expiresInHours: number;
}): { html: string; text: string } {
  const { userName, verificationUrl, expiresInHours } = options;

  // Sanitise user-supplied strings before embedding in HTML
  const safeName = escapeHtml(userName);

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email — Cars Auto</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600"
               style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);
                       padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;
                         letter-spacing:-0.5px;">
                🚗 Cars Auto
              </h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">
                کاربپلاتفۆرمی ئەرووپا و کوردستان
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">
                پشتڕاستکردنەوەی ئیمەیڵ / Verify your email
              </h2>

              <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
                سڵاو <strong>${safeName}</strong>،
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                سوپاس بۆ تۆمارکردنت لە Cars Auto. بۆ تەواوکردنی ئەکاونتەکەت،
                تکایە دوگمەی خوارەوە بپەرژێنە بۆ پشتڕاستکردنی ئیمەیڵەکەت.
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Hi <strong>${safeName}</strong>, thanks for signing up! Click the button
                below to verify your email address and activate your account.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="border-radius:8px;background-color:#2563eb;">
                    <a href="${verificationUrl}"
                       target="_blank"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;
                              font-size:16px;font-weight:600;text-decoration:none;
                              border-radius:8px;letter-spacing:0.2px;">
                      ✅ پشتڕاستکردنەوەی ئیمەیڵ / Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                     style="background-color:#fef3c7;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                      ⏰ ئەم لینکە دوای <strong>${expiresInHours} کاتژمێر</strong> بەسەر دەچێت.
                      This link expires in <strong>${expiresInHours} hours</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                ئەگەر دوگمەکە کار نەکرد، ئەم لینکەت لە براوزەرەکەت بخەرەوە:
              </p>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                If the button doesn't work, paste this URL into your browser:
              </p>
              <p style="margin:0;word-break:break-all;">
                <a href="${verificationUrl}" style="color:#2563eb;font-size:13px;">
                  ${verificationUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">
                ئەگەر ئەو ئیمەیڵەت نەنێردووە، ئەم ئیمەیڵەیت چەور بکەوە.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                If you didn't create an account with Cars Auto, you can safely ignore
                this email.
              </p>
              <p style="margin:16px 0 0;color:#d1d5db;font-size:11px;">
                © ${new Date().getFullYear()} Cars Auto. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Cars Auto — Email Verification`,
    ``,
    `Hi ${userName},`,
    ``,
    `Please verify your email address by visiting the link below:`,
    ``,
    verificationUrl,
    ``,
    `This link expires in ${expiresInHours} hours.`,
    ``,
    `If you did not create a Cars Auto account, you can safely ignore this email.`,
    ``,
    `— The Cars Auto Team`,
  ].join('\n');

  return { html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
