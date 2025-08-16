import axios from "axios";
import { apiClient } from ".";
import { LoginRequestDto, LoginResponseDto } from "../dto/auth.dto";

interface ErrorResponse {
  message: string;
  statusCode: number;
  error: string;
}

export const login = async (
  data: LoginRequestDto
): Promise<LoginResponseDto> => {
  try {
    const response = await apiClient.post<LoginResponseDto>(
      "/auth/login",
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const errorData = error.response.data as ErrorResponse;
      throw new Error(errorData.message);
    }
    throw new Error("An unexpected error occurred during login.");
  }
};
