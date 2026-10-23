import type { Metadata } from "next";

/**
 * The page itself is a client component, so it cannot export `metadata`.
 * A route layout can — this is where the per-route title and description
 * live, instead of every route inheriting the root layout's generic one.
 */
export const metadata: Metadata = {
  title: "Emergency Help & Nearby Hospitals | MediLink AI",
  description: "Find the nearest emergency departments in Bangladesh, call the national 999 ambulance service, and share your location with an emergency contact when every second counts.",
  alternates: { canonical: "/emergency" },
  openGraph: {
    title: "Emergency Help & Nearby Hospitals | MediLink AI",
    description: "Find the nearest emergency departments in Bangladesh, call the national 999 ambulance service, and share your location with an emergency contact when every second counts.",
    url: "/emergency",
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
