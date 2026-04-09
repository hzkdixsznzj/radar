"use client";

import Link from "next/link";
import { ScoreBadge } from "./ScoreBadge";
import { CountdownBadge } from "./CountdownBadge";
import type { Tender } from "@/lib/types";

interface TenderCardProps {
  tender: Tender;
  onSave?: () => void;
  onDismiss?: () => void;
}

function formatAmount(min: number | null, max: number | null): string {
  if (!min && !max) return "Montant non spécifié";
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M€`
      : `${Math.round(n / 1000)}K€`;
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`;
  return fmt(min ?? max!);
}

export function TenderCard({ tender, onSave, onDismiss }: TenderCardProps) {
  const analysis = tender.raw_data?.analysis;

  return (
    <div className="bg-radar-surface border border-radar-border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        {analysis && (
          <ScoreBadge score={analysis.relevance_score} />
        )}
        <div className="flex-1 min-w-0">
          <Link
            href={`/tender/${tender.id}`}
            className="font-semibold text-sm leading-snug hover:text-radar-accent transition-colors line-clamp-2"
          >
            {tender.title}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-xs text-radar-text-muted">
            {tender.buyer_name && <span>{tender.buyer_name}</span>}
            {tender.buyer_location && (
              <>
                <span>·</span>
                <span>{tender.buyer_location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-radar-text-muted">
          {formatAmount(tender.estimated_value_min, tender.estimated_value_max)}
        </span>
        <CountdownBadge deadline={tender.deadline} />
        {tender.region && (
          <span className="text-xs px-2 py-0.5 rounded bg-radar-border/30 text-radar-text-muted capitalize">
            {tender.region}
          </span>
        )}
        {analysis?.competition_level && (
          <span className={`text-xs px-2 py-0.5 rounded ${
            analysis.competition_level === "low"
              ? "bg-radar-green/10 text-radar-green"
              : analysis.competition_level === "high"
                ? "bg-radar-red/10 text-radar-red"
                : "bg-radar-yellow/10 text-radar-yellow"
          }`}>
            Concurrence {analysis.competition_level === "low" ? "faible" : analysis.competition_level === "high" ? "forte" : "moyenne"}
          </span>
        )}
      </div>

      {analysis?.summary && (
        <p className="text-sm text-radar-text-muted leading-relaxed line-clamp-2">
          {analysis.summary}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          className="flex-1 py-2 text-xs font-semibold rounded border border-radar-green/30 text-radar-green hover:bg-radar-green/10 transition-colors"
        >
          Sauvegarder
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-2 text-xs font-semibold rounded border border-radar-border text-radar-text-muted hover:bg-radar-border/30 transition-colors"
        >
          Passer
        </button>
      </div>
    </div>
  );
}
