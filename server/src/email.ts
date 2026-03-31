import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM_EMAIL = process.env.RESEND_FROM ?? 'MemorAId <onboarding@resend.dev>';

export type SendInviteResult =
  | { ok: true }
  | { ok: false; reason: 'no_api_key' | 'send_failed'; error?: string };

export async function sendInviteEmail(
  to: string,
  code: string,
  presetLabel?: string
): Promise<SendInviteResult> {
  if (!resend) return { ok: false, reason: 'no_api_key' };

  const link = `${process.env.APP_BASE_URL ?? 'http://localhost:5173'}/login?mode=register&code=${encodeURIComponent(code)}`;
  const subject = presetLabel
    ? `הזמנה ל-MemorAId – ${presetLabel}`
    : 'הזמנה ל-MemorAId';
  const html = `
    <p>היי,</p>
    <p>הוזמנת להתחבר למערכת ניהול MemorAId.</p>
    <p>הנה פרטים להרשמה והתחברות למערכת:</p>
    <p><strong>קוד משפחה להרשמה/כניסה:</strong> ${code}</p>
    <p><strong>לינק להרשמה:</strong> <a href="${link}">${link}</a></p>
    <p>MemorAId – טיפול משפחתי מתואם</p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });
    if (error) return { ok: false, reason: 'send_failed', error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: 'send_failed', error: err?.message ?? 'Unknown error' };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<SendInviteResult> {
  if (!resend) return { ok: false, reason: 'no_api_key' };

  const subject = 'איפוס סיסמה – MemorAId';
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 איפוס סיסמה</h1>
          <p>MemorAId – טיפול משפחתי מתואם</p>
        </div>
        <div class="content">
          <p><strong>שלום,</strong></p>
          <p>קיבלנו בקשה לאיפוס הסיסמה עבור החשבון שלך ב-MemorAId.</p>
          <p>לחץ על הכפתור למטה כדי לאפס את הסיסמה:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">אפס סיסמה</a>
          </div>
          <p>או העתק את הקישור הבא לדפדפן:</p>
          <p style="background: #fff; padding: 10px; border: 1px solid #ddd; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${resetLink}
          </p>
          <div class="warning">
            <strong>⚠️ חשוב לדעת:</strong>
            <ul>
              <li>הקישור תקף ל-<strong>1 שעה</strong> בלבד</li>
              <li>ניתן להשתמש בו פעם אחת בלבד</li>
              <li>אם לא ביקשת איפוס סיסמה, התעלם ממייל זה</li>
            </ul>
          </div>
          <p>אם אתה נתקל בבעיה, צור קשר עם התמיכה שלנו.</p>
          <p><strong>בברכה,<br>צוות MemorAId</strong></p>
        </div>
        <div class="footer">
          <p>מייל זה נשלח אוטומטית, אנא אל תשיב עליו.</p>
          <p>© 2026 MemorAId. כל הזכויות שמורות.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });
    if (error) return { ok: false, reason: 'send_failed', error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: 'send_failed', error: err?.message ?? 'Unknown error' };
  }
}
