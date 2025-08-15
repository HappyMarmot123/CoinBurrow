import { apiClient } from ".";
import { LoginRequestDto, LoginResponseDto } from "../dto/auth.dto";

export const login = async (
  data: LoginRequestDto
): Promise<LoginResponseDto> => {
  const response = await apiClient.post<LoginResponseDto>("/auth/login", data);
  return response.data;
};
