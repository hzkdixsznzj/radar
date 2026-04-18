'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Award,
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Check,
  Hash,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { sectorsByGroup, expandSelection, SECTORS_BY_ID } from '@/lib/sectors/vocabulary';

const CERTIFICATIONS = [
  'VCA',
  'Cerga',
  'ISO 9001',
  'ISO 14001',
  'ISO 45001',
  'Classe D1',
  'Classe D2',
  'Classe D3',
  'Classe D4',
  'Classe D5',
  'Classe D6',
  'Classe D7',
  'Classe D8',
  'Classe D9',
  'Classe D10',
  'Classe D11',
  'Classe D12',
  'Classe D13',
  'Classe D14',
  'Classe D15',
  'Classe D16',
  'Classe D17',
  'Classe D18',
  'Classe D19',
  'Classe D20',
  'Classe D21',
  'Classe D22',
  'Classe D23',
  'Classe D24',
  'Autre',
];

const BUDGET_RANGES = [
  '0-50K \u20ac',
  '50-150K \u20ac',
  '150-500K \u20ac',
  '500K+ \u20ac',
];

const REGIONS = [
  'Bruxelles-Capitale',
  'Brabant wallon',
  'Hainaut',
  'Liège',
  'Luxembourg',
  'Namur',
  'Anvers',
  'Brabant flamand',
  'Flandre occidentale',
  'Flandre orientale',
  'Limbourg',
];

const STEP_ICONS = [Building2, Award, MapPin];
const STEP_TITLES = ['Votre entreprise', 'Vos qualifications', 'Votre zone'];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

function MultiSelect({
  options,
  selected,
  onChange,
  columns = 2,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  columns?: number;
}) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
              isSelected
                ? 'border-accent-blue bg-accent-blue-soft text-text-primary'
                : 'border-border bg-bg-input text-text-secondary hover:border-border-focus hover:text-text-primary'
            }`}
          >
            <div
              className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                isSelected
                  ? 'border-accent-blue bg-accent-blue'
                  : 'border-border bg-transparent'
              }`}
            >
              {isSelected && <Check className="size-3 text-white" />}
            </div>
            <span className="truncate">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
        setInput('');
      }
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-10 flex-1 rounded-lg border border-border bg-bg-input px-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus"
        />
        <button
          type="button"
          onClick={() => {
            const trimmed = input.trim();
            if (trimmed && !tags.includes(trimmed)) {
              onChange([...tags, trimmed]);
              setInput('');
            }
          }}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-input text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary cursor-pointer"
        >
          <Plus className="size-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-accent-blue-soft px-3 py-1 text-xs font-medium text-accent-blue"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-accent-blue/20 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [companyName, setCompanyName] = useState('');
  // sectorIds are from SECTORS vocabulary (e.g. "hvac", "plomberie"). On save
  // we expand them to human-readable labels + CPV tokens + FR/NL/EN keywords.
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [companyDescription, setCompanyDescription] = useState('');

  // KBO (VAT lookup) state — pre-fills the company + suggests sectors.
  const [vatInput, setVatInput] = useState('');
  const [vatBusy, setVatBusy] = useState(false);
  const [vatMessage, setVatMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  async function handleVatLookup() {
    if (vatBusy) return;
    setVatMessage(null);
    const trimmed = vatInput.trim();
    if (!trimmed) {
      setVatMessage({ kind: 'error', text: 'Entrez un numéro de TVA.' });
      return;
    }
    setVatBusy(true);
    try {
      const res = await fetch(
        `/api/kbo/lookup?vat=${encodeURIComponent(trimmed)}`,
      );
      const body = (await res.json()) as {
        ok: boolean;
        error?: string;
        company_name?: string;
        activities?: string[];
        suggested_sectors?: string[];
      };
      if (!res.ok || !body.ok) {
        const label =
          body.error === 'invalid-vat'
            ? 'Numéro de TVA invalide.'
            : body.error === 'not-found'
              ? 'Entreprise introuvable dans la BCE.'
              : body.error === 'rate-limited'
                ? 'Veuillez patienter quelques secondes.'
                : 'La BCE est injoignable pour le moment.';
        setVatMessage({ kind: 'error', text: label });
        return;
      }

      if (body.company_name) setCompanyName(body.company_name);
      if (body.suggested_sectors && body.suggested_sectors.length > 0) {
        // Merge (dedup) — don't wipe manual picks.
        setSectorIds((cur) =>
          Array.from(new Set([...cur, ...(body.suggested_sectors ?? [])])),
        );
      }
      if (body.activities && body.activities.length > 0 && !companyDescription) {
        setCompanyDescription(body.activities.slice(0, 3).join(' · '));
      }

      setVatMessage({
        kind: 'success',
        text:
          body.suggested_sectors && body.suggested_sectors.length > 0
            ? `Entreprise trouvée — ${body.suggested_sectors.length} secteur(s) suggéré(s).`
            : 'Entreprise trouvée. Vérifiez et complétez les champs.',
      });
    } catch {
      setVatMessage({
        kind: 'error',
        text: 'Erreur réseau. Veuillez réessayer.',
      });
    } finally {
      setVatBusy(false);
    }
  }

  // Step 2 state
  const [certifications, setCertifications] = useState<string[]>([]);
  const [budgetRanges, setBudgetRanges] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);

  // Step 3 state
  const [regions, setRegions] = useState<string[]>([]);

  function goNext() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 2));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function canProceed(): boolean {
    if (step === 0) {
      return companyName.trim().length > 0 && sectorIds.length > 0;
    }
    if (step === 1) {
      return budgetRanges.length > 0;
    }
    if (step === 2) {
      return regions.length > 0;
    }
    return false;
  }

  async function handleComplete() {
    setError(null);
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setSaving(false);
        return;
      }

      // Expand selected sector ids into the labels + CPV tokens + auto-
      // keywords that the scoring library needs. Merge auto-keywords with
      // the user's custom keywords (dedup, preserve order).
      const { sectors: expandedSectors, keywords: autoKeywords } =
        expandSelection(sectorIds);
      const mergedKeywords = Array.from(
        new Set([...keywords, ...autoKeywords].map((k) => k.trim()).filter(Boolean)),
      );

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            company_name: companyName.trim(),
            sectors: expandedSectors,
            certifications,
            regions,
            budget_ranges: budgetRanges,
            keywords: mergedKeywords,
            company_description: companyDescription.trim(),
            onboarding_completed: true,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        setError('Erreur lors de la sauvegarde. Veuillez réessayer.');
        setSaving(false);
        return;
      }

      router.push('/feed');
    } catch {
      setError('Une erreur inattendue est survenue. Veuillez réessayer.');
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-3">
          {[0, 1, 2].map((i) => {
            const Icon = STEP_ICONS[i];
            const isActive = step === i;
            const isCompleted = step > i;
            return (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && (
                  <div
                    className={`h-px w-8 transition-colors duration-300 ${
                      isCompleted ? 'bg-accent-blue' : 'bg-border'
                    }`}
                  />
                )}
                <div
                  className={`flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isActive
                      ? 'border-accent-blue bg-accent-blue-soft text-accent-blue scale-110'
                      : isCompleted
                        ? 'border-accent-blue bg-accent-blue text-white'
                        : 'border-border bg-bg-card text-text-muted'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-bg-card p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
            >
              <h2 className="mb-1 font-display text-xl font-bold text-text-primary">
                {STEP_TITLES[step]}
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                {step === 0 && 'Parlez-nous de votre entreprise pour personnaliser vos résultats.'}
                {step === 1 && 'Aidez-nous à cibler les marchés qui correspondent à vos compétences.'}
                {step === 2 && 'Sélectionnez les régions où vous souhaitez trouver des marchés.'}
              </p>

              {/* Step 1: Company */}
              {step === 0 && (
                <div className="space-y-5">
                  {/* VAT lookup — pre-fills company name, description, sectors. */}
                  <div className="rounded-xl border border-border bg-bg-card/50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-accent-blue" />
                      <p className="text-sm font-semibold text-text-primary">
                        Remplir automatiquement (BCE)
                      </p>
                    </div>
                    <p className="text-xs text-text-muted">
                      Entrez votre numéro de TVA pour pré-remplir votre profil
                      avec les données publiques de la Banque-Carrefour des
                      Entreprises.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={vatInput}
                          onChange={(e) => setVatInput(e.target.value)}
                          placeholder="BE 0123.456.789"
                          icon={<Hash className="size-4" />}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleVatLookup();
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="md"
                        loading={vatBusy}
                        onClick={handleVatLookup}
                      >
                        Rechercher
                      </Button>
                    </div>
                    {vatMessage && (
                      <div
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                          vatMessage.kind === 'success'
                            ? 'bg-accent-green-soft text-accent-green'
                            : 'bg-accent-red-soft text-accent-red'
                        }`}
                        role={vatMessage.kind === 'error' ? 'alert' : 'status'}
                      >
                        {vatMessage.kind === 'success' ? (
                          <Check className="size-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="size-3.5 shrink-0" />
                        )}
                        <span>{vatMessage.text}</span>
                      </div>
                    )}
                  </div>

                  <Input
                    label="Nom de l'entreprise"
                    placeholder="Ex: Dupont Construction SA"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    icon={<Building2 className="size-4" />}
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">
                      Secteurs d&apos;activité
                    </label>
                    <p className="mb-3 text-xs text-text-muted">
                      Sélectionne les activités de ton entreprise. Chaque secteur
                      active automatiquement les codes CPV et les mots-clés FR/NL/EN
                      correspondants — c&apos;est ce qui fait que le feed te
                      trouve les bons marchés.
                    </p>
                    <div className="max-h-80 overflow-y-auto rounded-lg border border-border p-3 space-y-4">
                      {Object.entries(sectorsByGroup()).map(([group, list]) => (
                        <div key={group}>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                            {group}
                          </h4>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {list.map((s) => {
                              const selected = sectorIds.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() =>
                                    setSectorIds((cur) =>
                                      cur.includes(s.id)
                                        ? cur.filter((x) => x !== s.id)
                                        : [...cur, s.id],
                                    )
                                  }
                                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                                    selected
                                      ? 'border-accent-blue bg-accent-blue-soft text-text-primary'
                                      : 'border-border bg-bg-input text-text-secondary hover:border-border-focus hover:text-text-primary'
                                  }`}
                                >
                                  <div
                                    className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                      selected
                                        ? 'border-accent-blue bg-accent-blue'
                                        : 'border-border bg-transparent'
                                    }`}
                                  >
                                    {selected && <Check className="size-3 text-white" />}
                                  </div>
                                  <span className="truncate">{s.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="mb-1.5 block text-sm font-medium text-text-secondary"
                    >
                      Description de l&apos;entreprise
                      <span className="ml-1 font-normal text-text-muted">(optionnel)</span>
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      placeholder="Décrivez brièvement votre entreprise et vos spécialités..."
                      className="w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Qualifications */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">
                      Certifications
                      <span className="ml-1 font-normal text-text-muted">(optionnel)</span>
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2">
                      <MultiSelect
                        options={CERTIFICATIONS}
                        selected={certifications}
                        onChange={setCertifications}
                        columns={2}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">
                      Fourchettes de budget
                    </label>
                    <MultiSelect
                      options={BUDGET_RANGES}
                      selected={budgetRanges}
                      onChange={setBudgetRanges}
                      columns={2}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">
                      Mots-clés personnalisés
                      <span className="ml-1 font-normal text-text-muted">(optionnel)</span>
                    </label>
                    <TagInput
                      tags={keywords}
                      onChange={setKeywords}
                      placeholder="Tapez un mot-clé et appuyez sur Entrée"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Regions */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-secondary">
                      Régions
                    </label>
                    <MultiSelect
                      options={REGIONS}
                      selected={regions}
                      onChange={setRegions}
                      columns={2}
                    />
                  </div>

                  {/* Profile summary */}
                  {(companyName || sectorIds.length > 0 || regions.length > 0) && (
                    <div className="rounded-xl border border-border bg-bg-primary p-4">
                      <h3 className="mb-3 text-sm font-semibold text-text-primary">
                        Résumé de votre profil
                      </h3>
                      <dl className="space-y-2 text-sm">
                        {companyName && (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-text-muted">Entreprise:</dt>
                            <dd className="text-text-primary">{companyName}</dd>
                          </div>
                        )}
                        {sectorIds.length > 0 && (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-text-muted">Secteurs:</dt>
                            <dd className="text-text-secondary">
                              {sectorIds
                                .map((id) => SECTORS_BY_ID[id]?.label)
                                .filter(Boolean)
                                .join(', ')}
                            </dd>
                          </div>
                        )}
                        {certifications.length > 0 && (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-text-muted">Certifications:</dt>
                            <dd className="text-text-secondary">{certifications.join(', ')}</dd>
                          </div>
                        )}
                        {budgetRanges.length > 0 && (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-text-muted">Budgets:</dt>
                            <dd className="text-text-secondary">{budgetRanges.join(', ')}</dd>
                          </div>
                        )}
                        {keywords.length > 0 && (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-text-muted">Mots-clés:</dt>
                            <dd className="text-text-secondary">{keywords.join(', ')}</dd>
                          </div>
                        )}
                        {regions.length > 0 && (
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-text-muted">Régions:</dt>
                            <dd className="text-text-secondary">{regions.join(', ')}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="mt-4 rounded-lg bg-accent-red-soft p-3 text-center text-sm text-accent-red">
              {error}
            </p>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={step === 0}
              icon={<ChevronLeft className="size-4" />}
            >
              Retour
            </Button>

            {step < 2 ? (
              <Button
                onClick={goNext}
                disabled={!canProceed()}
                icon={<ChevronRight className="size-4" />}
              >
                Suivant
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed()}
                loading={saving}
                size="lg"
              >
                Commencer à explorer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
