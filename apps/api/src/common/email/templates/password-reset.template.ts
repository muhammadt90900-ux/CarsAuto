// apps/api/src/common/email/templates/password-reset.template.ts
//
// HTML email for password reset.
// Matches the design language of verification.template.ts.
// Renders correctly in Gmail, Outlook, Apple Mail, and plain text.

export function buildPasswordResetEmail(options: {
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
  ipAddress?: string;
}): { html: string; text: string } {
  const { userName, resetUrl, expiresInMinutes, ipAddress } = options;

  const safeName     = escapeHtml(userName);
  const safeIp       = ipAddress ? escapeHtml(ipAddress) : null;
  const expiryLabel  = expiresInMinutes >= 60
    ? `${expiresInMinutes / 60} کاتژمێر / ${expiresInMinutes / 60} hour(s)`
    : `${expiresInMinutes} خولەک / ${expiresInMinutes} minute(s)`;

  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password — Cars Auto</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background-color:#f3f4f6;padding:40px 0;">
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

          <!-- Lock icon band -->
          <tr>
            <td style="background:#fef3c7;padding:16px 40px;text-align:center;
                       border-bottom:2px solid #fde68a;">
              <span style="font-size:32px;">🔐</span>
              <span style="font-size:15px;font-weight:600;color:#92400e;margin-left:10px;
                           vertical-align:middle;">
                گۆڕینی پاسوۆرد / Password Reset
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                سڵاو <strong>${safeName}</strong>،
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                داواکاریت بۆ گۆڕینی پاسوۆردی ئەکاونتت کرا. دوگمەی خوارەوە بکە بۆ داناندنی
                پاسوۆردێکی نوێ.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                A password reset was requested for your account. Click the button below to
                set a new password.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                     style="margin:0 auto 32px;">
                <tr>
                  <td style="border-radius:8px;background:#2563eb;">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;
                              font-size:16px;font-weight:700;text-decoration:none;
                              border-radius:8px;letter-spacing:0.3px;">
                      ✅ گۆڕینی پاسوۆرد / Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                     style="background:#eff6ff;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:#1e40af;">
                      ⏰ ئەم لینکە تەنها <strong>${expiryLabel}</strong> کاریگەرە.<br/>
                      This link expires in <strong>${expiryLabel}</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                     style="background:#fef2f2;border-radius:8px;border-left:4px solid #ef4444;
                            margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#991b1b;">
                      ⚠️ ئەگەر ئەتو ئەم داواکاریەت نەکردبوو:
                    </p>
                    <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6;">
                      ئەم ئیمەیڵە پشتگوێ بخە. کەس دەتوانێت ئەکاونتەکەت بگۆڕێت بێ ئەم لینکە.<br/>
                      <span style="color:#991b1b;">If you did not request this, ignore this email.
                      Your account is safe — no changes were made.</span>
                    </p>
                    ${safeIp ? `<p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                      Request IP: <code>${safeIp}</code></p>` : ''}
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;
                        word-break:break-all;">
                ئەگەر دوگمەکە کار نەکرد، ئەم ئادرەسە لە براوزەرەکەتدا بنووسە:<br/>
                If the button doesn't work, paste this URL into your browser:<br/>
                <span style="color:#2563eb;">${resetUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;
                       border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
                © ${new Date().getFullYear()} Cars Auto — کاربپلاتفۆرمی ئارامییەکان
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ئەم ئیمەیڵ بۆ مەبەستی ئامێرزی نێردراوە. تکایە وەڵام مەدەرەوە.
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
    `Cars Auto — گۆڕینی پاسوۆرد / Password Reset`,
    ``,
    `سڵاو ${userName},`,
    ``,
    `بۆ گۆڕینی پاسوۆردت ئەم لینکە بگرە:`,
    `Reset your password using this link:`,
    ``,
    resetUrl,
    ``,
    `ئەم لینکە بۆ ${expiryLabel} کاریگەرە. / This link expires in ${expiryLabel}.`,
    ``,
    `ئەگەر ئەتو ئەم داواکاریەت نەکردبوو، ئەم ئیمەیڵە پشتگوێ بخە.`,
    `If you did not request this, ignore this email. No changes were made.`,
    ...(safeIp ? [``, `Request IP: ${safeIp}`] : []),
    ``,
    `— Cars Auto`,
  ].join('\n');

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
