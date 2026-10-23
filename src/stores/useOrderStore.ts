import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Order } from "@/types";

interface OrderState {
  orders: Order[];
  addOrder: (order: Order) => void;
  getRecentOrders: (isPremium?: boolean) => Order[];
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (order: Order) => {
        set((state) => ({
          orders: [order, ...state.orders],
        }));
      },

      getRecentOrders: (isPremium = false) => {
        const orders = get().orders;
        // Free plan shows last 3 orders, Premium shows all
        return isPremium ? orders : orders.slice(0, 3);
      },
    }),
    {
      name: "medilink_orders",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
