"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Home,
  Users,
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
  ChevronDown,
  Check,
  Trash2,
  Hash,
  Receipt,
  Share2,
  Layers,
  FlaskConical,
  Target,
  BookOpen,
  HelpCircle,
  Clapperboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstagramProfile } from "@/types/instagram";
import { useLanguage } from "@/contexts/LanguageContext";
import { useT } from "@/lib/i18n";
import {
  loadAccounts,
  getActiveAccountId,
  setActiveAccountId,
  removeAccount,
  type SavedAccount,
} from "@/lib/accounts-store";

interface HeaderProps {
  profile?: InstagramProfile;
  mode: "creator" | "agency";
  agencyName?: string;
}

export function Header({ profile, mode, agencyName }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { lang, toggle } = useLanguage();
  const t = useT();
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // ── Multi-account state ────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAccounts(loadAccounts());
    setActiveId(getActiveAccountId());
  }, []);

  // Close account dropdown on outside click
  useEffect(() => {
    if (!accountDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [accountDropdownOpen]);

  // Close more menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreMenuOpen]);

  const handleSwitchAccount = (id: string) => {
    setActiveAccountId(id);
    setActiveId(id);
    setAccountDropdownOpen(false);
  };

  const handleRemoveAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeAccount(id);
    const updated = loadAccounts();
    setAccounts(updated);
    if (activeId === id) {
      const next = updated[updated.length - 1]?.id ?? null;
      setActiveId(next);
      setActiveAccountId(next);
    }
  };

  // The account to display: active saved account when available, else fall back to profile prop
  const activeAccount = accounts.find((a) => a.id === activeId) ?? accounts[accounts.length - 1];
  const displayUsername =
    mode === "creator"
      ? (activeAccount?.username ?? profile?.username ?? "...")
      : (agencyName ?? "...");
  const displayPicUrl = activeAccount?.profilePicUrl ?? profile?.profilePicUrl ?? undefined;
  const displayFollowers = activeAccount?.followerCount ?? profile?.followerCount;

  // ── Navigation ────────────────────────────────────────────────────────
  // 5 primary links always visible; the rest collapse into the "More" dropdown
  const primaryLinks = [
    { href: "/creator/dashboard", label: t("nav.dashboard"), icon: null },
    { href: "/creator/carousel", label: t("nav.carousel"), icon: LayoutPanelLeft },
    { href: "/creator/collabs", label: t("nav.collabs"), icon: Handshake },
    { href: "/creator/calendar", label: t("nav.calendar"), icon: CalendarDays },
    { href: "/creator/settings", label: t("nav.settings"), icon: Palette },
  ];

  const moreLinks = [
    { href: "/creator/interactions", label: t("nav.interactions"), icon: Users },
    { href: "/creator/audience", label: t("nav.audience"), icon: Users },
    { href: "/creator/reels", label: t("nav.reels"), icon: Video },
    { href: "/creator/reels-editor", label: t("nav.reels_editor"), icon: Clapperboard },
    { href: "/creator/competitive", label: t("nav.competitive"), icon: TrendingUp },
    { href: "/creator/reports", label: t("nav.reports"), icon: BarChart2 },
    { href: "/creator/comments", label: t("nav.comments"), icon: MessageSquarePlus },
    { href: "/creator/hashtags", label: t("nav.hashtags"), icon: Hash },
    { href: "/creator/stories", label: t("nav.stories"), icon: Layers },
    { href: "/creator/captions", label: t("nav.captions"), icon: FlaskConical },
    { href: "/creator/campaigns", label: t("nav.campaigns"), icon: Target },
    { href: "/creator/invoice", label: t("nav.invoice"), icon: Receipt },
    { href: "/creator/referral", label: t("nav.referral"), icon: Share2 },
    { href: "/creator/guide", label: t("nav.guide"), icon: BookOpen },
    { href: "/creator/ugc", label: t("nav.ugc"), icon: Sparkles },
    { href: "/creator/connect", label: t("nav.connect"), icon: Link2 },
    { href: "/help", label: t("nav.help"), icon: HelpCircle },
  ];

  // All links (for mobile menu)
  const allLinks = [...primaryLinks, ...moreLinks];

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
              {/* Primary links */}
              {primaryLinks.map((link) => (
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

              {/* More dropdown */}
              <div className="relative" ref={moreMenuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setMoreMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={moreMenuOpen}
                >
                  {t("nav.more")}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${moreMenuOpen ? "rotate-180" : ""}`}
                  />
                </Button>

                {moreMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-popover p-1 shadow-lg"
                  >
                    {moreLinks.map((link) => (
                      <Button
                        key={link.href}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs"
                        asChild
                        onClick={() => setMoreMenuOpen(false)}
                      >
                        <Link href={link.href} role="menuitem">
                          {link.icon && <link.icon className="h-3.5 w-3.5 shrink-0" />}
                          {link.label}
                        </Link>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
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

          {/* Profile avatar — with account switcher + sign-out dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2.5 rounded-md py-1 pl-2 pr-1 transition-colors hover:bg-accent/50"
              onClick={() => (mode === "creator" ? setAccountDropdownOpen((o) => !o) : undefined)}
              aria-label={t("header.accounts.switch")}
              aria-haspopup={mode === "creator" ? "listbox" : undefined}
              aria-expanded={accountDropdownOpen}
              type="button"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={displayPicUrl} alt={displayUsername} />
                <AvatarFallback className="text-xs">
                  {displayUsername.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col md:flex">
                <span className="text-xs font-medium leading-none">
                  {mode === "agency" ? agencyName : `@${displayUsername}`}
                </span>
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {mode === "creator"
                    ? `${displayFollowers?.toLocaleString("fr-FR") ?? "—"} ${t("header.followers")}`
                    : t("header.portfolio")}
                </span>
              </div>
              {mode === "creator" && (
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${accountDropdownOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>

            {/* Account switcher + sign-out dropdown */}
            {accountDropdownOpen && (
              <div
                role="listbox"
                aria-label={t("header.accounts.switch")}
                className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover shadow-lg"
              >
                {/* Instagram accounts */}
                {accounts.length >= 2 && (
                  <div className="p-1">
                    {accounts.map((acc) => {
                      const isActive =
                        acc.id === activeId || (!activeId && acc === accounts[accounts.length - 1]);
                      return (
                        <button
                          key={acc.id}
                          role="option"
                          aria-selected={isActive}
                          tabIndex={0}
                          type="button"
                          className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent ${isActive ? "bg-accent/50" : ""}`}
                          onClick={() => handleSwitchAccount(acc.id)}
                          onKeyDown={(e) => e.key === "Enter" && handleSwitchAccount(acc.id)}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={acc.profilePicUrl} alt={acc.username} />
                            <AvatarFallback className="text-[10px]">
                              {acc.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">@{acc.username}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {acc.followerCount.toLocaleString("fr-FR")} {t("header.followers")}
                            </p>
                          </div>
                          {isActive ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                          ) : (
                            <button
                              type="button"
                              title={t("header.accounts.remove")}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(e) => handleRemoveAccount(acc.id, e)}
                              aria-label={t("header.accounts.remove")}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && mode === "creator" && (
        <div className="animate-in fade-in slide-in-from-top-4 fixed inset-x-0 top-16 z-50 md:hidden">
          <div className="border-b border-border bg-background/95 p-4 shadow-xl backdrop-blur-lg">
            <nav className="flex flex-col gap-2">
              {allLinks.map((link) => (
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
