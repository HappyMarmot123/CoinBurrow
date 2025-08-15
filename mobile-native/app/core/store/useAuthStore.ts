import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { UserDto } from "../dto/auth.dto";

interface AuthState {
  mobileToken: {
    accessToken: string;
    refreshToken: string;
  } | null;
  user: UserDto | null;
  login: (mobileToken: AuthState["mobileToken"], user: UserDto) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      mobileToken: null,
      user: null,
      login: (mobileToken, user) => set({ mobileToken, user }),
      logout: () => set({ mobileToken: null, user: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

