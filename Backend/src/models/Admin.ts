import { Schema, model, Document } from "mongoose";

export interface IAdmin extends Document {
  loginEmail: string;
  otpDeliveryEmail: string;
  passwordHash: string;
  name: string;
  role: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    loginEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    otpDeliveryEmail: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "admin" },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

export const Admin = model<IAdmin>("Admin", AdminSchema);
