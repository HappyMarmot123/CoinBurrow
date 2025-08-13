import { Footer, Header } from "@/features/layout/ui";
import React from "react";
import { Toaster } from "sonner";
import { Modal } from "./Modal";

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Toaster richColors closeButton />
      <Header />
      <div id="noise" />
      <main>{children}</main>
      <Footer />
      <Modal />
    </>
  );
};
