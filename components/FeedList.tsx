"use client";

import { useEffect, useState, useCallback } from "react";
import { TenderCard } from "./TenderCard";
import type { Tender } from "@/lib/types";

interface ProfileData {
  specialties: string[];
  regions: string[];
  provinces: string[];
  min_amount: number;
  max_amount: number;
}

function getProfile(): ProfileData | null {
  try {
    const raw = localStorage.getItem("radar_profile");
    if (!raw) return null;
    return JSON.parse(raw) as ProfileData;
  } catch {
    return null;
  }
}

function getSavedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("radar_saved") ?? "[]") as string[];
  } catch {
    return [];
  }
}

function getDismissedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem("radar_dismissed") ?? "[]") as string[];
  } catch {
    return [];
  }
}

function matchesProfile(tender: Tender, profile: ProfileData): boolean {
  const analysis = tender.raw_data?.analysis;
  if (analysis && analysis.relevance_score >= 5) return true;

  if (profile.regions.length > 0 && tender.region) {
    if (!profile.regions.includes(tender.region)) return false;
  }

  if (profile.provinces.length > 0 && tender.province) {
    if (!profile.provinces.includes(tender.province)) return false;
  }

  const min = tender.estimated_value_min;
  const max = tender.estimated_value_max;
  if (min && min > profile.max_amount) return false;
  if (max && max < profile.min_amount) return false;

  return true;
}

export function FeedList() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/tenders");
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data: Tender[] = await res.json();

      const profile = getProfile();
      const savedIds = getSavedIds();
      const dismissedIds = getDismissedIds();

      const filtered = data.filter((t) => {
        if (savedIds.includes(t.id)) return false;
        if (dismissedIds.includes(t.id)) return false;
        if (profile) return matchesProfile(t, profile);
        return true;
      });

      setTenders(filtered);
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
    const dismissed = getDismissedIds();
    if (!dismissed.includes(tenderId)) {
      dismissed.push(tenderId);
      localStorage.setItem("radar_dismissed", JSON.stringify(dismissed));
    }
    setTenders((prev) => prev.filter((t) => t.id !== tenderId));
  }

  function handleSave(tenderId: string) {
    const saved = getSavedIds();
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
