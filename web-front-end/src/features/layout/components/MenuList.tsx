"use client";

import Link from "next/link";
import { memo, useState } from "react";
import isEmpty from "lodash.isempty";

// TODO: 컴포지트 패턴

interface MenuItem {
  name: string;
  href?: string;
  children?: MenuItem[];
}

const menuList: MenuItem[] = [
  {
    name: "Exchange",
    href: "/market/exchange",
  },
  {
    name: "Wallet",
    href: "/market/wallet",
  },
  {
    name: "My Trade",
    href: "/market/my-trade",
  },
  {
    name: "Service+",
    children: [
      { name: "Scheduler", href: "/market/service/scheduler" },
      { name: "Ranking", href: "/market/service/ranking" },
      { name: "Attendance", href: "/market/service/attendance" },
      { name: "News", href: "/market/service/news" },
    ],
  },
];

export const MenuList = memo(() => {
  return (
    <article className="flex items-center gap-4">
      {menuList.map((item) =>
        item.children ? (
          <ChildMenu key={item.name} item={item} />
        ) : (
          <CompositeMenu key={item.name} item={item} />
        )
      )}
    </article>
  );
});

MenuList.displayName = "MenuList";

const CompositeMenu = ({ item }: { item: MenuItem }) => {
  return (
    <nav
      key={item.name}
      className="p-2 rounded-md transition-all duration-200 hover:bg-gray-700 active:scale-95"
    >
      <Link href={item.href ?? ""}>{item.name}</Link>
    </nav>
  );
};

const ChildMenu = ({ item }: { item: MenuItem }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isOpen = isMenuOpen && !isEmpty(item.children);

  return (
    <nav
      key={item.name}
      className="relative p-2 rounded-md transition-all duration-200 hover:bg-gray-700 active:scale-95 cursor-pointer"
      onMouseEnter={() => setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <span>{item.name}</span>
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-32 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
          <ul className="py-1">
            {item.children?.map((subItem) => (
              <li key={subItem.name}>
                <Link
                  href={subItem.href ?? ""}
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white text-center"
                >
                  {subItem.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
};
