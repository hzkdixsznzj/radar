"use client";

import { useEffect, useState, useCallback } from "react";
import { TenderCard } from "./TenderCard";
import type { Tender } from "@/lib/types";

export function SavedList() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const savedIds: string[] = JSON.parse(
        localStorage.getItem("radar_saved") ?? "[]"
      );

      if (savedIds.length === 0) {
        setTenders([]);
        return;
      }

      const res = await fetch("/api/tenders");
      if (!res.ok) throw new Error("Erreur");
      const all: Tender[] = await res.json();

      const saved = all.filter((t) => savedIds.includes(t.id));
      setTenders(saved);
    } catch {
      setTenders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  function handleRemove(tenderId: string) {
    const savedIds: string[] = JSON.parse(
      localStorage.getItem("radar_saved") ?? "[]"
    );
    const updated = savedIds.filter((id) => id !== tenderId);
    localStorage.setItem("radar_saved", JSON.stringify(updated));
    setTenders((prev) => prev.filter((t) => t.id !== tenderId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-radar-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tenders.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">&#128278;</div>
        <p className="font-semibold">Aucun marché sauvegardé</p>
        <p className="text-sm text-radar-text-muted mt-2">
          Sauvegardez des marchés depuis le feed pour les retrouver ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tenders.map((tender) => (
        <TenderCard
          key={tender.id}
          tender={tender}
          onDismiss={() => handleRemove(tender.id)}
          dismissLabel="Retirer"
        />
      ))}
    </div>
  );
}
