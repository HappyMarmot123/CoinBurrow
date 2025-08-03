import { Href, Link } from "expo-router";
import { ComponentProps } from "react";

export type ExternalLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: Href<string> & string;
};
