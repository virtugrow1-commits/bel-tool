# GHL Email Templates — Beltool

Deze map bevat de Beltool message-templates omgezet naar **HTML emails** die je 1-op-1 in GoHighLevel kunt plakken (Marketing → Emails → Templates → New → Code Editor / Custom HTML).

## GHL placeholders die gebruikt worden

| Beltool variabele | GHL placeholder |
|---|---|
| `{voornaam}` | `{{contact.first_name}}` |
| `{bedrijf}` | `{{contact.company_name}}` |
| `{beller}` | `{{user.first_name}}` |
| `{uren}` | `{{custom_values.uren_per_week}}` |
| `{taken}` | `{{custom_values.taken}}` |
| `{bookingLink}` | `{{custom_values.booking_link}}` |
| `{enqueteLink}` | `{{custom_values.enquete_link}}` |
| `{datum}` | `{{appointment.start_date}}` |
| `{tijd}` | `{{appointment.start_time}}` |
| `{locatie}` | `{{appointment.address}}` |
| `{brandName}` | `{{custom_values.brand_name}}` (of hardcoded "CliqMakers") |

## Templates

| Bestand | Onderwerp | Wanneer |
|---|---|---|
| `01-enquete-reminder.html` | Herinnering: uw praktijkonderzoek | Reminder enquête |
| `02-stuur-enquete.html` | Uw praktijkonderzoek van {{custom_values.brand_name}} | Na telefonisch contact, enquête sturen |
| `03-opvolg-enquete.html` | Bedankt voor uw tijd — uw gratis adviesgesprek | Na telefonische enquête + booking-link |
| `04-opvolg-interesse.html` | Plan uw vrijblijvende adviesgesprek | Had interesse, geen tijd |
| `05-booking-link.html` | Uw adviesgesprek inplannen | Alleen booking-link |
| `06-afspraak-bevestiging.html` | Uw afspraak is ingepland | Bevestiging afspraak |

## Branding

- Primary: `#00C4B4` (teal)
- Navy: `#0D1B3E`
- Font: Plus Jakarta Sans (web-safe fallback: Helvetica, Arial)
- Body bg: `#ffffff`

## Stappen in GHL

1. Marketing → Emails → Templates → **+ New** → **Blank Template** → **Code Editor**.
2. Plak de volledige HTML uit het betreffende bestand.
3. Stel het **Subject** in zoals in de tabel hierboven.
4. Save. Gebruik in workflows of campagnes.
