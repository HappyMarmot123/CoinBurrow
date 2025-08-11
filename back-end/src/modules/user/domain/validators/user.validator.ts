import { z } from 'zod';

export const emailSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

export const createUserSchema = emailSchema.extend({
  username: z.string().min(1, { message: 'Username is required.' }),
  password: z
    .string()
    .length(6, { message: 'Password must be 6 characters.' })
    .regex(/^\d+$/, {
      message: 'Password must contain only numbers.',
    }),
});

export const loginUserSchema = emailSchema.extend({
  password: z.string().min(1, { message: 'Password is required.' }),
});

export type EmailDto = z.infer<typeof emailSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type LoginUserDto = z.infer<typeof loginUserSchema>;
