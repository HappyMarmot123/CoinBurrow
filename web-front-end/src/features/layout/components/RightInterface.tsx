"use client";

import { memo, useState } from "react";
import { User, Globe, Bell } from "lucide-react";
import Link from "next/link";
import { Notification } from "./Notification";

const interfaceList = [
  {
    name: "mypage",
    icon: User,
    tooltip: "Mypage",
    href: "/market/mypage",
    action: null,
  },
  {
    name: "language",
    icon: Globe,
    tooltip: "Language",
    href: null,
    action: () => {
      console.log("Language change requested");
    },
  },
  {
    name: "notification",
    icon: Bell,
    tooltip: "Notification",
    href: null,
    action: null,
  },
];

const notifyRoute = "/market/mypage/notification";

export const RightInterface = memo(() => {
  return (
    <article className="flex items-center gap-6">
      <div className="flex items-center gap-6">
        {interfaceList.map((item) =>
          item.href ? (
            <Link key={item.name} href={item.href}>
              <RenderIcon item={item} />{" "}
            </Link>
          ) : (
            <div key={item.name}>
              <RenderIcon item={item} />{" "}
            </div>
          )
        )}
      </div>
    </article>
  );
});

RightInterface.displayName = "RightInterface";

const RenderIcon = ({ item }: { item: (typeof interfaceList)[0] }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (item.name === "notification") setIsNotificationOpen(true);
        setActiveTooltip(item.name);
      }}
      onMouseLeave={() => {
        if (item.name === "notification") setIsNotificationOpen(false);
        setActiveTooltip(null);
      }}
    >
      <item.icon
        className="text-gray-400 hover:text-white cursor-pointer transition-colors"
        size={22}
        onClick={item.action || undefined}
      />
      {activeTooltip === item.name && item.tooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg whitespace-nowrap border border-gray-700">
          {item.tooltip}
        </div>
      )}
      {item.name === "notification" && isNotificationOpen && (
        <Notification notifyRoute={notifyRoute} />
      )}
    </div>
  );
};
