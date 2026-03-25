

## Multi-Tenant Competitie Scoreboard

### Wat we bouwen
Een organisatie-laag toevoegen zodat meerdere bedrijven (CliqMakers, Future Media, etc.) elk hun eigen team en GHL-koppeling hebben, met zowel een **team-vs-team ranking** als een **individueel cross-company leaderboard**.

### Database wijzigingen

**Nieuwe tabel: `organizations`**
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid (PK) | |
| name | text | "CliqMakers", "Future Media" |
| slug | text (unique) | URL-vriendelijke naam |
| ghl_api_key | text | GHL sub-account API key |
| ghl_location_id | text | GHL location ID |
| logo_url | text (nullable) | Bedrijfslogo |
| created_at | timestamptz | |

**Tabel `profiles` uitbreiden** met `organization_id` (FK → organizations.id)

**Tabel `user_scores` uitbreiden** met `organization_id` (FK → organizations.id) — zodat we team-totalen efficiënt kunnen opvragen

RLS: iedereen kan scores lezen (nodig voor cross-company leaderboard), maar alleen eigen scores schrijven.

### Organisatie Setup Flow

1. Admin maakt organisatie aan via settings (naam + GHL API key + location ID)
2. Bij het toevoegen van bellers koppel je ze aan een organisatie
3. De GHL proxy pakt de API key van de organisatie van de ingelogde gebruiker

### Leaderboard Upgrade

Het bestaande `Leaderboard` component krijgt **twee tabs**:

- **🏢 Teams** — elke organisatie als rij, totalen van alle bellers opgeteld (calls, enquêtes, afspraken, conversie)
- **👤 Individueel** — alle bellers van alle organisaties in één lijst, met bedrijfsnaam-kolom erbij

Scores worden opgehaald uit `user_scores` met een JOIN op `profiles` en `organizations`.

### GHL Proxy Aanpassing

De edge function `ghl-proxy` haalt nu de API key uit de `organizations` tabel op basis van de `organization_id` van de ingelogde gebruiker, in plaats van de globale `GHL_API_KEY` secret. Fallback naar de bestaande secret voor backwards compatibility.

### Technische stappen

1. **Migratie**: `organizations` tabel aanmaken, `profiles.organization_id` toevoegen, `user_scores.organization_id` toevoegen
2. **Seed**: CliqMakers als eerste organisatie, bestaande profielen eraan koppelen
3. **`useTeamProfiles`**: organization data meeladen
4. **`useScoring`**: `organization_id` meesturen bij upsert
5. **`Leaderboard.tsx`**: Tabs toevoegen (Team / Individueel), team-totalen berekenen
6. **`SettingsPanel`**: Organisatiebeheer sectie (CRUD organisaties, GHL keys per org)
7. **`ghl-proxy`**: API key per organisatie ophalen uit database
8. **`LoginScreen`**: Organisatie-selectie of auto-detect op basis van profiel

### Bestanden die wijzigen

- `supabase/migrations/` — nieuwe migratie
- `src/components/beltool/Leaderboard.tsx` — tabs + cross-company data
- `src/hooks/useTeamProfiles.ts` — org data meeladen
- `src/hooks/useScoring.ts` — org_id bij upsert
- `src/components/beltool/SettingsPanel.tsx` — org beheer
- `supabase/functions/ghl-proxy/index.ts` — dynamische API key
- `src/contexts/BelToolContext.tsx` — org in context
- `src/lib/beltool-data.ts` — Organization type

