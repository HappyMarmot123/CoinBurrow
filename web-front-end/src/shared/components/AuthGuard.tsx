import React from "react";
import { useAuthStore } from "@/app/store/useAuthStore";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  if (isLoggedIn) {
    return <>{children}</>;
  } else {
    return null; // Or render a fallback component if needed
  }
};
