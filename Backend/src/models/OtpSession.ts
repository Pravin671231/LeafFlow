import { Schema, model, Document } from "mongoose";

export type OtpPurpose = "admin_login" | "admin_forgot" | "admin_reset" | "buyer_login";

export interface IOtpSession extends Document {
  purpose: OtpPurpose;
  identifier: string;
  otpHash: string;
  expiresAt: Date;
  attemptCount: number;
}

const OtpSessionSchema = new Schema<IOtpSession>({
  purpose: {
    type: String,
    required: true,
    enum: ["admin_login", "admin_forgot", "admin_reset", "buyer_login"],
  },
  identifier: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  attemptCount: { type: Number, default: 0 },
});

export const OtpSession = model<IOtpSession>("OtpSession", OtpSessionSchema);
