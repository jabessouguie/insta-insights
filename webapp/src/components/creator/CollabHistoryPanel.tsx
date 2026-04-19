"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  loadPastCollabs,
  savePastCollab,
  deletePastCollab,
  type PastCollab,
} from "@/lib/past-collabs-store";

export function CollabHistoryPanel() {
  const [collabs, setCollabs] = useState<PastCollab[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [brand, setBrand] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [obtained, setObtained] = useState("");
  const [results, setResults] = useState("");
  const [doneAt, setDoneAt] = useState("");

  useEffect(() => {
    setCollabs(loadPastCollabs());
  }, []);

  const handleAdd = () => {
    if (!brand.trim() || !deliverables.trim() || !obtained.trim() || !doneAt.trim()) return;

    const newCollab = savePastCollab({
      brand: brand.trim(),
      deliverables: deliverables.trim(),
      obtained: obtained.trim(),
      results: results.trim() || undefined,
      doneAt,
    });

    setCollabs((prev) => [newCollab, ...prev]);

    // reset
    setBrand("");
    setDeliverables("");
    setObtained("");
    setResults("");
    setDoneAt("");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deletePastCollab(id);
    setCollabs((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Historique des collaborations</h2>
          <p className="text-sm text-muted-foreground">
            Ajoute tes collaborations passées pour enrichir tes prochains pitchs avec ton
            expérience.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? (
            "Annuler"
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Nouvelle collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Marque partenaire *
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Sephora"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Date de fin *
                </label>
                <input
                  type="month"
                  value={doneAt}
                  onChange={(e) => setDoneAt(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Livrables créés *
              </label>
              <input
                type="text"
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                placeholder="Ex: 1 Reel + 3 Stories + participation à l'événement"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Valeur obtenue (rémunération) *
              </label>
              <input
                type="text"
                value={obtained}
                onChange={(e) => setObtained(e.target.value)}
                placeholder="Ex: 500€ + Produits d'une valeur de 150€"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Résultats obtenus (Optionnel)
              </label>
              <input
                type="text"
                value={results}
                onChange={(e) => setResults(e.target.value)}
                placeholder="Ex: 50K vues, +300 followers pour la marque, 20 codes promo utilisés"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleAdd}
              disabled={!brand.trim() || !deliverables.trim() || !obtained.trim() || !doneAt.trim()}
            >
              Enregistrer la collaboration
            </Button>
          </CardContent>
        </Card>
      )}

      {collabs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <History className="h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">Aucune collaboration enregistrée</p>
          <p className="max-w-xs text-xs">
            Renseigne tes collabs passées pour que l'IA puisse s'y référer dans tes pitchs futurs.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {collabs.map((collab) => (
            <Card key={collab.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">{collab.brand}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {new Date(collab.doneAt).toLocaleDateString("fr-FR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </CardDescription>
                  </div>
                  <button
                    onClick={() => handleDelete(collab.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Livrables
                  </span>
                  <span className="font-medium">{collab.deliverables}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Revenu / Rémunération
                  </span>
                  <span className="font-medium text-emerald-500">{collab.obtained}</span>
                </div>
                {collab.results && (
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Résultats
                    </span>
                    <span className="font-medium text-amber-500">{collab.results}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
