

## Multi-Sub-Account Ondersteuning voor BelTool

### Samenvatting
De tool geschikt maken zodat elk GHL sub-account (bijv. CliqMakers, Future Media, een nieuwe klant) de BelTool kan gebruiken met eigen branding, leads, templates, en afspraken. De basis multi-tenant structuur (organizations tabel, ghl-proxy met org lookup) is al aanwezig. Wat ontbreekt zijn de **per-organisatie configuratie** en de **branding/content scheiding**.

---

### Wat er al werkt
- `organizations` tabel met `ghl_api_key` en `ghl_location_id`
- `ghl-proxy` haalt dynamisch de juiste API key op basis van `organizationId`
- `profiles.organization_id` koppelt gebruikers aan een organisatie
- Settings panel om organisaties aan te maken

### Wat er nog moet gebeuren

#### 1. Organisatie-specifieke configuratie opslaan
Nieuwe kolommen toevoegen aan de `organizations` tabel:
- `enquete_link` (text) — bijv. `https://enquete.cliqmakers.nl/enquete/...` vs `https://enquete.futuremedia.nl/...`
- `booking_link` (text) — bijv. `https://adviesgesprekken.cliqmakers.nl/` vs andere
- `brand_name` (text) — "CliqMakers" vs "Future Media" (voor in templates)
- `whatsapp_templates` (jsonb, nullable) — override van template-namen per org als die in GHL anders heten

**Migratie SQL:**
```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS enquete_link text DEFAULT 'https://enquete.cliqmakers.nl/enquete/tV6XNgzJO54vbuCuiuvA',
  ADD COLUMN IF NOT EXISTS booking_link text DEFAULT 'https://adviesgesprekken.cliqmakers.nl/',
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS whatsapp_templates jsonb;
```

#### 2. Login: organisatie auto-detectie
De `useAuth` hook haalt nu GHL users op zonder `organizationId`. Aanpassen zodat:
1. Bij login: alle organisaties ophalen
2. Per organisatie GHL users opvragen (via `organizationId` parameter)
3. Email matchen tegen de juiste organisatie
4. `organization_id` opslaan in het profiel

**Bestanden:** `src/hooks/useAuth.ts`

#### 3. Templates dynamisch maken per organisatie
De hardcoded "CliqMakers" teksten en links in `message-templates.ts` vervangen door variabelen:
- `{brandName}` i.p.v. "CliqMakers"
- `{enqueteLink}` en `{bookingLink}` vullen vanuit de organisatie-config
- `renderTemplate` uitbreiden met org-specifieke variabelen

**Bestanden:** `src/lib/message-templates.ts`, `src/components/beltool/WhatsAppComposer.tsx`

#### 4. Organisatie-context door de hele app
De `BelToolContext` uitbreiden met de huidige organisatie (incl. links en branding). Alle componenten die GHL aanroepen sturen `organizationId` mee.

**Bestanden:** `src/contexts/BelToolContext.tsx`, `src/pages/BelTool.tsx`

#### 5. GHL calls altijd met organisationId
`src/lib/beltool-ghl.ts` — de `callCliq` functie aanpassen zodat deze automatisch het `organizationId` van de ingelogde user meestuurt in elke request.

#### 6. Settings: organisatie branding beheren
In het settings panel per organisatie de velden beheerbaar maken:
- Enquête-link
- Booking-link
- Bedrijfsnaam (brand)
- WhatsApp template-namen (indien afwijkend)

**Bestanden:** `src/components/beltool/SettingsPanel.tsx`, `src/hooks/useOrganizations.ts`

#### 7. WhatsApp templates per organisatie
Elk sub-account in GHL heeft eigen goedgekeurde templates (mogelijk met andere namen). De `whatsapp_templates` JSONB kolom slaat per org een mapping op: `{ "stuur-enquete": "custom_template_name" }`. Bij het versturen kijkt de code eerst of de org een override heeft.

---

### Technische stappen (volgorde)

| # | Taak | Bestanden |
|---|------|-----------|
| 1 | DB migratie: extra kolommen op `organizations` | `supabase/migrations/` |
| 2 | `useOrganizations` uitbreiden met nieuwe velden | `src/hooks/useOrganizations.ts` |
| 3 | Login flow: org auto-detect via GHL users per org | `src/hooks/useAuth.ts` |
| 4 | `BelToolContext` + `callCliq`: org doorgeven | `src/contexts/BelToolContext.tsx`, `src/lib/beltool-ghl.ts` |
| 5 | Templates dynamisch: branding + links uit org | `src/lib/message-templates.ts`, `WhatsAppComposer.tsx` |
| 6 | Settings panel: branding-velden per org | `src/components/beltool/SettingsPanel.tsx` |
| 7 | Seed: CliqMakers org vullen met juiste links | migratie |

### Resultaat
Elke organisatie (sub-account) heeft:
- Eigen GHL API key en location (al werkend)
- Eigen leads/contacts/pipelines (automatisch via GHL location)
- Eigen enquête-link en booking-link
- Eigen bedrijfsnaam in WhatsApp templates
- Eventueel eigen WhatsApp template-namen

