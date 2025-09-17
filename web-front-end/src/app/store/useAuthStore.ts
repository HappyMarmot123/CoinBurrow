import { create } from "zustand";
import Cookies from "js-cookie";

interface AuthState {
  isLoggedIn: boolean | null;
  isLoading: boolean;
  checkLoginStatus: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: null,
  isLoading: true,
  checkLoginStatus: () => {
    set({
      isLoggedIn: Cookies.get("accessToken") ? true : false,
      isLoading: false,
    });
  },
  logout: () => {
    Cookies.remove("accessToken");
    set({ isLoggedIn: false });
  },
}));
