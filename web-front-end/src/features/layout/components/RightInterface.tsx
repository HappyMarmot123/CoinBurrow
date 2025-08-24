"use client";

import { useModal } from "@/shared/contexts/ModalContext";
import { useAuthStore } from "@/app/store/useAuthStore";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import { memo, useState } from "react";
import { User, Globe, Bell } from "lucide-react";
import Link from "next/link";

export const RightInterface = () => {
  const { isLoggedIn } = useAuthStore();

  return (
    <article className="flex items-center gap-6">
      <InterfaceButton />
      <AuthButton isLoggedIn={isLoggedIn} />
    </article>
  );
};

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

const notificationData = [
  { id: 1, message: "New trade executed." },
  { id: 2, message: "Price alert for BTC." },
  { id: 3, message: "Your deposit has been confirmed." },
];

const notifyRoute = "/market/mypage/notification";

const InterfaceButton = memo(() => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const renderIcon = (item: (typeof interfaceList)[0]) => (
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
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg whitespace-nowrap border border-gray-700">
          {item.tooltip}
        </span>
      )}
      {item.name === "notification" && isNotificationOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
          <ul className="py-2 px-3 max-h-60 overflow-y-auto">
            {notificationData.map((notif) => (
              <li
                key={notif.id}
                className="py-2 border-b border-gray-700 text-sm text-gray-300 last:border-b-0"
              >
                {notif.message}
              </li>
            ))}
          </ul>
          <div className="p-2 border-t border-gray-700">
            <Link
              href={notifyRoute}
              className="block text-center text-sm text-green-400 hover:underline"
            >
              더 보기
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-6">
      {interfaceList.map((item) =>
        item.href ? (
          <Link key={item.name} href={item.href}>
            {renderIcon(item)}
          </Link>
        ) : (
          <div key={item.name}>{renderIcon(item)}</div>
        )
      )}
    </div>
  );
});

InterfaceButton.displayName = "InterfaceButton";

const AuthButton = ({ ...props }: { isLoggedIn: boolean | null }) => {
  const { openModal } = useModal();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      {props.isLoggedIn === true && (
        <Button variant="secondary" onClick={handleLogout}>
          Logout
        </Button>
      )}
      {props.isLoggedIn === false && (
        <>
          <Button variant="primaryGreen" onClick={() => openModal("qrForm")}>
            Login
          </Button>
          <Button
            variant="secondary"
            className="ml-4"
            onClick={() => openModal("signup")}
          >
            Sign Up
          </Button>
        </>
      )}
    </>
  );
};
