import { useMutation } from "@tanstack/react-query";
import { login } from "../api/auth";
import { useAuthStore } from "../store/useAuthStore";

export const useLoginMutation = () => {
  const { login: loginAction } = useAuthStore();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      loginAction(data.mobileToken, data.user);
    },
    onError: (error) => {
      console.error("Login error:", error);
    },
  });
};
