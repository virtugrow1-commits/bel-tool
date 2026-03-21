

## Plan: Bellen vanuit de Bel-Tool met Twilio

### Huidige situatie
De "bel" functie simuleert nu een gesprek met `setTimeout` — er wordt niet echt gebeld. Je hebt GHL met Twilio integratie.

### Aanpak: Twilio Browser Calling

We gebruiken de **Twilio Connector** (beschikbaar in Lovable) om echte telefoongesprekken te starten vanuit de browser via Twilio's Client JS SDK.

```text
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Bel-Tool    │────▶│  Edge Function   │────▶│ Twilio Gateway   │
│  (Browser)   │     │  twilio-token    │     │ (Capability Token)│
│              │     └─────────────────┘     └──────────────────┘
│  Twilio JS   │────────────────────────────▶  Twilio PSTN Call
│  SDK calling │
└──────────────┘
```

### Stappen

1. **Twilio Connector koppelen** — Via de connector tool wordt Twilio aan het project gekoppeld. Dit geeft `TWILIO_API_KEY` en `LOVABLE_API_KEY` als secrets.

2. **Edge Function: `twilio-token`** — Nieuwe edge function die een Twilio Access Token genereert voor de browser client. Dit token authoriseert de browser om via Twilio te bellen. Roept de Twilio gateway aan om een TwiML App SID te gebruiken.

3. **Edge Function: `twilio-voice`** — TwiML webhook die Twilio vertelt wat te doen wanneer een call wordt gestart (connect naar het opgegeven telefoonnummer).

4. **Frontend: Twilio Device integreren** — Installeer `@twilio/voice-sdk`. Bij het klikken op "Bellen":
   - Haal een token op via de edge function
   - Initialiseer een `Twilio.Device`
   - Start een outbound call naar het telefoonnummer van de contact
   - Toon real-time call status (ringing, connected, ended)

5. **CallStateBar updaten** — De bestaande `CallStateBar` component koppelen aan echte Twilio call events (`ringing`, `accept`, `disconnect`) in plaats van de huidige setTimeout simulatie.

6. **BelTool.tsx: `startDialing` refactoren** — Vervang de setTimeout-simulatie door echte Twilio Device.connect() call, met het telefoonnummer van de actieve contact.

### Vereisten van de gebruiker
- Een Twilio-account met een telefoonnummer (voor caller ID)
- Een TwiML App in Twilio (wordt uitgelegd bij setup)

### Technische details
- **Package**: `@twilio/voice-sdk` (npm)
- **Edge functions**: `twilio-token` (generates Access Token), `twilio-voice` (TwiML response)
- **Bestanden gewijzigd**: `BelTool.tsx`, `CallStateBar.tsx`, `CallContent.tsx`
- **Bestanden nieuw**: `supabase/functions/twilio-token/index.ts`, `supabase/functions/twilio-voice/index.ts`, `src/lib/twilio-device.ts`

