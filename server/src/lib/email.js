import nodemailer from "nodemailer";

export const sendPasswordResetEmail = async ({ to, resetUrl, fullName }) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || (user ? `ChatFlow <${user}>` : "ChatFlow <no-reply@ialksng.me>");
  const replyTo = process.env.EMAIL_REPLY_TO || user || "no-reply@ialksng.me";

  if (!user || !pass) {
    console.warn("[EMAIL WARNING] EMAIL_USER or EMAIL_PASS not configured in environment variables. Email was not dispatched.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 40px 16px; color: #f3f4f6;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #111827; border-radius: 12px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #1f2937;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px;">ChatFlow</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #9ca3af;">Security & Password Recovery</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 15px; margin: 0 0 16px; color: #f3f4f6;">Hi ${fullName || "there"},</p>
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px; color: #9ca3af;">
                We received a request to reset your password for your <strong>ChatFlow</strong> account. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
                  Reset Password
                </a>
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #6b7280; margin: 24px 0 0;">
                If you didn't ask to reset your password, please ignore this email or reach out to support. Your password will remain secure and unchanged.
              </p>
              <hr style="border: none; border-top: 1px solid #1f2937; margin: 24px 0;">
              <p style="font-size: 12px; color: #6b7280; margin: 0; word-break: break-all;">
                Having trouble with the button? Copy and paste this URL into your browser:<br>
                <a href="${resetUrl}" style="color: #38bdf8; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #0a0e17; text-align: center; font-size: 12px; color: #4b5563; border-top: 1px solid #1f2937;">
              &copy; ${new Date().getFullYear()} ChatFlow. Powered by ialksng.me
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `Hi ${fullName || "there"},\n\nYou requested a password reset for ChatFlow. Click the link below to set a new password:\n${resetUrl}\n\nThis link is valid for 1 hour.\n\nIf you did not make this request, you can safely ignore this email.`;

    const info = await transporter.sendMail({
      from,
      to,
      replyTo,
      subject: "Reset your ChatFlow password",
      text,
      html,
    });

    console.log(`[EMAIL DISPATCHED] Reset email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[EMAIL ERROR] Failed to send password reset email:", error.message);
    return false;
  }
};
