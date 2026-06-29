## Probleem

Na het invullen van het praktijkonderzoek opent "Plan nu uw gratis adviesgesprek" de boekingspagina (`/afspraak`) met alleen `?contactId=...`. De boekingspagina probeert vervolgens de klantgegevens uit CLIQ te halen — maar omdat het CLIQ token van die organisatie momenteel een 401 geeft, valt de proxy terug op een lege response en blijft het contactformulier leeg. De lead moet daardoor naam/email/telefoon/bedrijf opnieuw invullen.

## Oplossing

Stuur de klantgegevens die de enquête al kent rechtstreeks mee in de URL, en laat de boekingspagina die direct gebruiken (zonder afhankelijk te zijn van CLIQ).

### 1. `src/pages/ProspectSurvey.tsx`
- Bouw de booking-URL met extra query-parameters: `name`, `email`, `phone`, `company` (URL-encoded), naast de bestaande `contactId`.
- Geldt zowel wanneer de enquête vanuit een CLIQ-link kwam (gegevens al ingevuld) als wanneer de lead ze zelf op stap 0 heeft ingetypt.

### 2. `src/pages/Afspraak.tsx`
- Lees `name` / `email` / `phone` / `company` uit `useSearchParams` en gebruik ze als initial state voor `contact`.
- Als die query-parameters aanwezig zijn én er staan nog geen gegevens uit `getContact`, sla stap `contact` over en ga direct naar `date`.
- Gebruik de URL-waarden als fallback wanneer `getContact` faalt of een lege response geeft (huidige CLIQ 401-scenario), zodat het formulier nooit meer leeg start.
- Wanneer er geen `contactId` is maar wel `name`+`email`+`phone`, sla het contact-formulier ook over (lead heeft alles al ingevuld in de enquête).

## Resultaat

De klant klikt aan het einde van de enquête op "Plan nu uw gratis adviesgesprek" en komt direct op de datum/tijd-selectie van `/afspraak` — naam, e-mail, telefoon en bedrijf staan al klaar, ongeacht of CLIQ bereikbaar is.
