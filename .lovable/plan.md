

## Analyse

De `/ghl-iframe` pagina is eerder in dit gesprek aangemaakt op basis van een prompt die een standalone mock-versie van de beltool beschreef. Je geeft nu aan dat je deze niet nodig hebt — de echte beltool draait al op `/` met volledige GHL-integratie.

## Plan: GHL iFrame pagina verwijderen

1. **Verwijder `src/pages/GhlIframe.tsx`** — het volledige bestand
2. **Verwijder de route uit `src/App.tsx`** — de lazy import en de `<Route path="/ghl-iframe" .../>` regel
3. **Verwijder de project knowledge entry** over `ghl-iframe-interface` (niet meer relevant)

Geen andere bestanden refereren naar GhlIframe, dus er zijn geen verdere aanpassingen nodig.

