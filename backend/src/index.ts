import 'dotenv/config';
import express from 'express';
import { router }          from './routes';
import { requireApiKey, requestLogger, errorHandler } from './middleware/auth';

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// CORS (voor dev — in productie whitelist specifieke origins)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
});

// ─── Public health route (no auth) ───────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    name:    'BelTool Backend API',
    version: '1.0.0',
    status:  'running',
    docs:    'POST /call-outcome | POST /send-survey | POST /survey-webhook | GET /callback-queue | POST /book-appointment',
  });
});

// ─── Protected API routes ─────────────────────────────────────────────────────

app.use('/', requireApiKey, router);

// ─── Error handler ────────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

// Vercel: export de app — geen listen() nodig
export default app;

// Lokaal / Node.js: start de server
if (process.env.NODE_ENV !== 'production' || process.env.LISTEN === 'true') {
  app.listen(PORT, () => {
    console.log(`\n🚀 BelTool Backend draait op http://localhost:${PORT}`);
    console.log(`   GHL Location : ${process.env.GHL_LOCATION_ID || '⚠️  niet ingesteld'}`);
    console.log(`   GHL Key      : ${process.env.GHL_API_KEY ? '✅ geconfigureerd' : '⚠️  niet ingesteld'}`);
    console.log(`   Survey URL   : ${process.env.SURVEY_BASE_URL || 'https://cliqmakers.nl/enquete'}`);
    console.log(`   Auth         : ${process.env.BACKEND_API_KEY ? '✅ geconfigureerd' : '⚠️  BACKEND_API_KEY niet ingesteld'}\n`);
  });
}
