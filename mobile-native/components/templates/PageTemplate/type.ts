import { PropsWithChildren } from "react";

import { HeaderProps } from "@/components/organisms/header/type";

export type PageTemplateProps = PropsWithChildren<{
  headerProps: HeaderProps;
}>;
