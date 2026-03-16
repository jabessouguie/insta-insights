import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable — InstaInsights",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#111c1b] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ffd953]/20 bg-[#ffd953]/10">
        <span className="text-3xl font-black text-[#ffd953]">404</span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Page introuvable</h1>
        <p className="max-w-sm text-sm text-[#cfcbba]/60">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl bg-[#ffd953] px-5 py-2.5 text-sm font-semibold text-[#111c1b] transition-opacity hover:opacity-90"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/help"
          className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-[#cfcbba] transition-colors hover:border-white/20 hover:text-white"
        >
          Centre d&apos;aide
        </Link>
      </div>
    </div>
  );
}
