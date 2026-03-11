"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Home,
  Users,
  FileText,
  Handshake,
  MessageSquarePlus,
  LayoutPanelLeft,
  CalendarDays,
  BarChart2,
  Link2,
  Menu,
  X,
  Video,
  TrendingUp,
  Palette,
  Hash,
  Receipt,
  Gift,
  BookImage,
  FlaskConical,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstagramProfile } from "@/types/instagram";
import { useLanguage } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";

interface HeaderProps {
  profile?: InstagramProfile;
  mode: "creator" | "agency";
  agencyName?: string;
}

export function Header({ profile, mode, agencyName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang, toggle } = useLanguage();
  const t = useT();

  const navLinks = [
    { href: "/creator/dashboard", label: t("nav.dashboard"), icon: null },
    { href: "/creator/interactions", label: t("nav.interactions"), icon: Users },
    { href: "/creator/audience", label: t("nav.audience"), icon: Users },
    { href: "/creator/reels", label: t("nav.reels"), icon: Video },
    { href: "/creator/stories", label: t("nav.stories"), icon: BookImage },
    { href: "/creator/competitive", label: t("nav.competitive"), icon: TrendingUp },
    { href: "/creator/hashtags", label: t("nav.hashtags"), icon: Hash },
    { href: "/creator/reports", label: t("nav.reports"), icon: BarChart2 },
    { href: "/creator/mediakit", label: t("nav.mediakit"), icon: FileText },
    { href: "/creator/carousel", label: t("nav.carousel"), icon: LayoutPanelLeft },
    { href: "/creator/captions", label: t("nav.captions"), icon: FlaskConical },
    { href: "/creator/calendar", label: t("nav.calendar"), icon: CalendarDays },
    { href: "/creator/collabs", label: t("nav.collabs"), icon: Handshake },
    { href: "/creator/campaigns", label: t("nav.campaigns"), icon: Target },
    { href: "/creator/comments", label: t("nav.comments"), icon: MessageSquarePlus },
    { href: "/creator/invoice", label: t("nav.invoice"), icon: Receipt },
    { href: "/creator/referral", label: t("nav.referral"), icon: Gift },
    { href: "/creator/connect", label: t("nav.connect"), icon: Link2 },
    { href: "/creator/settings", label: t("nav.settings"), icon: Palette },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Logo + Mode badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="instagram-gradient flex h-8 w-8 items-center justify-center rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="hidden font-bold text-foreground sm:inline">InstaInsights</span>
          </Link>

          <Badge
            variant={mode === "creator" ? "default" : "secondary"}
            className="hidden sm:inline-flex"
          >
            {mode === "creator" ? t("header.creator") : t("header.agency")}
          </Badge>
        </div>

        {/* Center: Nav links (creator mode) */}
        {mode === "creator" && (
          <>
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Button
                  key={link.href}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  asChild
                >
                  <Link href={link.href}>
                    {link.icon && <link.icon className="h-3.5 w-3.5" />}
                    {link.label}
                  </Link>
                </Button>
              ))}
            </nav>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </>
        )}

        {/* Right: Profile + Theme */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href="/" aria-label={t("header.homeAriaLabel")}>
              <Home className="h-4 w-4" />
            </Link>
          </Button>

          {/* Language toggle — shows the language you will switch TO */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="h-9 w-12 text-xs font-semibold"
            title={lang === "fr" ? "Switch to English" : "Passer en français"}
          >
            {lang === "fr" ? "EN" : "FR"}
          </Button>

          <ThemeToggle />

          {/* Profile avatar */}
          <div className="flex items-center gap-2.5 pl-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.profilePicUrl} alt={profile?.username ?? agencyName} />
              <AvatarFallback className="text-xs">
                {(profile?.username ?? agencyName ?? "?").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col md:flex">
              <span className="text-xs font-medium leading-none">
                {mode === "agency" ? agencyName : `@${profile?.username ?? "..."}`}
              </span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {mode === "creator"
                  ? `${profile?.followerCount?.toLocaleString("fr-FR") ?? "—"} ${t("header.followers")}`
                  : t("header.portfolio")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && mode === "creator" && (
        <div className="animate-in fade-in slide-in-from-top-4 fixed inset-x-0 top-16 z-50 md:hidden">
          <div className="border-b border-border bg-background/95 p-4 shadow-xl backdrop-blur-lg">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Button
                  key={link.href}
                  variant="ghost"
                  className="justify-start gap-3 px-4 py-6 text-sm"
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href={link.href}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      {link.icon ? <link.icon className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                    </div>
                    {link.label}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
