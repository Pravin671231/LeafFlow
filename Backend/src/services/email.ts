import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST) throw new Error("SMTP_HOST is not set");
  if (!SMTP_USER) throw new Error("SMTP_USER is not set");
  if (!SMTP_PASS) throw new Error("SMTP_PASS is not set");

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || "no-reply@leafflow.com",
    to,
    subject: "Your LeafFlow OTP",
    text: `Your one-time password is: ${otp}\n\nThis OTP is valid for 5 minutes. Do not share it with anyone.`,
  });
}
