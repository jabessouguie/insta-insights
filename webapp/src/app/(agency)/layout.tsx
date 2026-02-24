import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Agence",
  description: "Portfolio de créateurs et analytics pour agences",
};

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
