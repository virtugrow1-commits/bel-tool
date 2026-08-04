# Eigen accounts en Voys-instellingen per medewerker

## Doel
Nieuwe CliqMakers-medewerkers krijgen elk een eigen account in de bel-tool, met per gebruiker instelbaar e-mailadres, Voys API-token en toestelnummer. Blijft een veld leeg, dan gebruikt de tool automatisch de instellingen van de organisatie.

## Wat er verandert

### 1. Gebruikers centraal in de database
- Het gebruikersbeheer in Instellingen werkt nu op de centrale gebruikerstabel in plaats van op de lijst in de browser. Toegevoegde, gewijzigde of verwijderde medewerkers zijn direct zichtbaar op elk apparaat.
- Per gebruiker instelbaar: naam, e-mail, rol (beller/admin), toestelnummer, Voys-e-mail en Voys API-token.
- Het Voys-token wordt in de interface gemaskeerd getoond (alleen invullen/overschrijven, niet uitlezen).

### 2. E-mailadres Willem aanpassen
`willem@virtugrow.nl` wordt `willem@cliqmakers.nl`. Inloggen gebeurt daarna met het nieuwe adres.

### 3. Bellen met de juiste gegevens
De belfunctie kiest de Voys-gegevens in deze volgorde:
1. Persoonlijke gegevens van de ingelogde medewerker
2. Instellingen van de organisatie (CliqMakers)
3. Globale fallback-instellingen

Zo kan elke medewerker met een eigen Voys-account bellen, of meeliften op het CliqMakers-account met alleen een eigen toestelnummer.

### 4. Verbinding testen
In Instellingen komt per gebruiker een knop "Voys testen" die de inloggegevens controleert zonder daadwerkelijk te bellen, met duidelijke melding of het werkt.

## Technisch

- **Migratie**: kolommen `voys_email` en `voys_api_token` toevoegen aan `profiles`; RLS-policies blijven zoals ze zijn.
- **Data-update**: e-mail van Willem bijwerken naar `willem@cliqmakers.nl`.
- **`src/hooks/useTeamProfiles.ts`**: uitbreiden met `createProfile`, `updateProfile`, `deleteProfile` en de nieuwe velden.
- **`src/components/beltool/SettingsPanel.tsx`**: gebruikersbeheer omzetten van `managedUsers` (localStorage) naar de profielen-hook; velden voor Voys-e-mail/token en een testknop toevoegen.
- **`src/lib/beltool-data.ts` / `src/types`**: `User` uitbreiden met `voysEmail` en `voysApiToken` (token alleen bij opslaan verzonden).
- **`supabase/functions/voys-call/index.ts`**: `getVoysCredentials` uitbreiden met een optionele `profileId`; eerst het profiel lezen (token/e-mail/toestel), dan de organisatie, dan de globale secrets. De `ping`-actie werkt op dezelfde volgorde.
- **`src/components/beltool/CallButton.tsx` / `CallContent.tsx`**: `profileId` van de ingelogde gebruiker meesturen bij bellen.
- **`src/hooks/useAuth.ts`**: inloggen blijft op e-mail matchen tegen `profiles`, dus nieuwe medewerkers kunnen direct inloggen zodra ze zijn toegevoegd.

## Let op
De Voys API-token van het huidige account gaf eerder een 401. Nieuwe medewerkers met een eigen Voys-login werken pas als hun token geldig is; de testknop maakt dat direct zichtbaar.
