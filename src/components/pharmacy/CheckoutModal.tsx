"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PrescriptionBanner } from "@/components/pharmacy/PrescriptionBanner";
import { useCartStore } from "@/stores/useCartStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useOrderStore } from "@/stores/useOrderStore";
import { useToast } from "@/components/ui/Toast";
import { Order, PaymentMethod } from "@/types";
import { formatBDT } from "@/lib/format";
import { PREMIUM_DISCOUNT_PERCENT } from "@/stores/useCartStore";
import {
  Smartphone,
  CreditCard,
  Banknote,
  Lock,
  ChevronLeft,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Upload,
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  /** Opens the prescription upload modal. */
  onUploadPrescription?: () => void;
}

type CheckoutStep = "details" | "prescription" | "payment" | "processing";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
  cod: "Cash on Delivery",
};

const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  onUploadPrescription,
}) => {
  const profile = useProfileStore((s) => s.profile);
  const isPremium = useSubscriptionStore((s) => s.isPremium());
  const {
    items,
    prescription,
    getSubtotal,
    getDiscount,
    getDeliveryFee,
    getTotal,
    getRxItems,
    requiresPrescription,
    clearCart,
  } = useCartStore();
  const addOrder = useOrderStore((s) => s.addOrder);
  const { showToast } = useToast();

  const [step, setStep] = useState<CheckoutStep>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash");
  const [walletNumber, setWalletNumber] = useState("");
  const [walletPin, setWalletPin] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");

  const processingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile) {
      setName((prev) => prev || profile.name || "");
      setPhone((prev) => prev || profile.phone || "");
      setDeliveryAddress((prev) => prev || profile.area || "");
      setWalletNumber((prev) => prev || profile.phone || "");
      setCardName((prev) => prev || profile.name || "");
    }
  }, [profile]);

  // Reset to the first step every time the modal opens fresh.
  useEffect(() => {
    if (isOpen) setStep("details");
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (processingTimer.current) clearTimeout(processingTimer.current);
    };
  }, []);

  const subtotal = getSubtotal();
  const discount = getDiscount(isPremium);
  // One source of truth for the premium rate (the store computes it too).
  const discountPercent = PREMIUM_DISCOUNT_PERCENT;
  const delivery = getDeliveryFee();
  const total = getTotal(isPremium);

  const rxItems = getRxItems();
  const needsPrescription = requiresPrescription();

  const detailsValid =
    name.trim().length > 0 && phone.trim().length > 0 && deliveryAddress.trim().length > 0;

  const handlePay = () => {
    setStep("processing");

    // Demo flow: simulate a short, realistic gateway round-trip, then confirm.
    processingTimer.current = setTimeout(() => {
      const orderId = `ORD-${Date.now().toString().slice(-6)}`;
      const isCod = paymentMethod === "cod";
      const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}${Math.floor(
        Math.random() * 90 + 10
      )}`;

      const newOrder: Order = {
        id: orderId,
        items: [...items],
        subtotal,
        discount,
        deliveryFee: delivery,
        total,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        createdAt: new Date().toISOString(),
        paymentMethod,
        paymentMethodLabel: PAYMENT_LABELS[paymentMethod],
        transactionId: isCod ? undefined : transactionId,
        status: prescription ? "awaiting-verification" : isCod ? "pending" : "paid",
        prescription: prescription ?? undefined,
      };

      addOrder(newOrder);
      clearCart();
      showToast(
        prescription
          ? "Order placed — awaiting prescription verification."
          : isCod
            ? "Order confirmed — pay on delivery."
            : "Payment successful! Order confirmed.",
        "success",
      );
      onClose();
      onOrderSuccess(newOrder);
      setStep("details");
    }, 1700);
  };

  const methodTile = (
    method: PaymentMethod,
    icon: React.ReactNode,
    title: string,
    accent: string
  ) => {
    const active = paymentMethod === method;
    return (
      <button
        key={method}
        type="button"
        onClick={() => setPaymentMethod(method)}
        className={`flex items-center gap-3 w-full p-3.5 rounded-[14px] border-[1.5px] text-left transition-all ${
          active
            ? "border-brand bg-brand-light/60 shadow-sm"
            : "border-border-soft bg-white hover:border-brand-soft"
        }`}
        aria-pressed={active}
      >
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: accent }}
        >
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-[14px] font-bold text-text-primary">{title}</span>
        </span>
        <span
          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            active ? "border-brand" : "border-border-soft"
          }`}
        >
          {active && <span className="w-2 h-2 rounded-full bg-brand" />}
        </span>
      </button>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === "processing" ? () => {} : onClose}
      title={
        step === "details"
          ? "Checkout"
          : step === "prescription"
          ? "Prescription"
          : step === "payment"
          ? "Payment"
          : "Processing Payment"
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* ── Order summary (visible on every step) ── */}
        <div className="bg-bg-soft border border-border-soft rounded-[12px] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-text-primary">
              Order Summary
            </span>
            <span className="text-[12px] text-text-muted">
              {items.reduce((n, i) => n + i.quantity, 0)} item(s)
            </span>
          </div>          <div className="max-h-28 overflow-y-auto space-y-1 mb-3">
            {items.map((item) => (
              <div
                key={item.medicineId}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="text-text-muted truncate pr-3">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-semibold text-text-primary shrink-0">
                  {formatBDT(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border-soft pt-2 space-y-1 text-[13px]">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span>{formatBDT(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success-dark font-semibold">
                <span>Premium discount ({discountPercent}%)</span>
                <span>-{formatBDT(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-muted">
              <span>Delivery</span>
              <span>{formatBDT(delivery)}</span>
            </div>
            <div className="flex justify-between pt-1 text-[15px] font-bold text-text-primary">
              <span>Total</span>
              <span>{formatBDT(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Prescription banner (visible on every step) ── */}
        {rxItems.length > 0 && onUploadPrescription && (
          <PrescriptionBanner
            rxItems={rxItems}
            prescription={prescription}
            onUpload={onUploadPrescription}
          />
        )}

        {/* ── STEP 1: Delivery details ── */}
        {step === "details" && (
          <>
            <div>
              <label htmlFor="checkout-name" className="block text-[14px] font-bold text-text-primary mb-1.5">
                Full Name
              </label>
              <Input
                id="checkout-name"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="checkout-phone" className="block text-[14px] font-bold text-text-primary mb-1.5">
                Phone Number
              </label>
              <Input
                id="checkout-phone"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="checkout-address" className="block text-[14px] font-bold text-text-primary mb-1.5">
                Delivery Address / Area
              </label>
              <Input
                id="checkout-address"
                placeholder="Road, House, Area, City"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>

            <Button
              size="l"
              fullWidth
              disabled={!detailsValid || items.length === 0}
              onClick={() => setStep(needsPrescription ? "prescription" : "payment")}
            >
              {needsPrescription ? "Continue to Prescription" : "Continue to Payment"}
            </Button>
          </>
        )}

        {/* ── STEP 1b: Prescription verification ── */}
        {step === "prescription" && (
          <>
            <div className="flex items-start gap-3 p-4 rounded-[12px] bg-bg-soft border border-border-soft">
              <Upload className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-text-primary mb-1">
                  Prescription needed
                </p>
                <p className="text-[13px] text-text-muted leading-relaxed">
                  {rxItems.map((item) => item.name).join(", ")}{" "}
                  {rxItems.length === 1 ? "is" : "are"} prescription-only. Upload a
                  photo of your prescription so our pharmacist can verify it
                  before dispatch.
                </p>
              </div>
            </div>

            {prescription && (
              <div className="flex items-center gap-2.5 p-3 rounded-[12px] bg-success-soft/50 border border-success/25">
                <CheckCircle2 className="w-4 h-4 text-success-dark shrink-0" />
                <span className="text-[13px] text-text-primary">
                  Prescription uploaded — a pharmacist will confirm it before
                  dispatch.
                </span>
              </div>
            )}

            <Button
              size="l"
              fullWidth
              variant={prescription ? "primary" : "secondary"}
              onClick={() => {
                if (prescription) setStep("payment");
                else onUploadPrescription?.();
              }}
              leftIcon={prescription ? undefined : <Upload className="w-4 h-4" />}
            >
              {prescription ? "Continue to Payment" : "Upload Prescription"}
            </Button>

            <Button
              size="m"
              fullWidth
              variant="ghost"
              onClick={() => setStep("details")}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Back to details
            </Button>
          </>
        )}

        {/* ── STEP 2: Payment method + (simulated) credentials ── */}
        {step === "payment" && (
          <>
            <div className="space-y-2.5">
              {methodTile("bkash", <Smartphone className="w-4 h-4" />, "bKash", "#E2136E")}
              {methodTile("nagad", <Smartphone className="w-4 h-4" />, "Nagad", "#F6921E")}
              {methodTile("card", <CreditCard className="w-4 h-4" />, "Debit / Credit Card", "#1A2B4C")}
              {methodTile("cod", <Banknote className="w-4 h-4" />, "Cash on Delivery", "#0F7A38")}
            </div>

            {/* Wallet fields */}
            {(paymentMethod === "bkash" || paymentMethod === "nagad") && (
              <div className="space-y-3 pt-1">
                <div>
                  <label htmlFor="checkout-wallet-number" className="block text-[13px] font-bold text-text-primary mb-1.5">
                    {PAYMENT_LABELS[paymentMethod]} Account Number
                  </label>
                  <Input
                id="checkout-wallet-number"
                    placeholder="01XXXXXXXXX"
                    value={walletNumber}
                    onChange={(e) =>
                      setWalletNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))
                    }
                  />
                </div>
                <div>
                  <label htmlFor="checkout-wallet-pin" className="block text-[13px] font-bold text-text-primary mb-1.5">
                    PIN
                  </label>
                  <Input
                id="checkout-wallet-pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="• • • •"
                    value={walletPin}
                    onChange={(e) =>
                      setWalletPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))
                    }
                  />
                </div>
              </div>
            )}

            {/* Card fields */}
            {paymentMethod === "card" && (
              <div className="space-y-3 pt-1">
                <div>
                  <label htmlFor="checkout-card-number" className="block text-[13px] font-bold text-text-primary mb-1.5">
                    Card Number
                  </label>
                  <Input
                id="checkout-card-number"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    leftIcon={<CreditCard className="w-4 h-4" />}
                  />
                </div>
                <div>
                  <label htmlFor="checkout-card-name" className="block text-[13px] font-bold text-text-primary mb-1.5">
                    Cardholder Name
                  </label>
                  <Input
                id="checkout-card-name"
                    placeholder="As written on the card"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="checkout-card-expiry" className="block text-[13px] font-bold text-text-primary mb-1.5">
                      Expiry
                    </label>
                    <Input
                id="checkout-card-expiry"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-card-cvv" className="block text-[13px] font-bold text-text-primary mb-1.5">
                      CVV
                    </label>
                    <Input
                id="checkout-card-cvv"
                      type="password"
                      inputMode="numeric"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) =>
                        setCardCvv(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "cod" && (
              <div className="flex items-start gap-2.5 bg-success-soft/50 border border-success/20 rounded-[12px] p-3.5 text-[13px] text-text-primary">
                <Banknote className="w-4 h-4 text-success-dark shrink-0 mt-0.5" />
                <span>
                  Pay {formatBDT(total)} in cash when your medicine arrives at your door.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-[12px] text-text-muted bg-bg-soft border border-border-soft rounded-[10px] px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-brand" />
              <span>Demo checkout — no real payment is processed. This is a competition demo.</span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="ghost"
                size="m"
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                onClick={() => setStep("details")}
              >
                Back
              </Button>
              <Button
                size="m"
                className="flex-1"
                onClick={handlePay}
                disabled={needsPrescription}
                title={
                  needsPrescription
                    ? "Upload a prescription to continue"
                    : undefined
                }
              >
                <Lock className="w-4 h-4" />
                {needsPrescription
                  ? "Prescription required"
                  : paymentMethod === "cod"
                  ? `Confirm Order · ${formatBDT(total)}`
                  : `Pay ${formatBDT(total)}`}
              </Button>
            </div>
          </>
        )}

        {/* ── STEP 3: Processing ── */}
        {step === "processing" && (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-brand animate-spin" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-border-soft flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
            </div>
            <h3 className="text-[17px] font-bold text-text-primary mb-1">
              {paymentMethod === "cod" ? "Confirming your order…" : "Processing payment…"}
            </h3>
            <p className="text-[13px] text-text-muted max-w-[260px]">
              {paymentMethod === "cod"
                ? "Just a moment while we notify the pharmacy partner."
                : `Connecting securely to ${PAYMENT_LABELS[paymentMethod]}. Please do not close this window.`}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
