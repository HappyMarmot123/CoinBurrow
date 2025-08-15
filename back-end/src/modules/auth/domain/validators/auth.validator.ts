import { z } from 'zod';

export const QrLoginSchema = z.object({
  sessionToken: z.string(),
  mobileToken: z.string(),
  user: z.object({
    id: z.string(),
  }),
});

export type QrLoginDto = z.infer<typeof QrLoginSchema>;
