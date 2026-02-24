import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Créateur",
  description: "Analytics Instagram pour créateurs de contenu",
};

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
