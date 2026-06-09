import { z } from "zod";

const baseSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  phone: z.string().min(10),
  password: z.string().min(6),
});

// Public registration: referrer + placement required
export const registerSchema = baseSchema.extend({
  referrerUsername: z.string().min(1),
  placementParentUsername: z.string().min(1),
});

// Superadmin registration: referrer + placement optional, role assignable (no superadmin)
export const adminRegisterSchema = baseSchema.extend({
  referrerUsername: z.string().optional(),
  placementParentUsername: z.string().optional(),
  role: z.enum(["admin", "staff", "user"]).optional().default("user"),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
