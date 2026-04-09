"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScoreBadge } from "./ScoreBadge";
import { CountdownBadge } from "./CountdownBadge";
import type { Tender } from "@/lib/types";

interface TenderDetailProps {
  tenderId: string;
}

function formatAmount(min: number | null, max: number | null): string {
  if (!min && !max) return "Non spécifié";
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M€`
      : `${Math.round(n / 1000)}K€`;
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`;
  return fmt(min ?? max!);
}

const COMPETITION_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
};

export function TenderDetail({ tenderId }: TenderDetailProps) {
  const router = useRouter();
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tenders?id=${tenderId}`);
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json();
      if (data) setTender(data as Tender);
    } catch {
      // Error loading tender
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-radar-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="text-center py-20">
        <p className="text-radar-text-muted">Marché introuvable</p>
      </div>
    );
  }

  const analysis = tender.raw_data?.analysis;

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <button
        onClick={() => router.back()}
        className="text-sm text-radar-text-muted hover:text-radar-text transition-colors"
      >
        ← Retour
      </button>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          {analysis && (
            <ScoreBadge score={analysis.relevance_score} size="lg" />
          )}
          <h1 className="text-lg font-bold leading-snug">{tender.title}</h1>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-radar-text-muted">
          {tender.buyer_name && <span>{tender.buyer_name}</span>}
          {tender.buyer_location && (
            <>
              <span>·</span>
              <span>{tender.buyer_location}</span>
            </>
          )}
          {tender.procedure_type && (
            <>
              <span>·</span>
              <span className="capitalize">{tender.procedure_type}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-sm">
            {formatAmount(tender.estimated_value_min, tender.estimated_value_max)}
          </span>
          <CountdownBadge deadline={tender.deadline} />
        </div>
      </div>

      {tender.description && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-radar-text-muted uppercase tracking-wider">
            Description
          </h2>
          <p className="text-sm leading-relaxed">{tender.description}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-radar-text-muted uppercase tracking-wider">
            Analyse IA
          </h2>

          <div className="bg-radar-surface border border-radar-border rounded-lg p-4 space-y-3">
            {analysis.summary && (
              <div>
                <div className="text-xs text-radar-text-muted mb-1">Résumé</div>
                <p className="text-sm">{analysis.summary}</p>
              </div>
            )}
            {analysis.why_relevant && (
              <div>
                <div className="text-xs text-radar-text-muted mb-1">
                  Pourquoi c&apos;est pertinent
                </div>
                <p className="text-sm">{analysis.why_relevant}</p>
              </div>
            )}
            {analysis.recommended_action && (
              <div>
                <div className="text-xs text-radar-text-muted mb-1">
                  Action recommandée
                </div>
                <p className="text-sm">{analysis.recommended_action}</p>
              </div>
            )}
            <div className="flex gap-4 pt-2 border-t border-radar-border">
              {analysis.estimated_margin && (
                <div>
                  <div className="text-xs text-radar-text-muted">Marge estimée</div>
                  <div className="text-sm font-mono">{analysis.estimated_margin}</div>
                </div>
              )}
              {analysis.competition_level && (
                <div>
                  <div className="text-xs text-radar-text-muted">Concurrence</div>
                  <div className="text-sm font-mono">
                    {COMPETITION_LABELS[analysis.competition_level] ??
                      analysis.competition_level}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tender.cpv_codes?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-radar-text-muted uppercase tracking-wider">
            Codes CPV
          </h2>
          <div className="flex flex-wrap gap-1">
            {tender.cpv_codes.map((code) => (
              <span
                key={code}
                className="px-2 py-1 rounded text-xs font-mono bg-radar-surface border border-radar-border text-radar-text-muted"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tender.source_url && (
          <a
            href={tender.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-lg bg-radar-accent text-white font-semibold text-center text-sm hover:brightness-110 transition-all"
          >
            Voir le cahier des charges
          </a>
        )}
      </div>
    </div>
  );
}
