import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, Medicine, PrescriptionVerification } from "@/types";

/**
 * The premium discount rate, in one place.
 *
 * The product card showed `price * 0.8` while the cart subtracted
 * `Math.round(subtotal * 0.2)`. On a ৳2.50 medicine that meant the shelf
 * advertised ৳2.00 but the checkout charged ৳1.50 — the customer paid
 * ৳0.50 more than the price they were shown. Both now read this constant.
 */
export const PREMIUM_DISCOUNT_PERCENT = 20;

/** Flat delivery fee for a non-empty cart. */
export const DELIVERY_FEE = 30;

interface CartState {
  items: CartItem[];
  /** Prescription uploaded for the Rx items in this cart. */
  prescription?: PrescriptionVerification;
  addItem: (medicine: Medicine) => void;
  removeItem: (medicineId: string) => void;
  updateQuantity: (medicineId: string, delta: number) => void;
  clearCart: () => void;
  setPrescription: (prescription?: PrescriptionVerification) => void;
  /** The Rx items currently in the cart. */
  getRxItems: () => CartItem[];
  /** True when the cart needs a prescription before checkout. */
  requiresPrescription: () => boolean;
  getItemCount: () => number;
  getSubtotal: () => number;
  getDiscount: (isPremium: boolean) => number;
  getDeliveryFee: () => number;
  getTotal: (isPremium: boolean) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      prescription: undefined,

      addItem: (medicine: Medicine) => {
        set((state) => {
          const existing = state.items.find((item) => item.medicineId === medicine.id);

          // Never let the cart hold more units than the pharmacy actually
          // has in stock.
          const inCart = existing?.quantity ?? 0;
          const stock = medicine.stock ?? Number.POSITIVE_INFINITY;
          if (inCart >= stock) return state;

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.medicineId === medicine.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                medicineId: medicine.id,
                name: medicine.name,
                price: medicine.price,
                quantity: 1,
                image: medicine.image,
                requiresRx: medicine.requiresRx,
                stock: medicine.stock,
              },
            ],
          };
        });
      },

      removeItem: (medicineId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.medicineId !== medicineId),
        }));
      },

      updateQuantity: (medicineId: string, delta: number) => {
        set((state) => {
          const medicine = state.items.find((item) => item.medicineId === medicineId);
          const stockLimit =
            medicine?.stock ?? Number.POSITIVE_INFINITY;

          const updated = state.items
            .map((item) => {
              if (item.medicineId === medicineId) {
                const newQty = item.quantity + delta;
                // Clamp to the available stock as well as to > 0.
                if (newQty <= 0) return null;
                if (newQty > stockLimit) return { ...item, quantity: stockLimit };
                return { ...item, quantity: newQty };
              }
              return item;
            })
            .filter((item): item is CartItem => item !== null);

          return { items: updated };
        });
      },

      clearCart: () => set({ items: [], prescription: undefined }),

      setPrescription: (prescription) => set({ prescription }),

      getRxItems: () => get().items.filter((item) => item.requiresRx),

      /**
       * A prescription is required whenever the cart holds a
       * prescription-only medicine. If the uploaded prescription does
       * not cover every Rx item, the order must still be reviewed by a
       * pharmacist, so the requirement stays in force.
       */
      requiresPrescription: () => {
        const rxItems = get().getRxItems();
        if (!rxItems.length) return false;

        const prescription = get().prescription;
        if (!prescription) return true;
        if (prescription.status === "failed") return true;

        const matched = new Set(prescription.matchedItems.map((item) => item.medicineId));
        return rxItems.some((item) => !matched.has(item.medicineId));
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getDiscount: (isPremium: boolean) => {
        if (!isPremium) return 0;
        const subtotal = get().getSubtotal();
        return Math.round((subtotal * PREMIUM_DISCOUNT_PERCENT) / 100);
      },

      getDeliveryFee: () => {
        return get().items.length > 0 ? DELIVERY_FEE : 0;
      },

      getTotal: (isPremium: boolean) => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount(isPremium);
        const delivery = get().getDeliveryFee();
        return Math.max(0, subtotal - discount + delivery);
      },
    }),
    {
      name: "medilink_cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
