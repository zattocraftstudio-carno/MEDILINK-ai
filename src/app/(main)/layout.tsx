import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ToastProvider } from "@/components/ui/Toast";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 w-full pt-[var(--content-offset)] pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </ToastProvider>
  );
}
