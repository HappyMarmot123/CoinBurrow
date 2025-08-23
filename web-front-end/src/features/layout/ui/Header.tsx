"use client";

import { Button } from "@/shared/components/Button";
import { useModal } from "@/shared/contexts/ModalContext";
import { useHeader } from "@/features/layout/hooks/useHeader";
import React, { useRef } from "react";
import { useAuthStore } from "@/app/store/useAuthStore";
import { useRouter } from "next/navigation";

export const Header = () => {
  const headerRef = useRef<HTMLElement>(null);
  const { openModal } = useModal();
  const { isLoggedIn, logout } = useAuthStore();
  const router = useRouter();

  useHeader(headerRef);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header ref={headerRef} className="fixed top-0 left-0 right-0 z-30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-xl font-bold logo-gradient">CoinBurrow</h1>
        <nav>
          {isLoggedIn ? (
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <>
              <Button
                variant="primaryGreen"
                onClick={() => openModal("qrForm")}
              >
                Login
              </Button>
              <Button
                variant="secondary"
                className="ml-4"
                onClick={() => openModal("signup")}
              >
                Sign Up
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
