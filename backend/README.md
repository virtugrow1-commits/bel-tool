# BelTool Backend API

Node.js + TypeScript backend die de Bel-Tool integreert met GoHighLevel API v2.

## Endpoints

| Method | Path                | Beschrijving                              |
|--------|---------------------|-------------------------------------------|
| GET    | `/health`           | Healthcheck + configuratie status         |
| POST   | `/call-outcome`     | Sla beluitkomst op, stuur enquête        |
| POST   | `/send-survey`      | Stuur enquête email handmatig             |
| POST   | `/survey-webhook`   | Verwerk ingevulde enquête (webhook)       |
| GET    | `/callback-queue`   | Alle contacten die teruggebeld moeten     |
| POST   | `/book-appointment` | Boek afspraak in GHL                     |
| GET    | `/logs`             | Event log (debug/admin)                   |

## Setup

```bash
cp .env.example .env
# Vul .env in met je GHL API key etc.
npm install
npm run dev
```

## Deployment op Vercel

```bash
npm i -g vercel
vercel --prod
# Stel environment variables in via Vercel dashboard
```

## Authenticatie

Alle endpoints zijn beveiligd met een API key.  
Stuur mee als header:
```
Authorization: Bearer <BACKEND_API_KEY>
# of
X-API-Key: <BACKEND_API_KEY>
```

## Request voorbeelden

### POST /call-outcome
```json
{
  "contactId": "abc123",
  "outcome": "busy_interested",
  "notes": "Geïnteresseerd in AI automatisering, belt terug na vakantie",
  "callerName": "Willem"
}
```

Mogelijke outcomes: `busy_interested` | `not_interested` | `no_answer` | `callback` | `appointment`

### POST /survey-webhook
```json
{
  "contactId": "abc123",
  "answers": {
    "hoursPerWeek": "6-10 uur",
    "tasks": ["Leads nabellen", "CRM bijwerken", "Offertes opmaken"],
    "growthPhase": "Klaar voor groei",
    "aiStatus": "Komt niet aan toe"
  }
}
```

### POST /book-appointment
```json
{
  "contactId": "abc123",
  "datetime": "2026-04-15T10:00:00+02:00",
  "duration": 30,
  "advisorId": "ghl-user-id",
  "location": "Google Meet",
  "notes": "Lead wil graag demo zien van CRM automatisering"
}
```

## GHL Custom Fields

De backend schrijft naar deze custom fields (aan te maken in GHL):

| Field ID                      | Type    | Beschrijving              |
|-------------------------------|---------|---------------------------|
| `beltool_call_outcome`        | Text    | Laatste belresultaat      |
| `beltool_lead_status`         | Text    | Status in de pipeline     |
| `beltool_interest_level`      | Text    | hot / warm / cold         |
| `beltool_lead_score`          | Number  | Lead score (0-100)        |
| `beltool_callback_required`   | Text    | true / false              |
| `beltool_survey_sent_at`      | Date    | Wanneer enquête verstuurd |
| `beltool_survey_completed_at` | Date    | Wanneer enquête ingevuld  |
| `beltool_appointment_status`  | Text    | booked / pending          |
| `beltool_appointment_date`    | Date    | Datum afspraak            |
| `beltool_uren_per_week`       | Text    | Enquête antwoord          |
| `beltool_taken`               | Text    | Enquête antwoord          |
| `beltool_groeifase`           | Text    | Enquête antwoord          |
| `beltool_ai_status`           | Text    | Enquête antwoord          |
| `beltool_last_call_date`      | Date    | Laatste belpoging         |

## GHL Tags

| Tag                    | Wanneer gezet                    |
|------------------------|----------------------------------|
| `beltool-interesse`    | outcome = busy_interested        |
| `beltool-afgevallen`   | outcome = not_interested         |
| `beltool-geen-gehoor`  | outcome = no_answer              |
| `beltool-terugbellen`  | outcome = callback               |
| `survey-sent`          | Na versturen enquête             |
| `survey-completed`     | Na invullen enquête              |
| `lead-hot`/`warm`/`cold` | Na scoring                     |
| `appointment-booked`   | Na boeken afspraak               |
