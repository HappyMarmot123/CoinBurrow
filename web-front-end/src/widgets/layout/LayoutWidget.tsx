import { Header } from "@/features/layout/ui/Header";
import React from "react";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import AuthStoreInitializer from "@/app/store/AuthStoreInitializer";
import { ModalProvider } from "@/shared/contexts/ModalContext";
import { Modal } from "@/features/auth/ui";

type LayoutWidgetProps = {
  children: React.ReactNode;
};

export const LayoutWidget = async ({ children }: LayoutWidgetProps) => {
  const headersList = await headers();
  const isLoggedIn = headersList.get("x-is-logged-in") === "true";

  return (
    <>
      <AuthStoreInitializer isLoggedIn={isLoggedIn} />
      <Toaster richColors closeButton />
      <ModalProvider>
        <Header />
        <Modal />
        <main>{children}</main>
      </ModalProvider>
    </>
  );
};
