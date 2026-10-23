"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Order } from "@/types";
import { generatePharmacyOrderMessage, createWhatsAppUrl } from "@/lib/whatsapp";
import { CheckCircle2, MessageSquare, Receipt, MapPin } from "lucide-react";

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!order) return null;

  const isPaid = order.status === "paid";

  const handleSendWhatsApp = () => {
    const message = generatePharmacyOrderMessage({
      profile: {
        name: order.customerName,
        phone: order.customerPhone,
        area: order.deliveryAddress,
      },
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      discountPercent: order.discount > 0 ? 20 : 0,
      total: order.total,
      paymentMethodLabel: order.paymentMethodLabel,
      transactionId: order.transactionId,
    });
    window.open(createWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isPaid ? "Payment Successful" : "Order Confirmed"}>
      <div className="text-center py-2">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <span className="absolute inset-0 rounded-full bg-success/15 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-success-soft text-success-dark flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>

        <p className="text-[26px] font-heading font-extrabold text-text-primary leading-none mb-1">
          ৳{order.total.toFixed(2)}
        </p>
        <p className="text-[14px] text-text-muted mb-5">
          {isPaid
            ? `Paid via ${order.paymentMethodLabel || "online payment"}`
            : "Cash on Delivery — pay when it arrives"}
        </p>

        <div className="bg-bg-soft border border-border-soft rounded-[14px] p-4 text-left space-y-2.5 mb-5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-1.5 text-text-muted">
              <Receipt className="w-3.5 h-3.5" /> Order ID
            </span>
            <strong className="text-text-primary font-bold">#{order.id}</strong>
          </div>

          {order.transactionId && (
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 text-text-muted">
                <CheckCircle2 className="w-3.5 h-3.5" /> Transaction
              </span>
              <strong className="text-text-primary font-bold">{order.transactionId}</strong>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 text-[13px]">
            <span className="flex items-center gap-1.5 text-text-muted shrink-0">
              <MapPin className="w-3.5 h-3.5" /> Deliver to
            </span>
            <span className="text-text-primary font-medium text-right truncate">
              {order.deliveryAddress}
            </span>
          </div>
        </div>

        <p className="text-[13.5px] text-text-muted leading-relaxed mb-5">
          Our pharmacy partner will confirm your order on WhatsApp and update you on delivery.
        </p>

        <div className="space-y-2.5">
          <Button
            size="l"
            fullWidth
            variant="whatsapp"
            leftIcon={<MessageSquare className="w-5 h-5" />}
            onClick={handleSendWhatsApp}
          >
            Send Order on WhatsApp
          </Button>
          <Button size="l" fullWidth variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
