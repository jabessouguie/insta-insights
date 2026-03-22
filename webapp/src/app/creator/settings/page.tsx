"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Palette,
  Type,
  Check,
  RotateCcw,
  User,
  Camera,
  Handshake,
  Trash2,
  Plus,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useT } from "@/lib/i18n";
import {
  loadBrandSettings,
  saveBrandSettings,
  DEFAULT_BRAND_SETTINGS,
  type BrandSettings,
} from "@/lib/brand-settings-store";
import {
  loadUserProfile,
  saveUserProfile,
  DEFAULT_USER_PROFILE,
  type UserProfile,
} from "@/lib/user-profile-store";
import {
  loadPastCollabs,
  savePastCollab,
  deletePastCollab,
  type PastCollab,
} from "@/lib/past-collabs-store";

// Popular Google Fonts for creator content
const FONT_OPTIONS = [
  "Playfair Display",
  "Montserrat",
  "Roboto",
  "Inter",
  "Lato",
  "Poppins",
  "Raleway",
  "Oswald",
  "Merriweather",
  "Nunito",
  "Josefin Sans",
  "Cormorant Garamond",
  "DM Serif Display",
  "Space Grotesk",
  "Bebas Neue",
];

// ─── Font selector ─────────────────────────────────────────────────────────────

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>
      <p className="text-sm" style={{ fontFamily: value }}>
        Aperçu : Créateur de contenu passionné
      </p>
    </div>
  );
}

// ─── Color input ──────────────────────────────────────────────────────────────

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
      />
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-mono text-xs text-foreground">{value.toUpperCase()}</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-f]{0,6}$/i.test(v)) onChange(v);
        }}
        className="w-28 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        maxLength={7}
        placeholder="#000000"
      />
    </div>
  );
}

// ─── Color palette preview ────────────────────────────────────────────────────

function PalettePreview({ settings }: { settings: BrandSettings }) {
  return (
    <div className="flex gap-2 pt-2">
      {[
        settings.primaryColor,
        settings.secondaryColor,
        settings.accentColor,
        settings.neutralColor,
      ].map((color, i) => (
        <div
          key={i}
          className="h-10 flex-1 rounded-lg border border-border/40"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// ─── Text input field ─────────────────────────────────────────────────────────

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const profileSwrFetcher = (url: string) =>
  fetch(url)
    .then((r) => r.json())
    .then((r) => r.profile);

export default function SettingsPage() {
  const t = useT();
  const { data: instagramData } = useInstagramData();
  const { data: session } = useSession();
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [saved, setSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Past collaborations
  const [pastCollabs, setPastCollabs] = useState<PastCollab[]>([]);
  const [showAddCollab, setShowAddCollab] = useState(false);
  const [newCollab, setNewCollab] = useState({
    brand: "",
    deliverables: "",
    obtained: "",
    results: "",
    doneAt: "",
  });

  const { data: remoteProfile } = useSWR<UserProfile | null>(
    session?.user?.id ? "/api/user/profile" : null,
    profileSwrFetcher
  );

  // Load from localStorage on mount; prefer remote profile when authenticated
  useEffect(() => {
    setSettings(loadBrandSettings());
    setPastCollabs(loadPastCollabs());
    if (remoteProfile) setProfile({ ...DEFAULT_USER_PROFILE, ...remoteProfile });
    else setProfile(loadUserProfile());
  }, [remoteProfile]);

  const handleAddCollab = () => {
    if (!newCollab.brand.trim() || !newCollab.deliverables.trim() || !newCollab.obtained.trim())
      return;
    const added = savePastCollab({
      brand: newCollab.brand.trim(),
      deliverables: newCollab.deliverables.trim(),
      obtained: newCollab.obtained.trim(),
      results: newCollab.results.trim() || undefined,
      doneAt: newCollab.doneAt || new Date().toISOString().slice(0, 7),
    });
    setPastCollabs((prev) => [added, ...prev]);
    setNewCollab({ brand: "", deliverables: "", obtained: "", results: "", doneAt: "" });
    setShowAddCollab(false);
  };

  const handleDeleteCollab = (id: string) => {
    deletePastCollab(id);
    setPastCollabs((prev) => prev.filter((c) => c.id !== id));
  };

  const update = (key: keyof BrandSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateProfile = (key: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveBrandSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveProfile = () => {
    saveUserProfile(profile);
    if (session?.user?.id) {
      fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleReset = () => {
    setSettings(DEFAULT_BRAND_SETTINGS);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Photo trop lourde (max 2 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile("profilePhotoBase64", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header profile={instagramData?.profile} mode="creator" />

      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Palette className="h-6 w-6 text-primary" />
            {t("settings.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
        </div>

        <div className="space-y-6">
          {/* ── Profil personnel ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Profil personnel
              </CardTitle>
              <CardDescription>
                Ces informations seront utilisées dans votre media kit et vos emails de
                collaboration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div
                  className="relative h-16 w-16 cursor-pointer overflow-hidden rounded-full border-2 border-border bg-muted"
                  onClick={() => photoInputRef.current?.click()}
                >
                  {profile.profilePhotoBase64 ? (
                    <img
                      src={profile.profilePhotoBase64}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Changer la photo
                  </button>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP — max 2 Mo</p>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Prénom"
                  value={profile.firstName}
                  onChange={(v) => updateProfile("firstName", v)}
                  placeholder="Jean"
                />
                <TextInput
                  label="Nom"
                  value={profile.lastName}
                  onChange={(v) => updateProfile("lastName", v)}
                  placeholder="Dupont"
                />
              </div>

              {/* Contact */}
              <TextInput
                label="Email de contact"
                value={profile.email}
                onChange={(v) => updateProfile("email", v)}
                placeholder="jean@example.com"
                type="email"
              />
              <TextInput
                label="Téléphone"
                value={profile.phone}
                onChange={(v) => updateProfile("phone", v)}
                placeholder="+33 6 12 34 56 78"
                type="tel"
              />

              {/* Save profile */}
              <div className="flex items-center gap-3 pt-1">
                <Button onClick={handleSaveProfile} size="sm" className="gap-2">
                  {profileSaved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Profil sauvegardé
                    </>
                  ) : (
                    "Sauvegarder le profil"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fonts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Type className="h-4 w-4 text-primary" />
                {t("settings.fonts.title")}
              </CardTitle>
              <CardDescription>
                Ces polices seront pré-remplies dans le créateur de carousel et le media kit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FontSelect
                label={t("settings.fonts.title_label")}
                value={settings.fontTitle}
                onChange={(v) => update("fontTitle", v)}
              />
              <FontSelect
                label={t("settings.fonts.subtitle_label")}
                value={settings.fontSubtitle}
                onChange={(v) => update("fontSubtitle", v)}
              />
              <FontSelect
                label={t("settings.fonts.body_label")}
                value={settings.fontBody}
                onChange={(v) => update("fontBody", v)}
              />
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-primary" />
                {t("settings.colors.title")}
              </CardTitle>
              <CardDescription>
                Ces couleurs seront utilisées comme valeurs par défaut dans vos créations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorInput
                label={t("settings.colors.primary")}
                value={settings.primaryColor}
                onChange={(v) => update("primaryColor", v)}
              />
              <ColorInput
                label={t("settings.colors.secondary")}
                value={settings.secondaryColor}
                onChange={(v) => update("secondaryColor", v)}
              />
              <ColorInput
                label={t("settings.colors.accent")}
                value={settings.accentColor}
                onChange={(v) => update("accentColor", v)}
              />
              <ColorInput
                label={t("settings.colors.neutral")}
                value={settings.neutralColor}
                onChange={(v) => update("neutralColor", v)}
              />
              <PalettePreview settings={settings} />
            </CardContent>
          </Card>

          {/* Brand settings actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} className="gap-2">
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("settings.saved")}
                </>
              ) : (
                t("settings.save")
              )}
            </Button>
            <Button variant="ghost" onClick={handleReset} className="gap-2 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("settings.reset")}
            </Button>
          </div>

          {/* Past collaborations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Handshake className="h-4 w-4 text-primary" />
                  Collaborations passées
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => setShowAddCollab((v) => !v)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>
              <CardDescription>
                Tes collabs passées seront injectées automatiquement dans la génération
                d&apos;emails et le Media Kit pour renforcer ta crédibilité.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add form */}
              {showAddCollab && (
                <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-sm font-medium">Nouvelle collaboration</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Marque / Partenaire *</label>
                      <input
                        type="text"
                        value={newCollab.brand}
                        onChange={(e) => setNewCollab((p) => ({ ...p, brand: e.target.value }))}
                        placeholder="ex : Hôtel Le Meurice"
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Date (mois)</label>
                      <input
                        type="month"
                        value={newCollab.doneAt}
                        onChange={(e) => setNewCollab((p) => ({ ...p, doneAt: e.target.value }))}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Ce que tu as livré *</label>
                    <input
                      type="text"
                      value={newCollab.deliverables}
                      onChange={(e) =>
                        setNewCollab((p) => ({ ...p, deliverables: e.target.value }))
                      }
                      placeholder="ex : 3 posts + 5 stories + 1 reel"
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Ce que tu as obtenu *</label>
                    <input
                      type="text"
                      value={newCollab.obtained}
                      onChange={(e) => setNewCollab((p) => ({ ...p, obtained: e.target.value }))}
                      placeholder="ex : Séjour offert 2 nuits + 500 € de cachet"
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Résultats obtenus{" "}
                      <span className="text-muted-foreground/60">(optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={newCollab.results}
                      onChange={(e) => setNewCollab((p) => ({ ...p, results: e.target.value }))}
                      placeholder="ex : 12k vues sur le reel, 80 codes promo utilisés"
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddCollab} className="gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddCollab(false)}
                      className="text-muted-foreground"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}

              {/* List */}
              {pastCollabs.length === 0 && !showAddCollab ? (
                <p className="rounded-xl border border-dashed border-border/40 py-6 text-center text-sm text-muted-foreground">
                  Aucune collaboration enregistrée.{" "}
                  <button
                    className="text-primary underline-offset-2 hover:underline"
                    onClick={() => setShowAddCollab(true)}
                  >
                    Ajouter la première
                  </button>
                </p>
              ) : (
                <div className="space-y-2">
                  {pastCollabs.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/10 p-3"
                    >
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{c.brand}</p>
                          {c.doneAt && (
                            <span className="text-xs text-muted-foreground">{c.doneAt}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">Livré :</span>{" "}
                          {c.deliverables}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70">Obtenu :</span>{" "}
                          {c.obtained}
                        </p>
                        {c.results && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">Résultats :</span>{" "}
                            {c.results}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteCollab(c.id)}
                        className="mt-0.5 shrink-0 text-muted-foreground/40 transition-colors hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
