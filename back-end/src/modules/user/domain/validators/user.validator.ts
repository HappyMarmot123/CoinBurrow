import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(1, { message: 'Username is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    }),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
