import { z } from "zod";

const lightRequirementEnum = z.enum(["low", "medium", "high", "indirect"]);
const waterScheduleEnum = z.enum(["daily", "every-2-days", "weekly", "bi-weekly"]);
const humidityEnum = z.enum(["low", "medium", "high"]);

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  commonName: z.string().min(1, "Common name is required"),
  scientificName: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be positive"),
  compareAtPrice: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  images: z.array(z.string()).optional(),
  lightRequirement: lightRequirementEnum,
  waterSchedule: waterScheduleEnum,
  humidity: humidityEnum,
  petFriendly: z.boolean(),
  potSize: z.string().optional(),
  heightRange: z.string().optional(),
  careInstructions: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
