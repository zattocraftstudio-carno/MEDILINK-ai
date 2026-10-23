import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PlanType } from "@/types";

export type BillingCycle = "monthly" | "yearly";

interface SubscriptionState {
  plan: PlanType;
  activatedAt?: string;
  billingCycle?: BillingCycle;
  transactionId?: string;
  subscriptionId?: string;
  setPlan: (plan: PlanType) => void;
  activatePremium: (params: {
    cycle: BillingCycle;
    transactionId: string;
    subscriptionId: string;
  }) => void;
  isPremium: () => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: "free",
      activatedAt: undefined,
      billingCycle: undefined,
      transactionId: undefined,
      subscriptionId: undefined,
      setPlan: (plan: PlanType) =>
        set({
          plan,
          activatedAt: plan === "premium" ? new Date().toISOString() : undefined,
          billingCycle: undefined,
          transactionId: undefined,
          subscriptionId: undefined,
        }),
      activatePremium: ({ cycle, transactionId, subscriptionId }) =>
        set({
          plan: "premium",
          activatedAt: new Date().toISOString(),
          billingCycle: cycle,
          transactionId,
          subscriptionId,
        }),
      isPremium: () => get().plan === "premium",
    }),
    {
      name: "medilink_subscription",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
