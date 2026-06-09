import { Schema, model, Document, Types } from "mongoose";

export interface IRefreshToken extends Document {
  selector: string;
  tokenHash: string;
  userId?: Types.ObjectId;
  adminId?: Types.ObjectId;
  role: "admin" | "buyer";
  expiresAt: Date;
  revokedAt?: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  selector: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  adminId: { type: Schema.Types.ObjectId, ref: "Admin" },
  role: { type: String, required: true, enum: ["admin", "buyer"] },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  revokedAt: { type: Date },
});

export const RefreshToken = model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
