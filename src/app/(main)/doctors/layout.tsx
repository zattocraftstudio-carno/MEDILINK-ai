import type { Metadata } from "next";

/**
 * The page itself is a client component, so it cannot export `metadata`.
 * A route layout can — this is where the per-route title and description
 * live, instead of every route inheriting the root layout's generic one.
 */
export const metadata: Metadata = {
  title: "Find Verified Doctors in Bangladesh | MediLink AI",
  description: "Browse MediLink AI's directory of verified Bangladeshi specialists — Cardiologists, Neurologists, Gynaecologists and more. See consultation fees, chamber addresses and book an appointment on WhatsApp.",
  alternates: { canonical: "/doctors" },
  openGraph: {
    title: "Find Verified Doctors in Bangladesh | MediLink AI",
    description: "Browse MediLink AI's directory of verified Bangladeshi specialists — Cardiologists, Neurologists, Gynaecologists and more. See consultation fees, chamber addresses and book an appointment on WhatsApp.",
    url: "/doctors",
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
