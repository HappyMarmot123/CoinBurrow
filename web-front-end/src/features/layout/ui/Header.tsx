"use client";

import { useHeader } from "@/features/layout/hooks/useHeader";
import React, { memo, useRef } from "react";
import { Logo } from "@/features/layout/components/Logo";
import { MenuList } from "@/features/layout/components/MenuList";
import { RightInterface } from "@/features/layout/components/RightInterface";

export const Header = memo(() => {
  const headerRef = useRef<HTMLElement>(null);

  useHeader(headerRef);

  return (
    <header ref={headerRef} className="fixed top-0 left-0 right-0 z-30">
      <section className="px-8 h-16 grid grid-cols-10 items-center">
        <div className="col-span-2">
          <Logo />
        </div>
        <div className="col-span-5">
          <MenuList />
        </div>
        <div className="col-span-3 flex justify-end">
          <RightInterface />
        </div>
      </section>
    </header>
  );
});

Header.displayName = "Header";
