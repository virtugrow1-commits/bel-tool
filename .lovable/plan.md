# Inloggen en laden sneller maken

## Wat er gebeurt
De inloglogboeken laten zien dat bij elke pagina-opening tientallen controles tegelijk naar de inlogdienst gaan (ca. 15 per seconde). Elke CLIQ- en telefonie-aanvraag controleert de sessie opnieuw bij de inlogdienst. Die raakt daardoor overbelast: controles duren 5–15 seconden of lopen vast (time-out), en ook jouw eigen inlog/verversing wacht in die rij.

## Aanpak
1. **Sessie lokaal controleren in de serverfuncties** (CLIQ, telefonie, beheer, uitnodigen): de handtekening van het inlogbewijs direct controleren in plaats van bij elke aanvraag de inlogdienst te bellen. Beveiliging blijft gelijk (ongeldig/verlopen bewijs wordt geweigerd; organisatie en rol blijven server-side bepaald).
2. **Minder gelijktijdige aanvragen bij opstarten**: CLIQ-gegevens (agenda's, pipelines, gebruikers) één keer ophalen en delen, en niet allemaal tegelijk afvuren voordat de contactlijst staat.
3. **Inlogknop**: duidelijke melding na 10 seconden ("Server reageert traag, probeer opnieuw") in plaats van eindeloos wachten.
4. **Controle**: inloggen + 5x herladen in de testbrowser, tellen hoeveel controles naar de inlogdienst gaan (doel: 1–2 per opening) en laadtijd meten.
5. Als het daarna nog traag is: server-capaciteit vergroten voorstellen.

Niet gepubliceerd tot jij akkoord geeft. Belflow en rechten veranderen niet.

## Technisch
- Edge functions: `supabase.auth.getUser(token)` vervangen door `supabase.auth.getClaims(token)` (JWKS-verificatie, geen netwerkcall naar GoTrue per request); `sub` → profiel via `auth_user_id`.
- Client: dedupe/singleflight voor ghl-proxy leesacties (getCalendars/getPipelines/getUsers) en sequentieel na eerste leadpagina.
- Login-timeout in Login-component; test toevoegen voor timeoutmelding.
