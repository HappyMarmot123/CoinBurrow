import { TextAtom } from "@/components/atoms/TextAtom";
import { ViewAtom } from "@/components/atoms/ViewAtom";
import React from "react";

export interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <ViewAtom className="items-center border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-black">
      <TextAtom type="title">{title}</TextAtom>
    </ViewAtom>
  );
}
