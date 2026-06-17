import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  commonName: string;
  scientificName?: string;
  slug: string;
  description?: string;
  categoryId: Types.ObjectId;
  price: number;
  compareAtPrice?: number;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  lightRequirement: "low" | "medium" | "high" | "indirect";
  waterSchedule: "daily" | "every-2-days" | "weekly" | "bi-weekly";
  humidity: "low" | "medium" | "high";
  petFriendly: boolean;
  potSize?: string;
  heightRange?: string;
  careInstructions?: string;
  isActive: boolean;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    commonName: { type: String, required: true, trim: true },
    scientificName: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    images: { type: [String], default: [] },
    lightRequirement: {
      type: String,
      enum: ["low", "medium", "high", "indirect"],
      required: true,
    },
    waterSchedule: {
      type: String,
      enum: ["daily", "every-2-days", "weekly", "bi-weekly"],
      required: true,
    },
    humidity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    petFriendly: { type: Boolean, required: true },
    potSize: { type: String, trim: true },
    heightRange: { type: String, trim: true },
    careInstructions: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: "text", commonName: "text", scientificName: "text" });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ isActive: 1, stock: 1 });

export const Product = model<IProduct>("Product", ProductSchema);
