import { z } from 'zod';

export const emailSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

export const createUserSchema = emailSchema.extend({
  username: z.string().min(1, { message: 'Username is required.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    }),
});

export const loginUserSchema = emailSchema.extend({
  password: z.string().min(1, { message: 'Password is required.' }),
});

export type EmailDto = z.infer<typeof emailSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type LoginUserDto = z.infer<typeof loginUserSchema>;
