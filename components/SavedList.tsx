"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { TenderCard } from "./TenderCard";
import type { TenderWithAnalysis } from "@/lib/types";

export function SavedList() {
  const [tenders, setTenders] = useState<TenderWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"saved" | "applied">("saved");

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("analyses")
        .select("*, tenders(*)")
        .eq("profile_id", user.id)
        .eq("status", filter)
        .order("created_at", { ascending: false });

      const mapped: TenderWithAnalysis[] = (data ?? []).map(
        (row) => {
          const { tenders: tender, ...analysis } = row as Record<string, unknown>;
          return {
            ...(tender as unknown as TenderWithAnalysis),
            analysis: analysis as unknown as TenderWithAnalysis["analysis"],
          };
        }
      );

      setTenders(mapped);
    } catch {
      // Error loading saved
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("saved")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            filter === "saved"
              ? "bg-radar-accent/10 border-radar-accent text-radar-accent"
              : "border-radar-border text-radar-text-muted"
          }`}
        >
          Sauvegardés
        </button>
        <button
          onClick={() => setFilter("applied")}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            filter === "applied"
              ? "bg-radar-accent/10 border-radar-accent text-radar-accent"
              : "border-radar-border text-radar-text-muted"
          }`}
        >
          Candidaté
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-radar-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tenders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-radar-text-muted text-sm">
            Aucun marché {filter === "saved" ? "sauvegardé" : "avec candidature"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((tender) => (
            <TenderCard key={tender.analysis.id} tender={tender} />
          ))}
        </div>
      )}
    </div>
  );
}
