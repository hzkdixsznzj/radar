"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SPECIALTIES, REGIONS, PROVINCES } from "@/lib/types";
import type { Profile } from "@/lib/types";

export function SettingsForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data as Profile);
    } catch {
      // Error loading profile
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function toggleItem(key: "specialties" | "regions" | "provinces", value: string) {
    if (!profile) return;
    const current = profile[key] ?? [];
    setProfile({
      ...profile,
      [key]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: profile.company_name,
          specialties: profile.specialties,
          regions: profile.regions,
          provinces: profile.provinces,
          min_amount: profile.min_amount,
          max_amount: profile.max_amount,
        })
        .eq("id", profile.id);

      if (error) throw error;
      setMessage("Profil mis à jour");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-radar-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-3 rounded-lg bg-radar-green/10 border border-radar-green/20 text-radar-green text-sm">
          {message}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs text-radar-text-muted uppercase tracking-wider font-semibold">
          Entreprise
        </label>
        <input
          type="text"
          value={profile.company_name ?? ""}
          onChange={(e) =>
            setProfile({ ...profile, company_name: e.target.value })
          }
          className="w-full px-4 py-3 rounded-lg bg-radar-surface border border-radar-border text-radar-text focus:outline-none focus:border-radar-accent"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-radar-text-muted uppercase tracking-wider font-semibold">
          Spécialités
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SPECIALTIES.map((s) => {
            const selected = profile.specialties?.includes(s.value);
            return (
              <button
                key={s.value}
                onClick={() => toggleItem("specialties", s.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  selected
                    ? "bg-radar-accent/10 border-radar-accent text-radar-accent"
                    : "bg-radar-surface border-radar-border text-radar-text-muted"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-radar-text-muted uppercase tracking-wider font-semibold">
          Régions
        </label>
        <div className="flex gap-2">
          {REGIONS.map((r) => {
            const selected = profile.regions?.includes(r.value);
            return (
              <button
                key={r.value}
                onClick={() => toggleItem("regions", r.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  selected
                    ? "bg-radar-accent/10 border-radar-accent text-radar-accent"
                    : "bg-radar-surface border-radar-border text-radar-text-muted"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PROVINCES.filter((p) => profile.regions?.includes(p.region)).map(
            (p) => {
              const selected = profile.provinces?.includes(p.value);
              return (
                <button
                  key={p.value}
                  onClick={() => toggleItem("provinces", p.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    selected
                      ? "bg-radar-accent/10 border-radar-accent text-radar-accent"
                      : "bg-radar-surface border-radar-border text-radar-text-muted"
                  }`}
                >
                  {p.label}
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-radar-text-muted uppercase tracking-wider font-semibold">
          Budget : {Math.round(profile.min_amount / 1000)}K€ –{" "}
          {profile.max_amount >= 1_000_000
            ? `${(profile.max_amount / 1_000_000).toFixed(1)}M€`
            : `${Math.round(profile.max_amount / 1000)}K€`}
        </label>
        <input
          type="range"
          min={0}
          max={500000}
          step={10000}
          value={profile.min_amount}
          onChange={(e) =>
            setProfile({ ...profile, min_amount: Number(e.target.value) })
          }
          className="w-full accent-radar-accent"
        />
        <input
          type="range"
          min={10000}
          max={2000000}
          step={10000}
          value={profile.max_amount}
          onChange={(e) =>
            setProfile({ ...profile, max_amount: Number(e.target.value) })
          }
          className="w-full accent-radar-accent"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-lg bg-radar-accent text-white font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
      >
        {saving ? "Enregistrement..." : "Sauvegarder"}
      </button>

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-lg border border-radar-red/30 text-radar-red text-sm hover:bg-radar-red/10 transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  );
}
