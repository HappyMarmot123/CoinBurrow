import { Footer, Header } from "@/features/layout/ui";
import React from "react";
import { Toaster } from "sonner";

type LayoutWidgetProps = {
  children: React.ReactNode;
};

export const LayoutWidget = ({ children }: LayoutWidgetProps) => {
  return (
    <>
      <Toaster richColors closeButton />
      <Header />
      <div id="noise" />
      <main>{children}</main>
      <Footer />
    </>
  );
};
