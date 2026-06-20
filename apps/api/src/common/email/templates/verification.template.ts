// apps/api/src/common/email/templates/verification.template.ts
//
// Black & Gold luxury email template — CarsAuto / AutoBazaar Pro
// Renders correctly in Gmail, Outlook, Apple Mail, iOS Mail, plain text.

export function buildVerificationEmail(options: {
  userName: string;
  verificationUrl: string;
  expiresInHours: number;
}): { html: string; text: string } {
  const { userName, verificationUrl, expiresInHours } = options;
  const safeName = escapeHtml(userName);
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>پشتڕاستکردنەوەی ئیمەیڵ — Cars Auto</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Georgia,'Times New Roman',serif;">

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600"
               style="max-width:600px;width:100%;background-color:#111111;
                      border-radius:4px;overflow:hidden;
                      border:1px solid #2a2a2a;">

          <!-- Top gold line -->
          <tr>
            <td style="background:linear-gradient(90deg,#8b6914 0%,#c9a84c 40%,#f0d080 60%,#c9a84c 80%,#8b6914 100%);
                       height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:44px 48px 36px;text-align:center;background-color:#0d0d0d;">

              <!-- Logo mark -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1a1a1a,#222);
                             border:1px solid #c9a84c;border-radius:50%;
                             width:64px;height:64px;text-align:center;vertical-align:middle;
                             padding:0;">
                    <span style="font-size:28px;line-height:64px;display:block;">🚗</span>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:26px;
                         font-weight:400;letter-spacing:4px;text-transform:uppercase;
                         color:#c9a84c;">
                CARS AUTO
              </h1>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;
                        letter-spacing:3px;text-transform:uppercase;color:#666;">
                AUTOBAZAAR PRO
              </p>
            </td>
          </tr>

          <!-- Gold divider -->
          <tr>
            <td style="padding:0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="border-top:1px solid #2a2a2a;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 36px;text-align:right;direction:rtl;">

              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;
                        letter-spacing:2px;text-transform:uppercase;color:#c9a84c;">
                پشتڕاستکردنەوەی ئیمەیڵ
              </p>
              <h2 style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;
                         font-weight:400;color:#f5f5f5;line-height:1.4;">
                بەخێربێیت، <span style="color:#c9a84c;">${safeName}</span>
              </h2>

              <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:14px;
                        line-height:1.8;color:#999;">
                سوپاس بۆ تۆمارکردنت لە <strong style="color:#c9a84c;">Cars Auto</strong>،
                پلاتفۆرمی پریمیەمی ئوتومبێل لە عێراق، کوردستان، و ئیمارات.
              </p>
              <p style="margin:0 0 32px;font-family:Arial,sans-serif;font-size:14px;
                        line-height:1.8;color:#777;">
                بۆ چالاककردنی ئەکاونتەکەت، تکایە ئیمەیڵەکەت پشتڕاست بکەرەوە.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 36px;">
                <tr>
                  <td style="border-radius:2px;
                             background:linear-gradient(135deg,#8b6914,#c9a84c,#8b6914);
                             padding:1px;">
                    <a href="${verificationUrl}" target="_blank"
                       style="display:inline-block;padding:14px 40px;
                              background-color:#111111;
                              color:#c9a84c;font-family:Arial,sans-serif;
                              font-size:13px;font-weight:700;
                              letter-spacing:2px;text-transform:uppercase;
                              text-decoration:none;border-radius:1px;">
                      ✦ &nbsp;پشتڕاستکردنەوەی ئیمەیڵ&nbsp; ✦
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry box -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                     style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#1a1500;border:1px solid #3d3000;
                             border-radius:2px;padding:14px 20px;text-align:center;">
                    <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;
                              color:#a07820;line-height:1.6;">
                      ⏱ &nbsp;ئەم لینکە دوای
                      <strong style="color:#c9a84c;">${expiresInHours} کاتژمێر</strong>
                      بەسەر دەچێت
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:12px;color:#555;">
                ئەگەر دوگمەکە کار نەکرد، ئەم ئادرەسە کۆپی بکە:
              </p>
              <p style="margin:0;word-break:break-all;">
                <a href="${verificationUrl}"
                   style="font-family:Arial,sans-serif;font-size:11px;color:#666;
                          text-decoration:underline;">
                  ${verificationUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Bottom gold divider -->
          <tr>
            <td style="padding:0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="border-top:1px solid #2a2a2a;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 28px;text-align:center;background-color:#0d0d0d;">
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;
                        letter-spacing:1px;color:#444;">
                ئەگەر ئەتو ئەم ئەکاونتەت نەکردووە، ئەم ئیمەیڵە پشتگوێ بخە.
              </p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;
                        letter-spacing:1px;color:#333;">
                © ${year} Cars Auto &nbsp;·&nbsp; AutoBazaar Pro
              </p>
            </td>
          </tr>

          <!-- Bottom gold line -->
          <tr>
            <td style="background:linear-gradient(90deg,#8b6914 0%,#c9a84c 40%,#f0d080 60%,#c9a84c 80%,#8b6914 100%);
                       height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = [
    `CARS AUTO — پشتڕاستکردنەوەی ئیمەیڵ`,
    ``,
    `سڵاو ${userName}،`,
    ``,
    `سوپاس بۆ تۆمارکردنت. تکایە ئیمەیڵەکەت پشتڕاست بکەرەوە:`,
    ``,
    verificationUrl,
    ``,
    `ئەم لینکە دوای ${expiresInHours} کاتژمێر بەسەر دەچێت.`,
    ``,
    `ئەگەر ئەتو ئەم ئەکاونتەت نەکردووە، ئەم ئیمەیڵە پشتگوێ بخە.`,
    ``,
    `— Cars Auto`,
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
