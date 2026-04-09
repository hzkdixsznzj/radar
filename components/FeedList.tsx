"use client";

import { useEffect, useState, useCallback } from "react";
import { TenderCard } from "./TenderCard";
import type { Tender } from "@/lib/types";

export function FeedList() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/tenders");
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data: Tender[] = await res.json();
      setTenders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  function handleDismiss(tenderId: string) {
    setTenders((prev) => prev.filter((t) => t.id !== tenderId));
  }

  function handleSave(tenderId: string) {
    const saved: string[] = JSON.parse(localStorage.getItem("radar_saved") ?? "[]");
    if (!saved.includes(tenderId)) {
      saved.push(tenderId);
      localStorage.setItem("radar_saved", JSON.stringify(saved));
    }
    setTenders((prev) => prev.filter((t) => t.id !== tenderId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-radar-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 px-6">
        <p className="text-radar-text-muted text-sm">{error}</p>
      </div>
    );
  }

  if (tenders.length === 0) {
    return (
      <div className="text-center py-20 px-6">
        <div className="text-4xl mb-4">&#128269;</div>
        <p className="font-semibold">Aucune opportunité pour le moment</p>
        <p className="text-sm text-radar-text-muted mt-2">
          Les marchés sont analysés chaque matin à 7h.
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
          onSave={() => handleSave(tender.id)}
          onDismiss={() => handleDismiss(tender.id)}
        />
      ))}
    </div>
  );
}
