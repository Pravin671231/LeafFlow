import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: "Your LeafFlow OTP",
    text: `Your one-time password is: ${otp}\n\nThis OTP is valid for 5 minutes. Do not share it with anyone.`,
  });
}
