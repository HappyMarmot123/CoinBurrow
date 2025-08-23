"use client";

import Link from "next/link";
import { memo, useState } from "react";

const menuList = [
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
    href: "/market/service",
  },
];

const serviceSubMenu = [
  { name: "Scheduler", href: "/market/service/scheduler" },
  { name: "Ranking", href: "/market/service/ranking" },
  { name: "Attendance", href: "/market/service/attendance" },
  { name: "News", href: "/market/service/news" },
];

export const MenuList = memo(() => {
  const [isServiceMenuOpen, setIsServiceMenuOpen] = useState(false);

  return (
    <article className="flex items-center gap-8">
      {menuList.map((item) =>
        item.name === "Service+" ? (
          <nav
            key={item.name}
            className="relative p-2 rounded-md transition-all duration-200 hover:bg-gray-700 active:scale-95 cursor-pointer"
            onMouseEnter={() => setIsServiceMenuOpen(true)}
            onMouseLeave={() => setIsServiceMenuOpen(false)}
          >
            <span>{item.name}</span>
            {isServiceMenuOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-32 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
                <ul className="py-1">
                  {serviceSubMenu.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.href}
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
        ) : (
          <nav
            key={item.name}
            className="p-2 rounded-md transition-all duration-200 hover:bg-gray-700 active:scale-95"
          >
            <Link href={item.href}>{item.name}</Link>
          </nav>
        )
      )}
    </article>
  );
});

MenuList.displayName = "MenuList";
