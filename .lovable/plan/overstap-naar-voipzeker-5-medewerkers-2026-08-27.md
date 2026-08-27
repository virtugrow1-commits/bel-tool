# Overstap naar VoIPzeker + 5 medewerkers

## Doel
De bel-tool belt niet langer via Voys/VoIPGRID maar via de VoIPzeker Unite API. Daarnaast kunnen 5 medewerkers elk met hun eigen toestel (extensie) uitbellen vanuit hun eigen account.

## Hoe VoIPzeker werkt (kort)
1. In het Unite-portaal maak je een "App provisioning template" aan met een **invitation ID** (6 tekens).
2. De tool wisselt dat eenmalig in voor een **logintoken** (blijft geldig).
3. Met dat logintoken wordt telkens een **accesstoken** opgehaald; die verloopt na 30 minuten.
4. Bellen gebeurt met accesstoken + de **username van de extensie** (bijv. `1234*0200`) + het te bellen nummer.

Belangrijk: het invitation ID werkt maar één keer — na gebruik moet de template opnieuw aangezet worden voor een nieuwe. Er geldt een limiet van 30 API-verzoeken per minuut.

## Wat er gebouwd wordt

### 1. VoIPzeker-instellingen per organisatie
Nieuwe velden op de organisatie: invitation ID (eenmalig invoeren), logintoken (automatisch opgeslagen na provisioning), en het standaard uitbelnummer. In Instellingen komt een blok "Telefonie (VoIPzeker)" waar een admin het invitation ID invoert en op "Koppelen" klikt; de tool haalt dan het logintoken op en bewaart dat.

### 2. Toestel per medewerker
Per medewerker wordt de VoIPzeker-extensie ingesteld (de username uit VoIPzeker, bijv. `1234*0200`). In Instellingen komt een keuzelijst die de beschikbare extensies live uit VoIPzeker ophaalt, zodat je per medewerker gewoon het juiste toestel aanklikt in plaats van een code te typen.

### 3. Vijf accounts
Gebruikersbeheer verhuist van de browser-opslag naar de centrale gebruikerstabel, zodat je tot 5 (of meer) medewerkers kunt toevoegen die op elk apparaat kunnen inloggen. Per medewerker: naam, e-mail, rol en extensie. Willems e-mailadres wordt gelijk `willem@cliqmakers.nl`.

### 4. Bellen en ophangen
De belknop start het gesprek via VoIPzeker met de extensie van de ingelogde medewerker. Werkt de extensie niet of ontbreekt de koppeling, dan volgt een duidelijke melding in plaats van een technische fout.

### 5. Verbinding testen
Een testknop controleert of de koppeling werkt (accesstoken ophalen + extensies opsommen) zonder te bellen.

## Technisch

- **Migratie**
  - `organizations`: kolommen `voipzeker_invitation_id`, `voipzeker_login_token`, `voipzeker_outbound_number`.
  - `profiles`: kolom `voipzeker_extension` (username van de extensie).
  - Oude `voys_*` kolommen blijven voorlopig staan (niet meer gebruikt) om niets te breken.
- **Nieuwe edge function `voipzeker-call`** (vervangt `voys-call`), acties:
  - `provision` — invitation ID → logintoken, opslaan in `organizations`.
  - `extensions` — `listextensions` voor de keuzelijst.
  - `call` — `callnumber` met `username` (extensie) + genormaliseerd nummer.
  - `ping` — koppeling testen.
  - Accesstoken wordt per organisatie in geheugen gecached (25 min) en automatisch vernieuwd bij foutcode 21/90; bij 429 een nette "te veel verzoeken"-melding.
  - Telefoonnummers worden genormaliseerd naar E.164 (bestaande logica hergebruiken).
  - Let op: VoIPzeker's `callnumber` geeft geen call-ID terug. Het ophangen-vanuit-de-tool en de live belstatus vervallen daarmee; de tool toont de belstatus op basis van de eigen UI-fasen (starten → in gesprek → afronden). De hangup-knop verdwijnt of wordt "gesprek afronden" (alleen in de tool, niet op de telefoon).
- **Frontend**
  - `src/components/beltool/CallButton.tsx` en `CallContent.tsx`: aanroep naar `voipzeker-call` met `organizationId` + extensie van de gebruiker.
  - `src/hooks/useTeamProfiles.ts`: toevoegen/wijzigen/verwijderen van profielen plus het extensie-veld.
  - `src/components/beltool/SettingsPanel.tsx`: gebruikersbeheer op de database, VoIPzeker-koppelblok en extensiekeuze per gebruiker.
  - `src/hooks/useOrganizations.ts` en `src/lib/beltool-data.ts`: nieuwe velden meenemen.
  - `src/hooks/useCallFlow.ts` / `CallDisplay.tsx`: statusafhandeling losmaken van Voys-callId.
- **Opruimen**: `supabase/functions/voys-call` blijft tijdelijk staan tot VoIPzeker bevestigd werkt, daarna verwijderen. De secrets `VOYS_*` kunnen dan weg.

## Wat ik van jou nodig heb
Het **invitation ID** uit het VoIPzeker Unite-portaal (App provisioning template). Zodra de koppeling er is, haal ik de extensielijst op en koppelen we per medewerker het juiste toestel.
