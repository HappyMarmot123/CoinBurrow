"use client";

import { useRef } from "react";
import { useAuthStore } from "@/app/store/useAuthStore";

interface AuthStoreInitializerProps {
  isLoggedIn: boolean;
}

function AuthStoreInitializer({ isLoggedIn }: AuthStoreInitializerProps) {
  const initialized = useRef(false);
  if (!initialized.current) {
    useAuthStore.setState({ isLoggedIn, isLoading: false });
    initialized.current = true;
  }
  return null;
}

export default AuthStoreInitializer;
