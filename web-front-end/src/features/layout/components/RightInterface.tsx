"use client";

import { useModal } from "@/shared/contexts/ModalContext";
import { useAuthStore } from "@/app/store/useAuthStore";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import { memo, useState } from "react";
import { User, Globe } from "lucide-react";

export const RightInterface = () => {
  const { isLoggedIn } = useAuthStore();

  return (
    <article className="flex items-center gap-6">
      <InterfaceButton />
      <AuthButton isLoggedIn={isLoggedIn} />
    </article>
  );
};

const InterfaceButton = memo(() => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const router = useRouter();

  const interfaceList = [
    {
      name: "mypage",
      icon: User,
      tooltip: "mypage",
    },
    {
      name: "language",
      icon: Globe,
      tooltip: "language",
    },
  ];

  return (
    <div className="flex items-center gap-6">
      {interfaceList.map((item) => (
        <div
          key={item.name}
          className="relative"
          onMouseEnter={() => {
            setActiveTooltip(item.name);
          }}
          onMouseLeave={() => {
            setActiveTooltip(null);
          }}
        >
          <item.icon
            className="text-gray-400 hover:text-white cursor-pointer transition-colors"
            size={22}
          />
          {activeTooltip === item.name && item.tooltip && (
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg whitespace-nowrap border border-gray-700">
              {item.tooltip}
            </span>
          )}
        </div>
      ))}
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
