import { z } from "zod";

export const createOrderSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(1, "fullName is required"),
    phone: z.string().min(10, "phone must be at least 10 digits"),
    line1: z.string().min(1, "line1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "city is required"),
    state: z.string().min(1, "state is required"),
    pincode: z.string().length(6, "pincode must be 6 digits"),
  }),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
