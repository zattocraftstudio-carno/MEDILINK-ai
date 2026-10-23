"use client";

import React, { useState, useMemo, useEffect } from "react";
import medicinesData from "@/data/medicines.json";
import { Medicine, Order } from "@/types";
import { MedicineCard } from "@/components/pharmacy/MedicineCard";
import { CartDrawer } from "@/components/pharmacy/CartDrawer";
import { CartSummaryBar } from "@/components/pharmacy/CartSummaryBar";
import { CheckoutModal } from "@/components/pharmacy/CheckoutModal";
import { OrderSuccessModal } from "@/components/pharmacy/OrderSuccessModal";
import { PrescriptionUploadModal } from "@/components/pharmacy/PrescriptionUploadModal";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { TextLink } from "@/components/ui/TextLink";
import { useToast } from "@/components/ui/Toast";
import { useCartStore } from "@/stores/useCartStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { ShoppingBag, Search, SlidersHorizontal } from "lucide-react";

const CATEGORIES = [
  "All",
  "Fever & Pain",
  "Gastric",
  "Allergy",
  "Vitamins",
  "Skin Care",
  "First Aid",
  "Child Care",
];

export default function PharmacyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"popular" | "low" | "high">("popular");

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  const [mounted, setMounted] = useState(false);
  const { addItem, getItemCount, getRxItems } = useCartStore();
  const isPremium = useSubscriptionStore((s) => s.isPremium());
  const { showToast } = useToast();

  const rxItems = getRxItems();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddToCart = (medicine: Medicine) => {
    addItem(medicine);
    showToast(`${medicine.name} added to cart.`, "success");
  };

  const cartCount = mounted ? getItemCount() : 0;

  const filteredMedicines = useMemo(() => {
    let list: Medicine[] = (medicinesData as Medicine[]).filter((med) => {
      const matchesCategory =
        selectedCategory === "All" ||
        med.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        med.name.toLowerCase().includes(q) ||
        med.genericName.toLowerCase().includes(q) ||
        med.description.toLowerCase().includes(q) ||
        med.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });

    if (sortBy === "low") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "high") {
      list.sort((a, b) => b.price - a.price);
    }
    // "popular" preserves original static data order

    return list;
  }, [searchQuery, selectedCategory, sortBy]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-24 md:pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] md:text-[40px] font-heading font-extrabold text-text-primary tracking-tight">
            Pharmacy
          </h1>
          <p className="text-[16px] text-text-muted mt-1">
            Order medicines from home. Confirmation via WhatsApp.
          </p>
        </div>

        {/* Desktop Cart Button */}
        <div className="hidden md:block">
          <Button
            variant="secondary"
            size="m"
            onClick={() => setIsCartOpen(true)}
            className="relative"
            leftIcon={<ShoppingBag className="w-5 h-5" />}
          >
            Cart
            {cartCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-brand text-white text-[12px] font-bold">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <label htmlFor="medicine-search" className="sr-only">
              Search medicines by name or symptom
            </label>
            <Input
              id="medicine-search"
              type="search"
              autoComplete="off"
              placeholder="Search medicine or symptom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5 text-text-muted" aria-hidden="true" />}
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="medicine-sort" className="text-[14px] font-bold text-text-muted whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="medicine-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "popular" | "low" | "high")}
              className="w-full h-12 px-3 rounded-md border border-border-soft bg-white text-[14px] font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="popular">Popular</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            />
          ))}
        </div>
      </div>

      {/* Result count — announced when the list changes */}
      <p role="status" aria-live="polite" className="sr-only">
        {filteredMedicines.length} medicine{filteredMedicines.length === 1 ? "" : "s"} found
      </p>

      {/* Medicine Grid */}
      {filteredMedicines.length === 0 ? (
        <div className="bg-white border border-border-soft rounded-[16px] p-12 text-center my-8">
          <h3 className="text-[20px] font-bold text-text-primary mb-2">
            No Medicines Found
          </h3>
          <p className="text-[15px] text-text-muted mb-6 max-w-sm mx-auto">
            We couldn't find any medicines matching your search criteria.
          </p>
          <Button
            variant="secondary"
            size="m"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMedicines.map((medicine) => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              onAdd={handleAddToCart}
              isPremium={mounted && isPremium}
            />
          ))}
        </div>
      )}

      {/* Journey navigation — where the patient goes next */}
      <div className="mt-12 bg-white border border-border-soft rounded-[16px] p-6 shadow-sm">
        <h2 className="text-[20px] font-heading font-bold text-text-primary">
          Not sure where to go next?
        </h2>
        <p className="text-[14px] text-text-muted mt-1 mb-5">
          Symptoms, then the medicine, then the doctor. Pick up where you left off.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-10">
          <TextLink href="/chat">← Ask Dr MediLink about your symptoms</TextLink>
          <TextLink href="/doctors">Find a doctor for your prescription →</TextLink>
        </div>
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => setIsCheckoutOpen(true)}
        onUploadPrescription={() => setIsPrescriptionOpen(true)}
      />

      {/* Mobile Sticky Bar */}
      <CartSummaryBar onOpenCart={() => setIsCartOpen(true)} />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(order) => setSuccessOrder(order)}
        onUploadPrescription={() => setIsPrescriptionOpen(true)}
      />

      {/* Prescription upload / verification */}
      <PrescriptionUploadModal
        isOpen={isPrescriptionOpen}
        onClose={() => setIsPrescriptionOpen(false)}
        rxItems={rxItems}
        medicines={medicinesData as Medicine[]}
      />

      {/* Order Success Modal */}
      <OrderSuccessModal
        isOpen={!!successOrder}
        onClose={() => setSuccessOrder(null)}
        order={successOrder}
      />
    </div>
  );
}
