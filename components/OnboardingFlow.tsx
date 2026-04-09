"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SPECIALTIES, REGIONS, PROVINCES } from "@/lib/types";

const STEPS = ["Entreprise", "Spécialités", "Zones", "Budget"];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    company_name: "",
    specialties: [] as string[],
    regions: [] as string[],
    provinces: [] as string[],
    min_amount: 10000,
    max_amount: 500000,
  });

  function toggleItem(
    key: "specialties" | "regions" | "provinces",
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  }

  function handleSubmit() {
    localStorage.setItem("radar_profile", JSON.stringify(form));
    router.push("/feed");
  }

  const canNext =
    step === 0
      ? form.company_name.trim().length > 0
      : step === 1
        ? form.specialties.length > 0
        : step === 2
          ? form.regions.length > 0
          : true;

  return (
    <div className="max-w-lg mx-auto w-full px-6 py-8 space-y-6">
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1 w-full rounded-full ${
                i <= step ? "bg-radar-accent" : "bg-radar-border"
              }`}
            />
            <span
              className={`text-[10px] ${
                i === step ? "text-radar-text" : "text-radar-text-muted"
              }`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Votre entreprise</h2>
          <p className="text-sm text-radar-text-muted">
            Comment s&apos;appelle votre entreprise ?
          </p>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, company_name: e.target.value }))
            }
            placeholder="Ex: Dupont HVAC SPRL"
            className="w-full px-4 py-3 rounded-lg bg-radar-surface border border-radar-border text-radar-text placeholder:text-radar-text-muted focus:outline-none focus:border-radar-accent"
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Vos spécialités</h2>
          <p className="text-sm text-radar-text-muted">
            Sélectionnez vos domaines d&apos;activité
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map((s) => {
              const selected = form.specialties.includes(s.value);
              return (
                <button
                  key={s.value}
                  onClick={() => toggleItem("specialties", s.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    selected
                      ? "bg-radar-accent/10 border-radar-accent text-radar-accent"
                      : "bg-radar-surface border-radar-border text-radar-text-muted hover:border-radar-text-muted"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Zones géographiques</h2>
          <p className="text-sm text-radar-text-muted">
            Où travaillez-vous ?
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              {REGIONS.map((r) => {
                const selected = form.regions.includes(r.value);
                return (
                  <button
                    key={r.value}
                    onClick={() => toggleItem("regions", r.value)}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      selected
                        ? "bg-radar-accent/10 border-radar-accent text-radar-accent"
                        : "bg-radar-surface border-radar-border text-radar-text-muted hover:border-radar-text-muted"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PROVINCES.filter((p) =>
                form.regions.includes(p.region)
              ).map((p) => {
                const selected = form.provinces.includes(p.value);
                return (
                  <button
                    key={p.value}
                    onClick={() => toggleItem("provinces", p.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      selected
                        ? "bg-radar-accent/10 border-radar-accent text-radar-accent"
                        : "bg-radar-surface border-radar-border text-radar-text-muted hover:border-radar-text-muted"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Budget marchés</h2>
          <p className="text-sm text-radar-text-muted">
            Quelle fourchette de montants vous intéresse ?
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-radar-text-muted block mb-1">
                Montant minimum : {Math.round(form.min_amount / 1000)}K€
              </label>
              <input
                type="range"
                min={0}
                max={500000}
                step={10000}
                value={form.min_amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    min_amount: Number(e.target.value),
                  }))
                }
                className="w-full accent-radar-accent"
              />
            </div>
            <div>
              <label className="text-xs text-radar-text-muted block mb-1">
                Montant maximum : {Math.round(form.max_amount / 1000)}K€
              </label>
              <input
                type="range"
                min={10000}
                max={2000000}
                step={10000}
                value={form.max_amount}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    max_amount: Number(e.target.value),
                  }))
                }
                className="w-full accent-radar-accent"
              />
            </div>
            <div className="text-center font-mono text-sm text-radar-text-muted">
              {Math.round(form.min_amount / 1000)}K€ –{" "}
              {form.max_amount >= 1000000
                ? `${(form.max_amount / 1000000).toFixed(1)}M€`
                : `${Math.round(form.max_amount / 1000)}K€`}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-6 py-3 rounded-lg border border-radar-border text-radar-text-muted hover:border-radar-text-muted transition-colors"
          >
            Retour
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="flex-1 py-3 rounded-lg bg-radar-accent text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            Continuer
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-lg bg-radar-accent text-white font-semibold hover:brightness-110 transition-all"
          >
            Voir mes opportunités
          </button>
        )}
      </div>
    </div>
  );
}
