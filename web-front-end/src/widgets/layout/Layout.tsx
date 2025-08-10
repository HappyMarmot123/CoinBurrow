import { Footer, Header } from "@/features/layout/ui";
import React from "react";

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Header />
      <div id="noise" />
      <main>{children}</main>
      <Footer />
    </>
  );
};
