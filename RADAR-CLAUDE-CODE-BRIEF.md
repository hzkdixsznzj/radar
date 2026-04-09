# RADAR — Brief Complet pour Claude Code

## Contexte projet

Tu vas construire **Radar**, une PWA (Progressive Web App) qui détecte automatiquement les marchés publics pertinents pour les PME de construction/HVAC en Belgique, les analyse avec l'IA, et envoie des alertes intelligentes aux abonnés.

Le concept : un "Tinder des marchés publics". Le système scrape les données chaque jour, Claude analyse la pertinence pour chaque profil utilisateur, et l'utilisateur reçoit une notification push + un feed de cartes swipables avec les meilleures opportunités.

Budget infra : <50€/mois. Pas de backend lourd.

---

## Architecture technique

### Stack
- **Frontend** : Next.js 14+ (App Router) déployé sur Vercel (gratuit)
- **Backend/DB** : Supabase (free tier) — auth, Postgres, edge functions
- **Analyse IA** : API Anthropic (Claude Sonnet 4.6) — via Supabase Edge Functions
- **Données source** : TED API (api.ted.europa.eu) + scraping e-Procurement.be via Playwright
- **Notifications** : Web Push API (gratuit, natif)
- **Paiements** : Stripe Checkout (plus tard, pas dans le MVP)
- **Hébergement cron** : Supabase Edge Functions (scheduled) ou GitHub Actions (gratuit)

### Schéma du flux de données
```
[Cron 6h00] → Fetch TED API (marchés belges, CPV construction/HVAC)
           → Scrape e-Procurement.be (marchés < seuils EU)
           ↓
[Supabase] → Stockage des marchés bruts (table `tenders`)
           ↓
[Claude API] → Analyse pertinence pour chaque profil utilisateur
             → Score 1-10, résumé, recommandation
             → Stockage dans table `analyses`
           ↓
[Web Push] → Notification push aux users concernés
[PWA]      → Feed de cartes avec les opportunités du jour
```

---

## Base de données (Supabase Postgres)

### Tables

```sql
-- Utilisateurs (extension de Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  company_name TEXT,
  specialties TEXT[], -- ex: ['hvac', 'renovation', 'plomberie', 'electricite', 'toiture', 'gros-oeuvre']
  regions TEXT[], -- ex: ['wallonie', 'bruxelles', 'flandre']
  provinces TEXT[], -- ex: ['namur', 'liege', 'hainaut', 'brabant-wallon', 'luxembourg']
  min_amount INTEGER DEFAULT 0, -- montant minimum marché en €
  max_amount INTEGER DEFAULT 500000, -- montant maximum
  push_subscription JSONB, -- Web Push subscription object
  plan TEXT DEFAULT 'free', -- 'free' | 'pro'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Marchés publics bruts
CREATE TABLE tenders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL, -- 'ted' | 'e-procurement'
  source_id TEXT UNIQUE NOT NULL, -- ID du marché sur la source
  title TEXT NOT NULL,
  description TEXT,
  buyer_name TEXT, -- nom de l'adjudicateur (ex: "Ville de Namur")
  buyer_location TEXT, -- localisation
  province TEXT,
  region TEXT, -- 'wallonie' | 'bruxelles' | 'flandre'
  cpv_codes TEXT[], -- codes CPV (ex: ['45331000'])
  estimated_value_min NUMERIC,
  estimated_value_max NUMERIC,
  currency TEXT DEFAULT 'EUR',
  deadline TIMESTAMPTZ,
  publication_date TIMESTAMPTZ,
  procedure_type TEXT, -- 'open' | 'restricted' | 'negotiated'
  documents_url TEXT, -- lien vers cahier des charges
  source_url TEXT, -- lien vers l'avis original
  raw_data JSONB, -- données brutes complètes
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analyses IA par profil
CREATE TABLE analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID REFERENCES tenders(id),
  profile_id UUID REFERENCES profiles(id),
  relevance_score INTEGER CHECK (relevance_score BETWEEN 1 AND 10),
  summary TEXT, -- résumé 2-3 lignes
  why_relevant TEXT, -- pourquoi c'est pertinent pour ce profil
  recommended_action TEXT, -- action concrète recommandée
  estimated_margin TEXT, -- estimation de marge
  competition_level TEXT, -- 'low' | 'medium' | 'high'
  status TEXT DEFAULT 'new', -- 'new' | 'saved' | 'dismissed' | 'applied'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tender_id, profile_id)
);

-- Index
CREATE INDEX idx_tenders_date ON tenders(publication_date DESC);
CREATE INDEX idx_tenders_region ON tenders(region);
CREATE INDEX idx_tenders_deadline ON tenders(deadline);
CREATE INDEX idx_analyses_profile ON analyses(profile_id, created_at DESC);
CREATE INDEX idx_analyses_score ON analyses(relevance_score DESC);
```

---

## Data Fetching — Sources de données

### Source 1 : TED API (marchés EU, structurés)

L'API TED est la source principale. Elle couvre tous les marchés publics belges au-dessus des seuils européens.

**Endpoint principal** : `https://api.ted.europa.eu/v3/notices/search`

**Requête pour marchés belges construction/HVAC** :
```
Query parameters:
- country: BE
- CPV codes pertinents (filtrer par préfixe) :
  - 45000000 : Travaux de construction
  - 45300000 : Travaux d'installation dans les bâtiments
  - 45331000 : Travaux d'installation de chauffage, ventilation, climatisation
  - 45332000 : Travaux de plomberie
  - 45400000 : Travaux de finition
  - 45321000 : Travaux d'isolation
  - 50700000 : Services de réparation et d'entretien d'installations de bâtiments
  - 50720000 : Réparation et entretien de chauffage central
  - 71321000 : Services d'ingénierie HVAC
- Publication date: dernières 24h
- Document type: contract notices (appels d'offres ouverts)
```

**Documentation officielle** : https://docs.ted.europa.eu/api/latest/index.html

L'accès en lecture aux notices publiées est **anonyme** (pas besoin d'API key pour lire).

Le format de retour est eForms XML ou JSON. Parser les champs : titre, acheteur, montant estimé, deadline, CPV codes, lieu d'exécution, procédure.

### Source 2 : e-Procurement.be (marchés belges, y compris petits)

Le site e-Procurement.be est une SPA JavaScript. Pas d'API publique → il faut utiliser **Playwright** pour scraper.

**URL de recherche** : `https://www.publicprocurement.be/`

**Stratégie de scraping** :
1. Lancer Playwright headless
2. Naviguer vers la page de recherche
3. Filtrer par : type = travaux, date de publication = aujourd'hui
4. Extraire la liste des résultats : titre, adjudicateur, numéro de référence, date limite, lien vers détails
5. Pour chaque résultat pertinent (filtré par mots-clés : chauffage, HVAC, ventilation, rénovation, isolation, plomberie, maintenance, pompe à chaleur), naviguer vers la page de détail et extraire les infos complètes
6. Stocker dans la table `tenders`

**Important** : le scraping doit être poli (délais entre requêtes, user-agent correct, pas de surcharge). Max 1 scrape/jour.

**Alternative au scraping** : vérifier si e-Procurement.be expose un flux RSS ou Atom dans le code source de la page. Si oui, c'est beaucoup plus simple.

---

## Pipeline d'analyse IA

Pour chaque nouveau tender, et pour chaque profil utilisateur actif, faire un appel à l'API Claude Sonnet.

**Prompt d'analyse** :

```
Tu es un analyste business spécialisé en marchés publics belges pour les PME de construction et HVAC.

PROFIL DE L'ENTREPRISE :
- Spécialités : {user.specialties}
- Régions : {user.regions}
- Provinces : {user.provinces}
- Budget marchés : {user.min_amount}€ - {user.max_amount}€

MARCHÉ PUBLIC À ANALYSER :
- Titre : {tender.title}
- Adjudicateur : {tender.buyer_name}
- Localisation : {tender.buyer_location}
- Montant estimé : {tender.estimated_value_min}€ - {tender.estimated_value_max}€
- Deadline : {tender.deadline}
- Type de procédure : {tender.procedure_type}
- Codes CPV : {tender.cpv_codes}
- Description : {tender.description}

INSTRUCTIONS :
Analyse ce marché public pour cette entreprise. Réponds UNIQUEMENT en JSON valide, sans markdown :

{
  "relevance_score": <1-10>,
  "summary": "<résumé en 2 phrases max, langage simple et direct>",
  "why_relevant": "<pourquoi c'est pertinent pour CE profil spécifique, 1-2 phrases>",
  "recommended_action": "<action concrète à faire maintenant, 1-2 phrases>",
  "estimated_margin": "<estimation de marge en % si faisable, sinon 'non estimable'>",
  "competition_level": "<'low' | 'medium' | 'high'>"
}

Règles :
- Score 8-10 = match parfait avec les spécialités ET la zone géographique
- Score 5-7 = partiellement pertinent (bonne spécialité mais zone éloignée, ou l'inverse)
- Score 1-4 = peu pertinent, ne pas recommander
- Sois concret et actionnable dans les recommandations
- Si le montant est trop gros ou trop petit pour le profil, baisse le score
```

**Optimisation tokens** : utiliser `claude-sonnet-4-6` (le plus économique en tokens pour ce type de tâche). Estimer ~500 tokens input + ~200 tokens output par analyse = ~0.001€ par analyse. Pour 50 tenders × 10 users = 500 analyses/jour = ~0.50€/jour.

---

## Frontend PWA

### Design direction
Style **industriel/utilitaire** — adapté au secteur construction. Pas de gradient violet ou de design tech générique. Pense : béton, acier, typographie bold, couleurs signalétiques (vert/jaune/rouge pour les scores).

### Pages

**1. Landing page** (`/`)
- Headline : "Recevez chaque matin les marchés publics faits pour vous."
- Sous-titre : "L'IA analyse 20 000+ marchés publics belges et vous envoie uniquement ceux qui correspondent à votre entreprise."
- CTA : "Commencer gratuitement"
- Pas de login requis pour voir la page

**2. Onboarding** (`/setup`)
- Step 1 : Nom de l'entreprise
- Step 2 : Spécialités (multi-select : HVAC, Rénovation énergétique, Plomberie, Électricité, Gros œuvre, Toiture, Isolation, Menuiserie, Peinture, Maintenance bâtiment)
- Step 3 : Zones géographiques (régions + provinces)
- Step 4 : Fourchette de montants (slider : 10K€ - 500K€)
- Step 5 : Activer les notifications push

**3. Feed principal** (`/feed`)
- Cartes empilables, une par opportunité, triées par score de pertinence décroissant
- Chaque carte montre :
  - Badge de score (vert 8-10, jaune 5-7, rouge 1-4)
  - Titre du marché
  - Adjudicateur + localisation
  - Montant estimé
  - Countdown jusqu'à la deadline ("J-14", "J-3" en rouge, etc.)
  - Résumé IA (2 lignes)
- Swipe droite = sauvegarder dans favoris
- Swipe gauche = dismisser
- Tap = ouvrir le détail

**4. Page détail** (`/tender/[id]`)
- Toutes les infos du marché
- Analyse IA complète : pourquoi c'est pertinent, action recommandée, estimation marge, niveau de compétition
- Bouton "Voir le cahier des charges" (lien vers e-Procurement/TED)
- Bouton "Sauvegarder"
- Bouton "J'ai candidaté" (pour tracker)

**5. Favoris** (`/saved`)
- Liste des marchés sauvegardés
- Filtre par statut : sauvegardé / candidaté

**6. Profil/Settings** (`/settings`)
- Modifier spécialités, zones, montants
- Gérer notifications
- Gérer abonnement (plus tard)

### PWA Requirements
- `manifest.json` avec icônes, nom, couleur de thème
- Service worker pour offline basique (cache les pages statiques)
- Web Push notification via Push API + VAPID keys
- "Add to home screen" prompt

---

## Notifications Push

### Flow
1. À l'onboarding, demander la permission de notification
2. Stocker le Push subscription dans `profiles.push_subscription`
3. Chaque matin à 7h, après l'analyse :
   - Pour chaque user, compter les opportunités avec score ≥ 7
   - Si ≥ 1 opportunité : envoyer une push notification
   - Titre : "🔍 {n} nouvelles opportunités"
   - Body : "Dont 1 à haute pertinence : {titre du meilleur marché}"
   - URL : /feed

### Implémentation
- Générer des VAPID keys (web-push npm package)
- Supabase Edge Function pour envoyer les push (ou un simple script Node sur GitHub Actions)

---

## Cron Jobs (automatisation quotidienne)

Séquence à exécuter chaque jour à 6h00 CET :

```
1. fetch_ted_tenders()     → Appel TED API, insertion dans `tenders`
2. scrape_eprocurement()   → Playwright scrape, insertion dans `tenders` (dédupliqué par source_id)
3. analyze_tenders()       → Pour chaque nouveau tender × chaque profil actif → Claude API → insertion dans `analyses`
4. send_notifications()    → Pour chaque user avec nouvelles opportunités score ≥ 7 → Web Push
```

Option 1 : **GitHub Actions** (gratuit, 2000 min/mois) avec un workflow scheduled
Option 2 : **Supabase Edge Functions** avec pg_cron
Option 3 : **Un VPS Hetzner** à 4.51€/mois avec un cron classique

GitHub Actions est le plus simple pour commencer (gratuit et pas d'infra à gérer).

---

## Structure du projet

```
radar/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx            # Landing page
│   ├── feed/
│   │   └── page.tsx        # Feed principal
│   ├── tender/
│   │   └── [id]/
│   │       └── page.tsx    # Détail d'un marché
│   ├── saved/
│   │   └── page.tsx        # Favoris
│   ├── settings/
│   │   └── page.tsx        # Profil & settings
│   ├── setup/
│   │   └── page.tsx        # Onboarding
│   └── api/
│       ├── push/
│       │   └── subscribe/route.ts  # Enregistrer push subscription
│       └── analyze/
│           └── route.ts    # Trigger manuel d'analyse (dev)
├── components/
│   ├── TenderCard.tsx      # Carte swipable d'un marché
│   ├── ScoreBadge.tsx      # Badge de pertinence coloré
│   ├── CountdownBadge.tsx  # Countdown deadline
│   ├── SwipeableStack.tsx  # Stack de cartes swipables
│   ├── OnboardingFlow.tsx  # Wizard d'onboarding
│   └── Navigation.tsx      # Nav bottom bar (PWA style)
├── lib/
│   ├── supabase.ts         # Client Supabase
│   ├── claude.ts           # Wrapper API Claude
│   ├── push.ts             # Helpers Web Push
│   └── types.ts            # TypeScript types
├── scripts/
│   ├── fetch-ted.ts        # Script fetch TED API
│   ├── scrape-eprocurement.ts  # Script Playwright
│   ├── analyze.ts          # Script analyse Claude
│   └── notify.ts           # Script envoi notifications
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── icons/              # Icônes PWA
├── .github/
│   └── workflows/
│       └── daily-radar.yml # GitHub Actions cron
├── supabase/
│   └── migrations/         # SQL migrations
├── package.json
├── next.config.js
├── tailwind.config.js
└── .env.local              # ANTHROPIC_API_KEY, SUPABASE_URL, etc.
```

---

## MVP — Ce qu'on construit en premier (Phase 1)

Pour valider le concept le plus vite possible :

1. ✅ Script fetch TED API → stocker dans Supabase
2. ✅ Script analyse Claude → stocker les analyses
3. ✅ PWA avec feed de cartes (lecture seule, pas de swipe encore)
4. ✅ Page détail marché avec analyse IA
5. ✅ Auth Supabase (email/password simple)
6. ✅ Onboarding basique (spécialités + région)
7. ✅ Notifications push
8. ✅ GitHub Actions cron quotidien

**PAS dans le MVP** : Stripe, scraping e-Procurement (commence avec TED seul), swipe gestures (juste des boutons sauvegarder/dismisser pour commencer), page favoris.

---

## Variables d'environnement requises

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:contact@radar.be
```

---

## Commandes pour Claude Code

Quand tu lances Claude Code, donne-lui ce fichier comme contexte puis dis :

```
Lis le fichier RADAR-CLAUDE-CODE-BRIEF.md. C'est le brief complet du projet.
Commence par le MVP Phase 1. Initialise le projet Next.js, configure Supabase,
crée le schéma DB, puis construis dans cet ordre :
1. Le script fetch TED API
2. Le script d'analyse Claude
3. Le frontend PWA (landing + onboarding + feed + détail)
4. Les notifications push
5. Le GitHub Actions cron

Utilise TypeScript partout. Le design doit être industriel/utilitaire,
adapté au secteur construction. Pas de design tech générique.
```

---

## Notes importantes

- **e-Procurement.be** : le site est une SPA JavaScript. Avant de tenter le scraping Playwright, vérifie d'abord si leur page expose des endpoints JSON dans le Network tab du navigateur — souvent les SPAs font des appels API internes qu'on peut directement utiliser. Ce serait beaucoup plus propre que du scraping DOM.

- **TED API** : la documentation est à https://docs.ted.europa.eu/api/latest/index.html. L'API Search permet de chercher par pays (BE), par CPV code, par date de publication. Les données sont en format eForms. L'accès en lecture est anonyme.

- **Rate limits** : TED API est généreuse pour la lecture. Claude API Sonnet en mode batch est très économique. Ne pas surcharger e-Procurement.be (1 scrape/jour max, avec délais entre requêtes).

- **Légalité** : les marchés publics sont des données publiques par définition légale. Les republier avec analyse ajoutée est parfaitement légal. Le scraping poli de données publiques est toléré en Belgique/UE.
