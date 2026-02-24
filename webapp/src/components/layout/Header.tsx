"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Home, Users, FileText, Handshake, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstagramProfile } from "@/types/instagram";

interface HeaderProps {
  profile?: InstagramProfile;
  mode: "creator" | "agency";
  agencyName?: string;
}

export function Header({ profile, mode, agencyName }: HeaderProps) {
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
            {mode === "creator" ? "Créateur" : "Agence"}
          </Badge>
        </div>

        {/* Center: Nav links (creator mode) */}
        {mode === "creator" && (
          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/creator/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
              <Link href="/creator/interactions">
                <Users className="h-3.5 w-3.5" />
                Interactions
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
              <Link href="/creator/mediakit">
                <FileText className="h-3.5 w-3.5" />
                Media Kit
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
              <Link href="/creator/collabs">
                <Handshake className="h-3.5 w-3.5" />
                Collabs
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
              <Link href="/creator/responses">
                <MessageCircle className="h-3.5 w-3.5" />
                Réponses
              </Link>
            </Button>
          </nav>
        )}

        {/* Right: Profile + Theme */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href="/" aria-label="Retour à l'accueil">
              <Home className="h-4 w-4" />
            </Link>
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
                  ? `${profile?.followerCount?.toLocaleString("fr-FR") ?? "—"} abonnés`
                  : "Portfolio"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
