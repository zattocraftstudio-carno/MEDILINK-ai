import type { Metadata } from "next";

/**
 * The page itself is a client component, so it cannot export `metadata`.
 * A route layout can — this is where the per-route title and description
 * live, instead of every route inheriting the root layout's generic one.
 */
export const metadata: Metadata = {
  title: "Contact MediLink AI",
  description: "Get in touch with the MediLink AI team — support, partnerships, press and feedback. We reply within one business day.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact MediLink AI",
    description: "Get in touch with the MediLink AI team — support, partnerships, press and feedback. We reply within one business day.",
    url: "/contact",
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
