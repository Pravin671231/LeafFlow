import { Schema, model, Document, Types } from "mongoose";

export interface IRefreshToken extends Document {
  tokenHash: string;
  userId?: Types.ObjectId;
  adminId?: Types.ObjectId;
  role: "admin" | "buyer";
  expiresAt: Date;
  revokedAt?: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  tokenHash: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  adminId: { type: Schema.Types.ObjectId, ref: "Admin" },
  role: { type: String, required: true, enum: ["admin", "buyer"] },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date },
});

export const RefreshToken = model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
