"use client";

import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { PrescriptionBanner } from "@/components/pharmacy/PrescriptionBanner";
import { useCartStore } from "@/stores/useCartStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  /** Opens the prescription upload modal. */
  onUploadPrescription?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onCheckout,
  onUploadPrescription,
}) => {
  const { items, prescription, updateQuantity, removeItem, getSubtotal, getDiscount, getDeliveryFee, getTotal, getItemCount, getRxItems } = useCartStore();
  const isPremium = useSubscriptionStore((s) => s.isPremium());

  const count = getItemCount();
  const subtotal = getSubtotal();
  const discount = getDiscount(isPremium);
  const deliveryFee = getDeliveryFee();
  const total = getTotal(isPremium);
  const rxItems = getRxItems();

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Your Cart (${count})`}
      footer={
        items.length > 0 ? (
          <div className="w-full space-y-4">
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span>৳{subtotal}</span>
              </div>
              {isPremium && discount > 0 && (
                <div className="flex justify-between text-accent font-semibold">
                  <span>Premium Discount (20%)</span>
                  <span>-৳{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-text-muted">
                <span>Delivery Fee</span>
                <span>৳{deliveryFee}</span>
              </div>
              <div className="pt-2 border-t border-border-soft flex justify-between font-heading font-extrabold text-[18px] text-text-primary">
                <span>Total</span>
                <span>৳{total}</span>
              </div>
            </div>
            <Button
              size="l"
              fullWidth
              onClick={() => {
                onClose();
                onCheckout();
              }}
            >
              Proceed to Checkout
            </Button>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-full bg-bg-soft flex items-center justify-center text-text-muted mb-4">
            <ShoppingBag className="w-8 h-8 opacity-60" />
          </div>
          <h4 className="text-[18px] font-bold text-text-primary mb-2">
            Your cart is empty
          </h4>
          <p className="text-[14px] text-text-muted mb-6 max-w-xs">
            Browse our medicines and add items to your cart.
          </p>
          <Button size="m" variant="secondary" onClick={onClose}>
            Browse Medicines
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {/* Prescription banner — mandatory whenever an Rx item is in the cart */}
          {rxItems.length > 0 && onUploadPrescription && (
            <PrescriptionBanner
              rxItems={rxItems}
              prescription={prescription}
              onUpload={onUploadPrescription}
            />
          )}

          {items.map((item) => (
            <div
              key={item.medicineId}
              className="p-4 border border-border-soft rounded-[12px] bg-white flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <h5 className="font-bold text-[15px] text-text-primary truncate">
                  {item.name}
                </h5>
                <div className="text-[13px] text-text-muted mt-0.5">
                  ৳{item.price} each
                </div>
                <div className="text-[14px] font-extrabold text-brand mt-1">
                  ৳{item.price * item.quantity}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center border border-border-soft rounded-md bg-bg-soft">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.medicineId, -1)}
                    className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-[14px] font-bold text-text-primary select-none">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.medicineId, 1)}
                    className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.medicineId)}
                  className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-emergency hover:bg-emergency-soft rounded-md transition-colors"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
};
