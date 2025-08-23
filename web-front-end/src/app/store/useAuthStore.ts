import { create } from "zustand";
import Cookies from "js-cookie";

interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  checkLoginStatus: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isLoading: true,
  checkLoginStatus: () => {
    set({
      isLoggedIn: !!Cookies.get("accessToken"),
      isLoading: false,
    });
  },
  logout: () => {
    Cookies.remove("accessToken");
    set({ isLoggedIn: false });
  },
}));
