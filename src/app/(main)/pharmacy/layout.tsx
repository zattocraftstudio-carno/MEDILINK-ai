import type { Metadata } from "next";

/**
 * The page itself is a client component, so it cannot export `metadata`.
 * A route layout can — this is where the per-route title and description
 * live, instead of every route inheriting the root layout's generic one.
 */
export const metadata: Metadata = {
  title: "Order Medicines Online in Bangladesh | MediLink AI",
  description: "Order your medicines from the MediLink AI pharmacy with delivery across Bangladesh. Search by medicine or symptom, upload a prescription, and check out securely.",
  alternates: { canonical: "/pharmacy" },
  openGraph: {
    title: "Order Medicines Online in Bangladesh | MediLink AI",
    description: "Order your medicines from the MediLink AI pharmacy with delivery across Bangladesh. Search by medicine or symptom, upload a prescription, and check out securely.",
    url: "/pharmacy",
    type: "website",
  },
};

export default function RouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
