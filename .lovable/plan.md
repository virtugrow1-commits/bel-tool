## Status CLIQ-verbinding

Beide organisaties hebben momenteel **geen werkende verbinding** met CLIQ:

- **Future Media** — token `pit-2cf811ea…` aanwezig, maar CLIQ antwoordt met `401 Invalid Private Integration token` (ingetrokken of verlopen).
- **CliqMakers** — geen `ghl_api_key` en geen `ghl_location_id` ingesteld.

De `ghl-proxy` edge function zelf werkt correct: 401-fouten worden afgevangen en als lege response teruggegeven, zodat de app niet crasht. Maar alle CLIQ-data (contacten, pipelines, agenda's, gebruikers) blijft daardoor leeg.

## Wat er nodig is van jou

Per organisatie waarvoor je CLIQ-functionaliteit wil herstellen, een nieuw Private Integration token + Location ID:

1. Log in op CLIQ → switch naar het juiste sub-account.
2. **Settings → Private Integrations → Create New Integration**.
3. Scopes aanvinken:
   - `users.readonly`
   - `contacts.readonly`, `contacts.write`
   - `opportunities.readonly`, `opportunities.write`
   - `conversations/message.write`
   - `calendars.readonly`, `calendars/events.write`
   - `locations.readonly`
4. Kopieer het `pit-…` token (wordt maar één keer getoond) en de Location ID (Settings → Business Profile).

## Wat ik dan doe (in build mode)

1. Update `organizations.ghl_api_key` en `organizations.ghl_location_id` voor de betreffende org via een migration/insert.
2. Verifieer met `supabase--curl_edge_functions` (`getUsers`, `getPipelines`, `getCalendars`) dat de proxy nu 200 met echte data teruggeeft i.p.v. het `ghlUnavailable`-warning-object.
3. Bevestig in de UI dat contacten/leads/agenda's laden.

## Te beantwoorden voor ik begin

- Voor welke organisatie(s) lever je nieuwe credentials aan: Future Media, CliqMakers, of beide?
- Plak het nieuwe `pit-…` token + bijbehorende Location ID per organisatie hier in de chat.

Zonder nieuwe credentials kan ik de verbinding niet herstellen — een code-fix lost dit niet op, het probleem zit bij de CLIQ-token zelf.
