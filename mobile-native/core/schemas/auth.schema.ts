import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at 6 characters long." })
    .max(6, { message: "Password must be at 6 characters long." })
    .regex(/[0-9]/, { message: "Password must contain at least one number." }),
});
