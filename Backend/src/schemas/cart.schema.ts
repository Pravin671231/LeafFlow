import { z } from "zod";

export const cartReplaceSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, "productId is required"),
      quantity: z.number().int().min(1, "quantity must be at least 1"),
    })
  ),
});

export type CartReplaceBody = z.infer<typeof cartReplaceSchema>;
