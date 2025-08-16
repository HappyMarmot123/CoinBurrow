import { z } from "zod";
import { loginSchema } from "../schemas/auth.schema";

export type LoginRequestDto = z.infer<typeof loginSchema>;

export interface LoginResponseDto {
  mobileToken: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
