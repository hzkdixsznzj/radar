# Radar — Setup

Ce document décrit les étapes manuelles à faire **hors code** pour mettre Radar en production.
Le code est prêt (TypeScript passe, tests live OK). Il manque juste l'infrastructure.

---

## 1. Créer le projet Supabase (CRITIQUE — actuellement bloquant)

Ton `.env.local` pointe vers `sddulglszgoibyrblatr.supabase.co` qui n'existe pas (NXDOMAIN).
Le projet doit être (re)créé.

### Étapes

1. Va sur [supabase.com](https://supabase.com) → se connecter
2. **New project** → région `Frankfurt (eu-central-1)` pour la conformité RGPD
3. Note le mot de passe du postgres (sauf besoin manuel, pas utilisé ici)
4. Dans **Project Settings → API**, copie :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role / secret` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ ne jamais exposer côté client
5. Remplace les trois lignes correspondantes dans `.env.local`

### Appliquer la migration

1. Dans l'UI Supabase → **SQL Editor** → **New query**
2. Copie-colle le contenu de `supabase/migrations/001_initial_schema.sql`
3. **Run**
4. Vérifie dans **Table Editor** que tu vois : `tenders`, `profiles`, `saved_tenders`, `submissions`, `subscriptions`, `dismissed_tenders`

### Seed avec des vraies données TED

```bash
npm run seed
```

Fetch 100 marchés belges publiés sur les 30 derniers jours depuis TED et les insère dans `tenders`.
Relance quand tu veux : idempotent (upsert sur `source,external_id`).

---

## 2. Variables d'environnement — ce qui reste à remplir

Les env vars suivantes sont vides dans `.env.local` et **doivent** être complétées une fois ta structure juridique choisie (pour les pages légales) :

| Variable | Utilisation | Quand remplir |
|---|---|---|
| `NEXT_PUBLIC_BCE_NUMBER` | Mentions légales · Confidentialité | Après BCE obtenue |
| `NEXT_PUBLIC_VAT_NUMBER` | Mentions légales (`BE0XXX.XXX.XXX`) | Après activation TVA |
| `NEXT_PUBLIC_COMPANY_ADDRESS` | Siège social | Après choix structure |

Tant que ces vars sont vides, les pages légales affichent `[À configurer : NEXT_PUBLIC_XXX]` — visible, incite à compléter.

### Structure juridique — pour rappel

- **Indépendant complémentaire** (si tu as déjà un emploi salarié) : BCE gratuit, cotisations réduites si revenu < 1 865 €/trimestre, ISOC non applicable (IPP). Recommandé en phase test.
- **Indépendant principal** : même BCE, cotisations pleines (~20,5% du revenu net + caisses sociales).
- **SRL** : 250 € frais de constitution + capital libre, ISOC 25% (ou 20% taux réduit), mais IPP éventuel sur rémunération + dividendes. À considérer quand CA > 80k€/an.

Dans les deux cas : s'inscrire à la **BCE** via un guichet d'entreprises (Liantis, Securex, Partena — ~90 €), puis activer la **TVA** auprès du SPF Finances.

---

## 3. Stripe — activer les paiements Pro et Business

Actuellement `pk_test_placeholder` / `sk_test_placeholder`. Pour activer :

1. Créer un compte sur [stripe.com](https://stripe.com) → mode test d'abord
2. **Produits** → créer deux produits :
   - `Radar Pro` — 29 € HTVA / mois · id price → `STRIPE_PRO_PRICE_ID`
   - `Radar Business` — 79 € HTVA / mois · id price → `STRIPE_BUSINESS_PRICE_ID`
3. Copier la **Secret key** → `STRIPE_SECRET_KEY` et la **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. **Webhooks** → endpoint `https://<domain>/api/stripe/webhook` → copie le signing secret → `STRIPE_WEBHOOK_SECRET`
5. Events à écouter : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

Passer en mode **Live** après activation du compte pro belge (demande KBIS / BCE).

---

## 4. Déployer sur Vercel

1. Push le repo sur GitHub
2. Sur [vercel.com](https://vercel.com) → **Import Project** → sélectionner le repo
3. **Framework** détecté automatiquement (Next.js)
4. **Environment Variables** → copier toutes les lignes de `.env.local` (sauf `NEXT_PUBLIC_APP_URL` qui devient l'URL Vercel)
5. **Deploy**

### Cron automatique
`vercel.json` déclare déjà le cron `/api/cron/scrape` toutes les 4h. Vercel l'active automatiquement.
Le cron est protégé par `CRON_SECRET` — déjà généré dans `.env.local`.

### Test manuel du cron après déploiement
```bash
curl -X GET https://<ton-domaine>/api/cron/scrape \
  -H "Authorization: Bearer $CRON_SECRET"
```
Réponse attendue : `{"ok": true, "ted": <n>, "be": 0, "elapsedMs": <ms>}`

---

## 5. Scrapers — état actuel

| Source | Statut | Notes |
|---|---|---|
| **TED (UE)** | ✅ Fonctionnel | Couvre marchés belges > seuil européen (~215k€ fournitures/services, ~5.4M€ travaux) |
| **Bulletin Adjudications (BE)** | ⏸ Stubbé | Aucun endpoint JSON public trouvé. Marchés sous-seuil manquants. Alternatives à explorer : scraping HTML du portail `eprocurement.belgium.be`, API privée sur demande BOSA, ou partenariat avec [MarchésPublics.be](https://www.marchespublics.be). |

Impact : pour un MVP sur grandes PME, TED suffit. Pour cibler aussi TPE/petites communes, il faudra débloquer BOSA.

---

## 6. Mode démo (optionnel — preview sans Supabase)

Pour pouvoir montrer dashboard/feed/profil à un prospect **sans** avoir créé de compte :

```bash
# dans .env.local
NEXT_PUBLIC_DEMO_MODE=true
```

Puis `POST /api/demo` crée un utilisateur `demo@radar.be` avec un profil type (construction Wallonie). Les pages chargent `DEMO_PROFILE` + `DEMO_TENDERS` définis dans `src/lib/demo-mode.ts`.

⚠️ Désactiver en production (`NEXT_PUBLIC_DEMO_MODE=false`).

---

## 7. Checklist avant lancement

- [ ] Projet Supabase créé + migration appliquée + seed lancé
- [ ] `NEXT_PUBLIC_BCE_NUMBER`, `NEXT_PUBLIC_VAT_NUMBER`, `NEXT_PUBLIC_COMPANY_ADDRESS` remplis
- [ ] Stripe live + prix Pro/Business créés
- [ ] DNS `radar.be` (ou similaire) pointé sur Vercel
- [ ] Redirect `NEXT_PUBLIC_APP_URL` mis à jour vers le domaine final
- [ ] Test bout-en-bout : signup → onboarding → feed → favoris → analyse → soumission
- [ ] Premier cron exécuté avec succès (log Vercel)
- [ ] Page `/confidentialite` rendue sans placeholders `[À configurer : …]`
