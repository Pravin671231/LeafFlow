import { Schema, model, Document } from "mongoose";

interface IAddress {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface IUser extends Document {
  email: string;
  googleId?: string;
  name: string;
  phone?: string;
  addresses: IAddress[];
  role: string;
  isVerified: boolean;
}

const AddressSchema = new Schema<IAddress>(
  {
    line1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, sparse: true, unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    addresses: { type: [AddressSchema], default: [] },
    role: { type: String, default: "buyer" },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
