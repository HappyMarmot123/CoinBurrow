"use client";

import { Footer, Header } from "@/features/layout/ui";
import { usePathname } from "next/navigation";
import React from "react";
import { useModal } from "@/shared/contexts/ModalContext";
import { SignUpModal } from "@/features/auth/ui/SignUpModal";

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  const pathname = usePathname();
  const { isModalOpen } = useModal();
  return (
    <>
      <Header />
      <div id="noise" />
      <main>{children}</main>
      {pathname !== "/" && <Footer />}
      {isModalOpen && <SignUpModal />}
    </>
  );
};
