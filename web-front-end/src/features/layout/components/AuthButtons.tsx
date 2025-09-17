import { useAuthStore } from "@/app/store/useAuthStore";
import { useModal } from "@/shared/contexts/ModalContext";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";

export const AuthButtons = () => {
  const { openModal } = useModal();
  const { logout } = useAuthStore();
  const { isLoggedIn } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      {isLoggedIn === true && (
        <>
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </>
      )}
      {isLoggedIn === false && (
        <>
          <Button variant="primaryGreen" onClick={() => openModal("qrForm")}>
            Login
          </Button>
          <Button variant="secondary" onClick={() => openModal("signup")}>
            Sign Up
          </Button>
        </>
      )}
    </>
  );
};
