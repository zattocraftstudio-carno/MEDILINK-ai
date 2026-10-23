import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Profile } from "@/types";

interface ProfileState {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  clearProfile: () => void;
  isRegistered: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      setProfile: (profile: Profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),
      isRegistered: () => {
        const p = get().profile;
        return p !== null && !!p.name && !!p.phone;
      },
    }),
    {
      name: "medilink_profile",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
