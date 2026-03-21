

## Probleem

De pipeline in GHL wordt niet correct bijgewerkt wanneer je een actie kiest (bijv. "Niet geïnteresseerd", "Geen gehoor"). Er zijn drie oorzaken:

1. **Opportunity ID ontbreekt**: Bij het laden van leads wordt het opportunity ID niet opgeslagen. Bij `endCall` moet er opnieuw gezocht worden via `contact_id`, wat fout kan gaan als een contact meerdere opportunities heeft.

2. **Dubbele pipeline-fetch**: `endCall` haalt de volledige pipeline opnieuw op (`ghl.getPipelines()`) alleen om de stage ID te vinden. Dit is traag en foutgevoelig.

3. **Stage-namen matchen niet**: De `STAGE_TO_GHL` mapping gebruikt hardcoded namen die exact moeten matchen met GHL. Als er een spatie of hoofdletter verschilt, wordt de stage niet gevonden en gebeurt er niets (silently fails).

## Plan

### Stap 1: Opportunity ID meenemen bij het laden van leads

Bij `mapOpportunitiesToCompanies` ook het **opportunity ID** opslaan per contact. Dit vereist een kleine uitbreiding van het `CompanyContact` type (of een aparte mapping).

### Stap 2: Pipeline stages cachen bij eerste load

Bij het laden van leads worden de pipeline stages al opgehaald. Sla een `Map<stageName, stageId>` op in state zodat we bij `endCall` direct de juiste `stageId` hebben zonder opnieuw `getPipelines` te hoeven aanroepen.

### Stap 3: endCall direct opportunity updaten met opgeslagen IDs

In plaats van:
- `ghl.updateContactStage()` (voegt alleen een tag toe → verwijderen)
- `ghl.getPipelines()` opnieuw aanroepen
- Opportunity zoeken op contact_id

Direct `ghl.upsertOpportunity()` aanroepen met het opgeslagen opportunity ID en de gecachede stage ID.

### Stap 4: Edge function - opportunity updaten op ID

Pas `upsertOpportunity` in de edge function aan zodat als een `opportunityId` wordt meegegeven, deze direct wordt gebruikt (PUT) in plaats van opnieuw te zoeken.

### Stap 5: Tag-toevoeging verwijderen

`ghl.updateContactStage()` (die alleen een tag toevoegt) wordt verwijderd uit de `endCall` flow — de pipeline-verplaatsing is de enige bron van waarheid.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/types/beltool.ts` | `opportunityId` toevoegen aan `CompanyContact` |
| `src/pages/BelTool.tsx` | Opportunity IDs en stage IDs cachen; `endCall` vereenvoudigen |
| `src/lib/beltool-ghl.ts` | `updateContactStage` verwijderen; `upsertOpportunity` parameter voor direct ID |
| `supabase/functions/ghl-proxy/index.ts` | `upsertOpportunity` case: direct updaten als `opportunityId` is meegegeven |

