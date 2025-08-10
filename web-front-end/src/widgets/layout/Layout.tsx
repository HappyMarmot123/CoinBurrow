"use client";

import { Footer, Header } from "@/features/layout/ui";
import { usePathname } from "next/navigation";
import React from "react";

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
  const pathname = usePathname();
  return (
    <>
      <Header />
      <div id="noise" />
      <main>{children}</main>
      {pathname !== "/" && <Footer />}
    </>
  );
};
