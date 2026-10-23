import type { Metadata } from "next";

/**
 * The page itself is a client component, so it cannot export `metadata`.
 * A route layout can — this is where the per-route title and description
 * live, instead of every route inheriting the root layout's generic one.
 */
export const metadata: Metadata = {
  title: "Create Your Free MediLink AI Account",
  description: "Create a free MediLink AI account to unlock personalised AI health guidance, doctor discovery, medicine ordering and medication reminders.",
  alternates: { canonical: "/register" },
  openGraph: {
    title: "Create Your Free MediLink AI Account",
    description: "Create a free MediLink AI account to unlock personalised AI health guidance, doctor discovery, medicine ordering and medication reminders.",
    url: "/register",
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
