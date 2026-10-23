"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useProfileStore } from "@/stores/useProfileStore";
import { useSubscriptionStore, BillingCycle } from "@/stores/useSubscriptionStore";
import { useChatStore } from "@/stores/useChatStore";
import { useToast } from "@/components/ui/Toast";

type SubMethod = "bkash" | "nagad" | "card";
type Step = "checkout" | "processing" | "success";

interface Receipt {
  subscriptionId: string;
  transactionId: string;
  amount: number;
  methodLabel: string;
  cycle: BillingCycle;
  at: string;
}

const PLANS: Record<
  BillingCycle,
  { label: string; price: number; cadence: string; note: string; badge?: string }
> = {
  monthly: {
    label: "Monthly",
    price: 500,
    cadence: "/month",
    note: "Billed every month. Cancel anytime.",
  },
  yearly: {
    label: "Yearly",
    price: 4800,
    cadence: "/year",
    note: "Works out to ৳400/month.",
    badge: "Save ৳1,200",
  },
};

const METHOD_META: Record<SubMethod, { label: string; accent: string }> = {
  bkash: { label: "bKash", accent: "#E2136E" },
  nagad: { label: "Nagad", accent: "#F6921E" },
  card: { label: "Debit / Credit Card", accent: "#1A2B4C" },
};

const PREMIUM_FEATURES = [
  "Unlimited AI access (fair use)",
  "Med-1 Pro detailed answers",
  "Med-1 Flash quick answers",
  "Full smart search & suggestions",
  "20% pharmacy discount",
  "20% doctor fee discount",
  "Ultra-high priority booking",
  "Full chat history & PDF export",
];

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

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const renewalDate = (iso: string, cycle: BillingCycle) => {
  const d = new Date(iso);
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return formatDate(d.toISOString());
};

export default function SubscriptionPage() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const isPremium = useSubscriptionStore((s) => s.isPremium());
  const activatePremium = useSubscriptionStore((s) => s.activatePremium);
  const activatedAt = useSubscriptionStore((s) => s.activatedAt);
  const billingCycle = useSubscriptionStore((s) => s.billingCycle);
  const subscriptionId = useSubscriptionStore((s) => s.subscriptionId);
  const transactionId = useSubscriptionStore((s) => s.transactionId);
  const { showToast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [method, setMethod] = useState<SubMethod>("bkash");
  const [step, setStep] = useState<Step>("checkout");
  const [showCheckout, setShowCheckout] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // Demo-friendly defaults: the Pay button is valid out of the box, while a
  // saved profile still personalises the wallet number and cardholder name.
  const [walletNumber, setWalletNumber] = useState("01712345678");
  const [walletPin, setWalletPin] = useState("1234");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardName, setCardName] = useState("MediLink Demo");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");

  const processingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!profile) return;
    let phone = (profile.phone || "").replace(/\D/g, "");
    if (phone.startsWith("880")) phone = "0" + phone.slice(3);
    phone = phone.slice(0, 11);
    if (/^01\d{9}$/.test(phone)) setWalletNumber(phone);
    if (profile.name) setCardName(profile.name);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (processingTimer.current) clearTimeout(processingTimer.current);
    };
  }, []);

  const plan = PLANS[cycle];
  const activePremium = mounted && isPremium;

  const walletValid =
    /^01\d{9}$/.test(walletNumber) && /^\d{4}$/.test(walletPin);
  const cardDigits = cardNumber.replace(/\s/g, "");
  const cardValid =
    cardDigits.length === 16 &&
    cardName.trim().length >= 2 &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry) &&
    /^\d{3}$/.test(cardCvv);
  const canPay = method === "card" ? cardValid : walletValid;

  const handlePay = () => {
    if (!canPay || step === "processing") return;
    setStep("processing");

    // Demo gateway: a short, realistic round-trip, then an always-successful
    // confirmation. No real payment is processed.
    processingTimer.current = setTimeout(() => {
      const now = new Date().toISOString();
      const txn = `TXN-${Date.now().toString(36).toUpperCase()}${Math.floor(
        Math.random() * 90 + 10
      )}`;
      const subId = `SUB-${Date.now().toString().slice(-6)}`;

      activatePremium({ cycle, transactionId: txn, subscriptionId: subId });
      setReceipt({
        subscriptionId: subId,
        transactionId: txn,
        amount: plan.price,
        methodLabel: METHOD_META[method].label,
        cycle,
        at: now,
      });
      setStep("success");
      showToast("Premium activated — welcome to MediLink Premium!", "success");
    }, 1700);
  };

  const goToProChat = () => {
    useChatStore.getState().setSelectedModel("med1-pro");
    router.push("/chat");
  };

  const methodTile = (value: SubMethod, icon: React.ReactNode) => {
    const active = method === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setMethod(value)}
        aria-pressed={active}
        className={`flex items-center gap-3 w-full p-3 rounded-[13px] border-[1.5px] text-left transition-all ${
          active
            ? "border-brand bg-brand-light/60 shadow-sm"
            : "border-border-soft bg-white hover:border-brand-soft"
        }`}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: METHOD_META[value].accent }}
        >
          {icon}
        </span>
        <span className="flex-1 text-[13.5px] font-bold text-text-primary">
          {METHOD_META[value].label}
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

  /* ── Processing ── */
  if (step === "processing") {
    return (
      <section className="min-h-[calc(100vh-var(--content-offset))] bg-bg-main flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[520px] bg-white border border-border-soft rounded-[22px] p-10 text-center shadow-lg">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="w-20 h-20 rounded-full bg-brand-light flex items-center justify-center">
              <Loader2 className="w-9 h-9 text-brand animate-spin" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-border-soft flex items-center justify-center">
              <Lock className="w-4 h-4 text-success" />
            </div>
          </div>
          <h1 className="font-heading font-extrabold text-[24px] text-text-primary mb-2">
            Processing payment…
          </h1>
          <p className="text-[14px] text-text-muted max-w-[320px] mx-auto">
            Connecting securely to {METHOD_META[method].label}. Please do not
            close this window.
          </p>
          <div className="mt-7 h-1.5 w-full bg-bg-soft rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-brand rounded-full animate-pulse" />
          </div>
          <p className="mt-5 text-[12px] text-text-muted">
            Amount&nbsp;
            <span className="font-bold text-text-primary">৳{plan.price.toLocaleString()}</span>
          </p>
        </div>
      </section>
    );
  }

  /* ── Success (fresh payment) ── */
  if (step === "success" && receipt) {
    return (
      <section className="min-h-[calc(100vh-var(--content-offset))] bg-bg-main px-4 py-12 md:py-16">
        <div className="max-w-[640px] mx-auto">
          <div className="bg-white border border-border-soft rounded-[22px] shadow-xl overflow-hidden">
            <div className="bg-success-soft/60 px-8 pt-9 pb-7 text-center border-b border-success/15">
              <div className="w-16 h-16 rounded-full bg-white text-success flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h1 className="font-heading font-extrabold text-[28px] md:text-[32px] text-text-primary mb-1.5">
                Payment Successful
              </h1>
              <p className="text-[14.5px] text-text-muted">
                Your MediLink Premium subscription is now active.
              </p>
            </div>

            <div className="px-7 md:px-9 py-7">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-text-muted">
                    Amount paid
                  </p>
                  <p className="font-heading font-extrabold text-[32px] text-brand leading-tight">
                    ৳{receipt.amount.toLocaleString()}
                  </p>
                </div>
                <Badge variant="success" icon={<Crown className="w-3.5 h-3.5" />}>
                  {receipt.cycle === "yearly" ? "Yearly Premium" : "Monthly Premium"}
                </Badge>
              </div>

              <div className="space-y-2.5 text-[13.5px] border-t border-dashed border-border-soft pt-5">
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Payment method</span>
                  <span className="font-semibold text-text-primary text-right">
                    {receipt.methodLabel}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Subscription ID</span>
                  <span className="font-mono font-semibold text-text-primary">
                    {receipt.subscriptionId}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Transaction ID</span>
                  <span className="font-mono font-semibold text-text-primary break-all text-right">
                    {receipt.transactionId}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Activated on</span>
                  <span className="font-semibold text-text-primary">
                    {formatDate(receipt.at)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-muted">Next renewal</span>
                  <span className="font-semibold text-text-primary">
                    {renewalDate(receipt.at, receipt.cycle)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-2.5 bg-brand-light/50 border border-brand/15 rounded-[12px] p-3.5 text-[13px] text-text-primary">
                <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>
                  <strong>Pro mode is unlocked.</strong> Switch to Pro in the chat
                  header for longer, structured consultations — and enjoy 20% off
                  pharmacy orders and doctor fees.
                </span>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button size="l" fullWidth onClick={goToProChat} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Start a Pro consultation
                </Button>
                <Button size="l" variant="secondary" fullWidth onClick={() => router.push("/")}>
                  Back to Home
                </Button>
              </div>

              <p className="mt-4 text-center text-[11.5px] text-text-muted">
                Demo checkout — no real money was charged. A receipt has been saved
                to this device.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Active subscription (return visit) ── */
  if (activePremium && !showCheckout) {
    return (
      <section className="min-h-[calc(100vh-var(--content-offset))] bg-bg-main px-4 py-12 md:py-16">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center mb-8">
            <Badge variant="success" icon={<Crown className="w-3.5 h-3.5" />} className="mb-4">
              Premium Active
            </Badge>
            <h1 className="font-heading font-extrabold text-[32px] md:text-[40px] text-text-primary mb-2">
              Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-[15px] text-text-muted">
              Your MediLink Premium membership is active.
            </p>
          </div>

          <div className="bg-white border border-border-soft rounded-[22px] p-7 md:p-9 shadow-lg">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Plan
                </p>
                <p className="text-[18px] font-bold text-text-primary">
                  MediLink Premium ·{" "}
                  {billingCycle === "yearly" ? "Yearly" : "Monthly"}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Member since
                </p>
                <p className="text-[18px] font-bold text-text-primary">
                  {formatDate(activatedAt)}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Subscription ID
                </p>
                <p className="font-mono text-[14px] font-semibold text-text-primary">
                  {subscriptionId || "—"}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Last transaction
                </p>
                <p className="font-mono text-[14px] font-semibold text-text-primary break-all">
                  {transactionId || "—"}
                </p>
              </div>
            </div>

            <div className="mt-7 border-t border-dashed border-border-soft pt-6">
              <h2 className="text-[16px] font-bold text-text-primary mb-4">
                Your benefits are live
              </h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {PREMIUM_FEATURES.slice(0, 6).map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-text-primary">
                    <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="l" fullWidth onClick={goToProChat} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Open Pro chat
              </Button>
              <Button size="l" variant="secondary" fullWidth onClick={() => setShowCheckout(true)}>
                Renew / change plan
              </Button>
            </div>
          </div>

          <p className="text-center text-[12px] text-text-muted mt-5">
            Need help with billing?{" "}
            <Link href="/contact" className="text-brand font-semibold hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </section>
    );
  }

  /* ── Checkout ── */
  return (
    <section className="relative overflow-hidden bg-bg-main">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 -left-24 w-[360px] h-[360px] rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative max-w-[1120px] mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <Badge variant="warn" icon={<Crown className="w-3.5 h-3.5" />} className="mb-4">
            MediLink Premium
          </Badge>
          <h1 className="font-heading font-extrabold text-[32px] md:text-[44px] leading-[1.1] text-text-primary mb-3">
            One subscription.
            <br />
            <span className="text-brand">The whole clinic.</span>
          </h1>
          <p className="text-[15px] md:text-[16px] text-text-muted max-w-xl mx-auto">
            Unlimited AI consultations, Pro-grade answers, and 20% off pharmacy and
            doctor fees — all in one plan.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-6 lg:gap-8 items-start">
          {/* LEFT — plan + benefits */}
          <div className="space-y-5">
            <div className="bg-white border border-border-soft rounded-[20px] p-6 md:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-bold text-text-primary">
                  Choose your billing
                </h2>
                <span className="text-[12px] font-semibold text-brand flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cancel anytime
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {(Object.keys(PLANS) as BillingCycle[]).map((key) => {
                  const p = PLANS[key];
                  const active = cycle === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCycle(key)}
                      aria-pressed={active}
                      className={`relative text-left rounded-[15px] border-[1.5px] p-4 transition-all ${
                        active
                          ? "border-brand bg-brand-light/50 shadow-sm"
                          : "border-border-soft bg-white hover:border-brand-soft"
                      }`}
                    >
                      {p.badge && (
                        <span className="absolute -top-2.5 right-3">
                          <Badge variant="warn">{p.badge}</Badge>
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[14px] font-bold text-text-primary">
                          {p.label}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            active ? "border-brand" : "border-border-soft"
                          }`}
                        >
                          {active && <span className="w-2 h-2 rounded-full bg-brand" />}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading font-extrabold text-[26px] text-text-primary">
                          ৳{p.price.toLocaleString()}
                        </span>
                        <span className="text-[12.5px] text-text-muted">{p.cadence}</span>
                      </div>
                      <p className="text-[12px] text-text-muted mt-1">{p.note}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-border-soft rounded-[20px] p-6 md:p-7 shadow-sm">
              <h2 className="text-[17px] font-bold text-text-primary mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-accent fill-accent" />
                Everything in Premium
              </h2>
              <ul className="space-y-2.5">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-text-primary">
                    <span className="w-4 h-4 rounded-full bg-brand-light text-brand flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 pt-5 border-t border-border-soft grid grid-cols-3 gap-3 text-center">
                <div>
                  <Clock className="w-4 h-4 text-brand mx-auto mb-1.5" />
                  <p className="text-[11.5px] text-text-muted leading-tight">
                    Instant activation
                  </p>
                </div>
                <div>
                  <Users className="w-4 h-4 text-brand mx-auto mb-1.5" />
                  <p className="text-[11.5px] text-text-muted leading-tight">
                    Priority doctor booking
                  </p>
                </div>
                <div>
                  <FileText className="w-4 h-4 text-brand mx-auto mb-1.5" />
                  <p className="text-[11.5px] text-text-muted leading-tight">
                    Export chat as PDF
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — checkout card */}
          <div className="bg-white border border-border-soft rounded-[20px] shadow-lg overflow-hidden lg:sticky lg:top-24">
            <div className="px-6 md:px-7 pt-6 pb-5 border-b border-border-soft bg-bg-soft/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading font-extrabold text-[20px] text-text-primary">
                    Secure checkout
                  </h2>
                  <p className="text-[12.5px] text-text-muted mt-0.5">
                    {activePremium
                      ? "Renewing your existing Premium plan"
                      : "Activate Premium in less than a minute"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-brand-light text-brand flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="px-6 md:px-7 py-6">
              {/* Order summary */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-dashed border-border-soft">
                <div>
                  <p className="text-[14px] font-bold text-text-primary">
                    MediLink Premium
                  </p>
                  <p className="text-[12.5px] text-text-muted mt-0.5">
                    {plan.label} plan · {plan.note}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-heading font-extrabold text-[24px] text-brand leading-none">
                    ৳{plan.price.toLocaleString()}
                  </p>
                  <p className="text-[11.5px] text-text-muted mt-1">{plan.cadence}</p>
                </div>
              </div>

              {/* Methods */}
              <div className="pt-5">
                <p className="text-[13px] font-bold text-text-primary mb-2.5">
                  Payment method
                </p>
                <div className="space-y-2">
                  {methodTile("bkash", <Smartphone className="w-4 h-4" />)}
                  {methodTile("nagad", <Smartphone className="w-4 h-4" />)}
                  {methodTile("card", <CreditCard className="w-4 h-4" />)}
                </div>
              </div>

              {/* Wallet fields */}
              {(method === "bkash" || method === "nagad") && (
                <div className="space-y-3 pt-4">
                  <Input
                    label={`${METHOD_META[method].label} account number`}
                    placeholder="01XXXXXXXXX"
                    inputMode="numeric"
                    value={walletNumber}
                    onChange={(e) =>
                      setWalletNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    helpText="11-digit mobile wallet number"
                  />
                  <Input
                    label="PIN"
                    type="password"
                    inputMode="numeric"
                    placeholder="• • • •"
                    value={walletPin}
                    onChange={(e) =>
                      setWalletPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    helpText="Demo: any 4 digits will work"
                  />
                </div>
              )}

              {/* Card fields */}
              {method === "card" && (
                <div className="space-y-3 pt-4">
                  <Input
                    label="Card number"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    leftIcon={<CreditCard className="w-4 h-4" />}
                  />
                  <Input
                    label="Cardholder name"
                    placeholder="As written on the card"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Expiry"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    />
                    <Input
                      label="CVV"
                      type="password"
                      inputMode="numeric"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) =>
                        setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
                      }
                    />
                  </div>
                  <p className="text-[11.5px] text-text-muted">
                    Demo card is pre-filled — leave it as is and press Pay.
                  </p>
                </div>
              )}

              <div className="mt-5 flex items-start gap-2 text-[11.5px] text-text-muted bg-bg-soft border border-border-soft rounded-[10px] px-3 py-2.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-brand mt-0.5" />
                <span>
                  Demo checkout — no real payment is processed. Any valid-format
                  details work, and every payment succeeds.
                </span>
              </div>

              <Button
                size="l"
                fullWidth
                className="mt-5"
                disabled={!canPay}
                onClick={handlePay}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Pay ৳{plan.price.toLocaleString()}
              </Button>

              <p className="mt-3 text-center text-[11px] text-text-muted flex items-center justify-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-success" />
                Secured by MediLink Pay · 256-bit demo gateway
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[12px] text-text-muted">
          Prefer to stay free?{" "}
          <Link href="/chat" className="text-brand font-semibold hover:underline">
            Continue with 2 free chats a day
          </Link>{" "}
          ·{" "}
          <Link href="/contact" className="text-brand font-semibold hover:underline">
            Contact support
          </Link>
        </div>
      </div>
    </section>
  );
}
