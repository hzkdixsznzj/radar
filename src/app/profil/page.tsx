'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Tag,
  Crown,
  Bell,
  Mail,
  Globe,
  LogOut,
  Trash2,
  Zap,
  BarChart3,
  Send,
  ChevronRight,
  X,
  Plus,
  FileText,
  ArrowLeft,
  Radar,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import { createClient } from '@/lib/supabase/client';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, type SelectOption } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/loading';
import type { Profile, Subscription, SubscriptionPlan } from '@/types/database';

// ----------------------------------------------------------------
// Option lists
// ----------------------------------------------------------------

const SECTOR_OPTIONS: SelectOption[] = [
  { value: 'construction', label: 'Construction & BTP' },
  { value: 'it', label: 'IT & Numérique' },
  { value: 'consulting', label: 'Conseil & Études' },
  { value: 'cleaning', label: 'Nettoyage & Entretien' },
  { value: 'transport', label: 'Transport & Logistique' },
  { value: 'healthcare', label: 'Santé & Médical' },
  { value: 'food', label: 'Alimentation & Restauration' },
  { value: 'security', label: 'Sécurité & Gardiennage' },
  { value: 'communication', label: 'Communication & Événementiel' },
  { value: 'environment', label: 'Environnement & Énergie' },
  { value: 'education', label: 'Formation & Éducation' },
  { value: 'legal', label: 'Juridique & Comptabilité' },
];

const CERTIFICATION_OPTIONS: SelectOption[] = [
  { value: 'iso9001', label: 'ISO 9001' },
  { value: 'iso14001', label: 'ISO 14001' },
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'vca', label: 'VCA/SCC' },
  { value: 'benor', label: 'BENOR' },
  { value: 'emas', label: 'EMAS' },
  { value: 'pefc', label: 'PEFC' },
  { value: 'fsc', label: 'FSC' },
  { value: 'class_agrement', label: 'Agréation classe' },
];

const REGION_OPTIONS: SelectOption[] = [
  { value: 'bruxelles', label: 'Bruxelles-Capitale' },
  { value: 'wallonie', label: 'Wallonie' },
  { value: 'flandre', label: 'Flandre' },
  { value: 'hainaut', label: 'Hainaut' },
  { value: 'liege', label: 'Liège' },
  { value: 'namur', label: 'Namur' },
  { value: 'luxembourg_be', label: 'Luxembourg (BE)' },
  { value: 'brabant_wallon', label: 'Brabant wallon' },
  { value: 'anvers', label: 'Anvers' },
  { value: 'flandre_orientale', label: 'Flandre-Orientale' },
  { value: 'flandre_occidentale', label: 'Flandre-Occidentale' },
  { value: 'limbourg', label: 'Limbourg' },
  { value: 'brabant_flamand', label: 'Brabant flamand' },
];

const BUDGET_OPTIONS: SelectOption[] = [
  { value: '0-50k', label: '0 - 50 000 EUR' },
  { value: '50k-150k', label: '50 000 - 150 000 EUR' },
  { value: '150k-500k', label: '150 000 - 500 000 EUR' },
  { value: '500k-1m', label: '500 000 - 1 000 000 EUR' },
  { value: '1m+', label: '+ de 1 000 000 EUR' },
];

const PLAN_LABELS: Record<
  SubscriptionPlan,
  { label: string; color: 'blue' | 'green' | 'orange' }
> = {
  free: { label: 'Gratuit', color: 'blue' },
  pro: { label: 'Pro', color: 'green' },
  business: { label: 'Business', color: 'orange' },
};

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [companyName, setCompanyName] = useState('');
  const [sectors, setSectors] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [budgetRanges, setBudgetRanges] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [description, setDescription] = useState('');

  // Settings
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  // ---- Fetch ----

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      setUserEmail(user.email ?? '');

      const profileRes = (await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()) as unknown as { data: Profile | null; error: unknown };

      const subRes = (await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()) as unknown as { data: Subscription | null; error: unknown };

      if (profileRes.data) {
        const p = profileRes.data;
        setProfile(p);
        setCompanyName(p.company_name);
        setSectors(p.sectors);
        setCertifications(p.certifications);
        setRegions(p.regions);
        setBudgetRanges(p.budget_ranges);
        setKeywords(p.keywords);
        setDescription(p.company_description);
      }

      if (subRes.data) {
        setSubscription(subRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ---- Save ----

  const handleSave = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // Upsert directly via Supabase so updated_at is refreshed and the row
      // is created if it does not yet exist.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveError('Session expirée. Reconnectez-vous.');
        return;
      }

      const payload = {
        user_id: user.id,
        company_name: companyName.trim(),
        sectors,
        certifications,
        regions,
        budget_ranges: budgetRanges,
        keywords,
        company_description: description.trim(),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (upsertError) {
        setSaveError('Erreur lors de la sauvegarde. Veuillez réessayer.');
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setSaveError('Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  }, [
    supabase,
    profile,
    companyName,
    sectors,
    certifications,
    regions,
    budgetRanges,
    keywords,
    description,
  ]);

  // ---- Keywords ----

  const handleAddKeyword = useCallback(() => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput('');
  }, [keywordInput, keywords]);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  }, []);

  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddKeyword();
      }
    },
    [handleAddKeyword],
  );

  // ---- Account actions ----

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [supabase]);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return;
    setDeleting(true);
    try {
      await fetch('/api/account', { method: 'DELETE' });
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Failed to delete account:', err);
      setDeleting(false);
    }
  }, [deleteConfirmText, supabase]);

  const handleManageSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error('Failed to open Stripe portal:', err);
    }
  }, []);

  // ---- Derived ----

  const plan = subscription?.plan ?? 'free';
  const planConfig = PLAN_LABELS[plan];

  // ---- Loading skeleton ----

  if (loading) {
    return (
      <div className="min-h-dvh bg-bg-primary pb-24">
        <header className="flex items-center gap-3 px-4 pt-4 pb-2 safe-top">
          <Link
            href="/dashboard"
            className="flex size-10 items-center justify-center rounded-xl bg-bg-card text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-bold text-text-primary"
          >
            <Radar className="size-5 text-accent-blue" />
            Radar
          </Link>
        </header>
        <div className="px-4 pt-4 space-y-3">
          <Skeleton className="h-7 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="px-4 mt-6 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ---- Render ----

  return (
    <div className="min-h-dvh bg-bg-primary pb-24">
      {/* Header — back nav + Radar logo (matches login/signup pattern) */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-2 safe-top">
        <Link
          href="/dashboard"
          aria-label="Retour au dashboard"
          className="flex size-10 items-center justify-center rounded-xl bg-bg-card text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold text-text-primary"
        >
          <Radar className="size-5 text-accent-blue" />
          Radar
        </Link>
      </header>

      {/* Page title */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold font-display text-text-primary">
          Mon profil
        </h1>
        <p className="text-sm text-text-muted mt-0.5">{userEmail}</p>
      </div>

      <main className="px-4 pt-4 space-y-8">
        {/* ============================================================ */}
        {/* PROFILE                                                       */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="size-4 text-accent-blue" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Entreprise
            </h2>
          </div>

          <Input
            label="Nom de l'entreprise"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Votre entreprise"
            icon={<Building2 className="size-4" />}
          />

          <Select
            label="Secteurs d'activité"
            options={SECTOR_OPTIONS}
            value={sectors}
            onChange={(v) => setSectors(v as string[])}
            multiple
            searchable
            placeholder="Sélectionnez vos secteurs"
          />

          <Select
            label="Certifications"
            options={CERTIFICATION_OPTIONS}
            value={certifications}
            onChange={(v) => setCertifications(v as string[])}
            multiple
            searchable
            placeholder="Vos certifications"
          />

          <Select
            label="Régions ciblées"
            options={REGION_OPTIONS}
            value={regions}
            onChange={(v) => setRegions(v as string[])}
            multiple
            searchable
            placeholder="Régions d'intérêt"
          />

          <Select
            label="Fourchettes budgétaires"
            options={BUDGET_OPTIONS}
            value={budgetRanges}
            onChange={(v) => setBudgetRanges(v as string[])}
            multiple
            placeholder="Budgets visés"
          />

          {/* Keywords tag input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Mots-clés
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  placeholder="Ajouter un mot-clé..."
                  icon={<Tag className="size-4" />}
                />
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={handleAddKeyword}
                icon={<Plus className="size-4" />}
              >
                Ajouter
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-blue-soft text-accent-blue text-xs px-2.5 py-1 font-medium"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Textarea
            label="Description de l'entreprise"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre entreprise, vos compétences et votre expérience..."
            autoResize
            maxLength={1000}
            showCount
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={saving}
            onClick={handleSave}
          >
            {saveSuccess ? 'Sauvegardé !' : 'Sauvegarder'}
          </Button>

          {saveError && (
            <p
              className="rounded-lg bg-accent-red-soft p-3 text-center text-sm text-accent-red"
              role="alert"
            >
              {saveError}
            </p>
          )}
        </section>

        {/* Toast — save success */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              role="status"
              aria-live="polite"
              className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green-soft px-4 py-2.5 text-sm font-medium text-accent-green shadow-lg"
            >
              <CheckCircle2 className="size-4" />
              Profil mis à jour
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================ */}
        {/* SUBSCRIPTION                                                  */}
        {/* ============================================================ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="size-4 text-accent-orange" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Abonnement
            </h2>
          </div>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  Plan actuel
                </span>
                <Badge color={planConfig.color} size="md">
                  {planConfig.label}
                </Badge>
              </div>
            </div>

            {plan === 'free' ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-4 rounded-xl bg-gradient-to-br from-accent-blue/10 to-accent-green/10 border border-accent-blue/20"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-blue-soft">
                    <Zap className="size-5 text-accent-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary font-display">
                      Passez à Pro
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 mb-3">
                      14 jours gratuits. Analyses illimitées, soumissions
                      assistées par IA.
                    </p>
                    <Button variant="primary" size="sm">
                      Essai gratuit
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {subscription?.current_period_end && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      Prochaine facturation
                    </span>
                    <span className="text-text-primary font-medium">
                      {new Date(
                        subscription.current_period_end,
                      ).toLocaleDateString('fr-BE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={handleManageSubscription}
                >
                  Gérer l&apos;abonnement
                </Button>
              </div>
            )}
          </Card>

          {/* Usage this month */}
          <Card padding="md">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
              Utilisation ce mois
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-accent-blue" />
                  <span className="text-sm text-text-secondary">Analyses</span>
                </div>
                <span className="text-sm font-semibold text-text-primary tabular-nums">
                  {subscription?.analyses_used ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="size-4 text-accent-green" />
                  <span className="text-sm text-text-secondary">
                    Soumissions
                  </span>
                </div>
                <span className="text-sm font-semibold text-text-primary tabular-nums">
                  {subscription?.submissions_used ?? 0}
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* SETTINGS                                                      */}
        {/* ============================================================ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="size-4 text-accent-green" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Paramètres
            </h2>
          </div>

          <Card padding="none">
            {/* Push notifications */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Bell className="size-4 text-text-muted" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Notifications push
                  </p>
                  <p className="text-xs text-text-muted">
                    Nouveaux marchés pertinents
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pushNotifications}
                onClick={() => setPushNotifications((prev) => !prev)}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
                  pushNotifications ? 'bg-accent-blue' : 'bg-border',
                )}
              >
                <span
                  className={clsx(
                    'inline-block size-4 rounded-full bg-white transition-transform',
                    pushNotifications ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            {/* Email notifications */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-text-muted" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Notifications email
                  </p>
                  <p className="text-xs text-text-muted">Résumé hebdomadaire</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailNotifications}
                onClick={() => setEmailNotifications((prev) => !prev)}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
                  emailNotifications ? 'bg-accent-blue' : 'bg-border',
                )}
              >
                <span
                  className={clsx(
                    'inline-block size-4 rounded-full bg-white transition-transform',
                    emailNotifications ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Globe className="size-4 text-text-muted" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Langue</p>
                  <p className="text-xs text-text-muted">Français</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge color="blue" size="sm">
                  FR
                </Badge>
                <span className="text-xs text-text-muted opacity-40">NL</span>
                <span className="text-xs text-text-muted opacity-40">EN</span>
              </div>
            </div>
          </Card>
        </section>

        {/* ============================================================ */}
        {/* ACCOUNT                                                       */}
        {/* ============================================================ */}
        <section className="space-y-4 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="size-4 text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Compte
            </h2>
          </div>

          <Card padding="none">
            {/* Email (read-only) */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Mail className="size-4 text-text-muted" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Adresse email
                  </p>
                  <p className="text-xs text-text-muted">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Sign out */}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-between p-4 border-b border-border text-left hover:bg-bg-card-hover transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LogOut className="size-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">
                  Se déconnecter
                </span>
              </div>
              <ChevronRight className="size-4 text-text-muted" />
            </button>

            {/* Delete account */}
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-accent-red-soft transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="size-4 text-accent-red" />
                <span className="text-sm font-medium text-accent-red">
                  Supprimer mon compte
                </span>
              </div>
              <ChevronRight className="size-4 text-accent-red" />
            </button>
          </Card>
        </section>
      </main>

      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText('');
        }}
        title="Supprimer le compte"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Cette action est irréversible. Toutes vos données, marchés
            sauvegardés et soumissions seront définitivement supprimés.
          </p>
          <div className="p-3 rounded-lg bg-accent-red-soft border border-accent-red/20">
            <p className="text-xs text-accent-red font-medium">
              Tapez SUPPRIMER pour confirmer
            </p>
          </div>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              fullWidth
              loading={deleting}
              disabled={deleteConfirmText !== 'SUPPRIMER'}
              onClick={handleDeleteAccount}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
}
