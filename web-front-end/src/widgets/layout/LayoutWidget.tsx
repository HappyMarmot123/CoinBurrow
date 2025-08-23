import { Footer, Header } from "@/features/layout/ui";
import React from "react";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import AuthStoreInitializer from "@/app/store/AuthStoreInitializer";

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
      <Header />
      <div id="noise" />
      <main>{children}</main>
      <Footer />
    </>
  );
};
