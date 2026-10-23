import type { Metadata } from "next";

/**
 * The page itself is a client component, so it cannot export `metadata`.
 * A route layout can — this is where the per-route title and description
 * live, instead of every route inheriting the root layout's generic one.
 */
export const metadata: Metadata = {
  title: "About MediLink AI — Healthcare for Bangladesh",
  description: "MediLink AI bridges the gap between Bangladeshi patients and quality healthcare with AI-assisted guidance, verified specialists, doorstep medicines and 24/7 emergency support.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About MediLink AI — Healthcare for Bangladesh",
    description: "MediLink AI bridges the gap between Bangladeshi patients and quality healthcare with AI-assisted guidance, verified specialists, doorstep medicines and 24/7 emergency support.",
    url: "/about",
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
