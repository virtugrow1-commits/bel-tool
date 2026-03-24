/**
 * Rapportage — volledig herbouwd met:
 * • Supabase call_sessions voor echte gespreksduur en resultaten
 * • Pipeline funnel met conversieratio per stap
 * • Team leaderboard uit Supabase user_scores
 * • Uur-heatmap op basis van echte beldata
 * • Fallback naar localStorage scores als Supabase niet beschikbaar is
 */
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { store } from '@/lib/beltool-store';
import { USERS, type User } from '@/lib/beltool-data';
import { initScores, type Scores, type ActivityLogEntry } from '@/lib/beltool-scoring';

interface CallSession {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  result: string | null;
  caller_name: string;
  contact_name: string;
  company_name: string;
  notes: string | null;
}

interface UserScore {
  user_id: string;
  score_date: string;
  gebeld: number;
  enquetes: number;
  afspraken: number;
  verstuurd: number;
  afgevallen: number;
  geen_gehoor: number;
  callbacks: number;
  best_reeks: number;
}

const RESULT_COLOR: Record<string, string> = {
  afspraak:           'hsl(152 56% 42%)',
  enqueteTel:         'hsl(174 100% 38%)',
  enqueteVerstuurd:   'hsl(265 83% 57%)',
  geenGehoor:         'hsl(220 9% 46%)',
  terugbellenGepland: 'hsl(38 92% 50%)',
  nietInteressant:    'hsl(0 84% 60%)',
  anderMoment:        'hsl(280 60% 55%)',
};

const RESULT_LABEL: Record<string, string> = {
  afspraak: 'Afspraak', enqueteTel: 'Enquête', enqueteVerstuurd: 'Verstuurd',
  geenGehoor: 'Geen gehoor', terugbellenGepland: 'Terugbellen',
  nietInteressant: 'Afgevallen', anderMoment: 'Ander moment',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[28px] font-extrabold leading-none" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function FunnelChart({ sessions }: { sessions: CallSession[] }) {
  const stages = [
    { key: 'gebeld',    label: 'Gebeld',          color: 'hsl(210 80% 52%)' },
    { key: 'contact',   label: 'Contact gemaakt',  color: 'hsl(174 100% 38%)' },
    { key: 'enquete',   label: 'Enquête gedaan',   color: 'hsl(265 83% 57%)' },
    { key: 'afspraak',  label: 'Afspraak',         color: 'hsl(152 56% 42%)' },
  ];

  const totGebeld  = sessions.length;
  const totContact = sessions.filter(s => s.duration_seconds && s.duration_seconds > 15).length;
  const totEnquete = sessions.filter(s => ['enqueteTel','enqueteVerstuurd'].includes(s.result || '')).length;
  const totAfspraak= sessions.filter(s => s.result === 'afspraak').length;

  const vals = [totGebeld, totContact, totEnquete, totAfspraak];
  const maxVal = Math.max(...vals, 1);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Pipeline funnel</div>
      <div className="space-y-3">
        {stages.map((s, i) => {
          const val  = vals[i];
          const prev = vals[i - 1] || totGebeld || 1;
          const conv = i === 0 ? 100 : prev > 0 ? Math.round((val / prev) * 100) : 0;
          const pct  = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-foreground">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {i > 0 && `${conv}% van stap ${i}`}
                  </span>
                  <span className="text-[14px] font-extrabold tabular-nums" style={{ color: s.color }}>{val}</span>
                </div>
              </div>
              <div className="h-6 bg-muted/40 rounded-lg overflow-hidden">
                <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${pct}%`, background: s.color }} />
              </div>
            </div>
          );
        })}
      </div>
      {totGebeld > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Totale conversie gebeld → afspraak</span>
          <span className="text-[14px] font-extrabold text-success">
            {Math.round((totAfspraak / totGebeld) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

function HourHeatmap({ sessions }: { sessions: CallSession[] }) {
  const hourCounts = useMemo(() => {
    const counts = new Array(24).fill(0);
    sessions.forEach(s => {
      try {
        const h = new Date(s.started_at).getHours();
        if (h >= 0 && h < 24) counts[h]++;
      } catch {}
    });
    return counts;
  }, [sessions]);

  const activeHours = hourCounts.slice(8, 18);
  const maxCount = Math.max(...activeHours, 1);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Activiteit per uur (08:00–17:00)
      </div>
      <div className="flex gap-1 items-end h-24">
        {activeHours.map((count, i) => {
          const h = i + 8;
          const pct = (count / maxCount) * 100;
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{ height: `${Math.max(pct, 4)}%`, background: count > 0 ? `hsl(174 100% ${65 - (pct * 0.3)}%)` : 'hsl(var(--muted))', minHeight: '2px' }}
                title={`${h}:00 — ${count} belpoging${count !== 1 ? 'en' : ''}`}
              />
              <span className="text-[8px] text-muted-foreground font-mono">{h}</span>
            </div>
          );
        })}
      </div>
      {sessions.length === 0 && (
        <div className="text-center text-muted-foreground/40 text-xs mt-2">Nog geen beldata beschikbaar</div>
      )}
    </div>
  );
}

function DurationStats({ sessions }: { sessions: CallSession[] }) {
  const withDuration = sessions.filter(s => s.duration_seconds && s.duration_seconds > 0);
  if (withDuration.length === 0) return null;

  const avg = Math.round(withDuration.reduce((s, c) => s + (c.duration_seconds || 0), 0) / withDuration.length);
  const max = Math.max(...withDuration.map(s => s.duration_seconds || 0));
  const total = withDuration.reduce((s, c) => s + (c.duration_seconds || 0), 0);

  const fmt = (secs: number) => secs >= 60 ? `${Math.floor(secs/60)}m ${secs%60}s` : `${secs}s`;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Gespreksduur</div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[20px] font-extrabold text-primary">{fmt(avg)}</div>
          <div className="text-[10px] text-muted-foreground">Gemiddeld</div>
        </div>
        <div>
          <div className="text-[20px] font-extrabold text-success">{fmt(max)}</div>
          <div className="text-[10px] text-muted-foreground">Langste</div>
        </div>
        <div>
          <div className="text-[20px] font-extrabold text-warning">{fmt(total)}</div>
          <div className="text-[10px] text-muted-foreground">Totaal</div>
        </div>
      </div>
    </div>
  );
}

function ResultDistribution({ sessions }: { sessions: CallSession[] }) {
  const counts: Record<string, number> = {};
  sessions.forEach(s => {
    if (s.result) counts[s.result] = (counts[s.result] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center text-muted-foreground text-xs py-8">Nog geen resultaten</div>
  );
  const segments = Object.entries(counts)
    .map(([k, v]) => ({ key: k, value: v, label: RESULT_LABEL[k] || k, color: RESULT_COLOR[k] || 'hsl(var(--muted-foreground))' }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Resultaatverdeling</div>
      <div className="space-y-2">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <div className="flex-1 text-[11px] text-foreground/70">{s.label}</div>
            <div className="text-[11px] font-bold tabular-nums">{s.value}</div>
            <div className="w-10 text-[10px] text-muted-foreground text-right">{Math.round((s.value / total) * 100)}%</div>
          </div>
        ))}
      </div>
      <div className="flex h-3 rounded-full overflow-hidden mt-3">
        {segments.map(s => (
          <div key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} className="transition-all duration-500" />
        ))}
      </div>
    </div>
  );
}

function TeamLeaderboard({ supabaseScores, localScores }: { supabaseScores: UserScore[] | null; localScores: Record<string, Scores> }) {
  const managedUsers: User[] = store.get('managedUsers', USERS);

  const rows = useMemo(() => {
    if (supabaseScores && supabaseScores.length > 0) {
      // Group by user and sum
      const byUser: Record<string, UserScore & { name: string }> = {};
      for (const s of supabaseScores) {
        const u = managedUsers.find(u => u.id === s.user_id);
        const name = u?.name || s.user_id.substring(0, 8);
        if (!byUser[s.user_id]) {
          byUser[s.user_id] = { ...s, name, gebeld: 0, enquetes: 0, afspraken: 0, verstuurd: 0, afgevallen: 0, geen_gehoor: 0, callbacks: 0, best_reeks: 0 };
        }
        byUser[s.user_id].gebeld     += s.gebeld;
        byUser[s.user_id].enquetes   += s.enquetes;
        byUser[s.user_id].afspraken  += s.afspraken;
        byUser[s.user_id].best_reeks  = Math.max(byUser[s.user_id].best_reeks, s.best_reeks);
      }
      return Object.values(byUser).sort((a, b) => (b.enquetes + b.afspraken) - (a.enquetes + a.afspraken));
    }
    // Fallback to localStorage
    return managedUsers
      .map(u => {
        const s = localScores[u.id] || initScores();
        return { user_id: u.id, name: u.name, gebeld: s.gebeld, enquetes: s.enquetes, afspraken: s.afspraken, best_reeks: s.bestReeks, score_date: '', verstuurd: s.verstuurd, afgevallen: s.afgevallen, geen_gehoor: s.geenGehoor, callbacks: s.callbacks };
      })
      .sort((a, b) => (b.enquetes + b.afspraken) - (a.enquetes + a.afspraken));
  }, [supabaseScores, localScores, managedUsers]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Team leaderboard</div>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border">
            {['#', 'Naam', 'Gebeld', 'Enquêtes', 'Afspraken', 'Conversie'].map(h => (
              <th key={h} className="py-2 px-2 text-left text-[10px] font-semibold text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const conv = r.gebeld > 0 ? Math.round(((r.enquetes + r.afspraken) / r.gebeld) * 100) : 0;
            return (
              <tr key={r.user_id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-2 font-bold" style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : undefined }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td className="py-2.5 px-2 font-semibold">{r.name}</td>
                <td className="py-2.5 px-2 text-muted-foreground">{r.gebeld}</td>
                <td className="py-2.5 px-2 font-semibold text-primary">{r.enquetes}</td>
                <td className="py-2.5 px-2 font-semibold text-success">{r.afspraken}</td>
                <td className="py-2.5 px-2 font-semibold" style={{ color: conv >= 50 ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>{conv}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  const color = RESULT_COLOR[result] || 'hsl(var(--muted-foreground))';
  const label = RESULT_LABEL[result] || result;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ color, background: color + '10', borderColor: color + '25' }}>
      {label}
    </span>
  );
}

export default function Rapportage() {
  const navigate = useNavigate();
  const currentUser: User | null = store.get('user', null);
  const localScores: Record<string, Scores> = store.get('scores', {});

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [dbScores, setDbScores] = useState<UserScore[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Date range based on period
  const dateFrom = useMemo(() => {
    const d = new Date();
    if (period === 'today') d.setHours(0, 0, 0, 0);
    else if (period === 'week') { d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); }
    else if (period === 'month') { d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); }
    else return null;
    return d.toISOString();
  }, [period]);

  // Load from Supabase
  useEffect(() => {
    setLoading(true);
    let sessionQuery = (supabase as any)
      .from('call_sessions')
      .select('id, started_at, duration_seconds, result, caller_name, contact_name, company_name, notes')
      .order('started_at', { ascending: false })
      .limit(500);
    if (dateFrom) sessionQuery = sessionQuery.gte('started_at', dateFrom);

    let scoreQuery = (supabase as any)
      .from('user_scores')
      .select('*')
      .order('score_date', { ascending: false });
    if (period === 'today') scoreQuery = scoreQuery.eq('score_date', new Date().toISOString().split('T')[0]);

    Promise.all([sessionQuery, scoreQuery])
      .then(([{ data: s }, { data: sc }]) => {
        setSessions(s || []);
        setDbScores(sc && sc.length > 0 ? sc : null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dateFrom, period]);

  // Aggregated totals from sessions (Supabase) or localStorage
  const totals = useMemo(() => {
    if (sessions.length > 0) {
      return {
        gebeld:     sessions.length,
        enquetes:   sessions.filter(s => ['enqueteTel','enqueteVerstuurd'].includes(s.result || '')).length,
        afspraken:  sessions.filter(s => s.result === 'afspraak').length,
        verstuurd:  sessions.filter(s => s.result === 'enqueteVerstuurd').length,
        afgevallen: sessions.filter(s => s.result === 'nietInteressant').length,
        geenGehoor: sessions.filter(s => s.result === 'geenGehoor').length,
        callbacks:  sessions.filter(s => s.result === 'terugbellenGepland').length,
      };
    }
    // Fallback to localStorage aggregation
    const t = initScores();
    Object.values(localScores).forEach(s => {
      t.gebeld += s.gebeld; t.enquetes += s.enquetes; t.afspraken += s.afspraken;
      t.verstuurd += s.verstuurd; t.afgevallen += s.afgevallen; t.geenGehoor += s.geenGehoor;
      t.callbacks += s.callbacks || 0;
    });
    return t;
  }, [sessions, localScores]);

  const convRate = totals.gebeld > 0
    ? Math.round(((totals.enquetes + totals.afspraken) / totals.gebeld) * 100)
    : 0;

  const PERIODS = [
    { k: 'today', l: 'Vandaag' },
    { k: 'week',  l: '7 dagen' },
    { k: 'month', l: '30 dagen' },
    { k: 'all',   l: 'Alles' },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors text-[14px] border border-border">
            ←
          </button>
          <div className="flex-1">
            <div className="text-[16px] font-bold tracking-tight">Rapportage</div>
            <div className="text-[11px] text-muted-foreground">
              {sessions.length > 0 ? `${sessions.length} gesprekken uit Supabase` : 'Lokale data'}
            </div>
          </div>
          {/* Period filter */}
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button key={p.k} onClick={() => setPeriod(p.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${period === p.k ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                {p.l}
              </button>
            ))}
          </div>
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-white">{currentUser.avatar}</div>
              <span className="text-[12px] font-semibold">{currentUser.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading && (
          <div className="text-center text-muted-foreground/50 py-8">Data laden uit Supabase...</div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Gebeld"    value={totals.gebeld}    color="hsl(222 66% 15%)" />
          <StatCard label="Enquêtes"  value={totals.enquetes}  color="hsl(174 100% 38%)" />
          <StatCard label="Afspraken" value={totals.afspraken} color="hsl(152 56% 42%)" />
          <StatCard label="Verstuurd" value={totals.verstuurd} color="hsl(265 83% 57%)" />
          <StatCard label="Conversie" value={`${convRate}%`}   color="hsl(38 92% 50%)" sub="enquêtes + afspraken" />
          <StatCard label="Geen gehoor" value={totals.geenGehoor} color="hsl(220 9% 46%)" />
        </div>

        {/* Duration stats (only when Supabase data available) */}
        {sessions.length > 0 && <DurationStats sessions={sessions} />}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FunnelChart sessions={sessions} />
          <ResultDistribution sessions={sessions} />
          <HourHeatmap sessions={sessions} />
          <TeamLeaderboard supabaseScores={dbScores} localScores={localScores} />
        </div>

        {/* Recent activity */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Recente gesprekken
            {sessions.length > 0 && <span className="ml-2 text-muted-foreground/40 font-normal normal-case">({sessions.length} geladen)</span>}
          </div>
          <div className="max-h-[320px] overflow-y-auto space-y-0">
            {sessions.length === 0 && !loading && (
              <div className="text-center text-muted-foreground/40 text-xs py-8">
                Geen gesprekken gevonden{dateFrom ? ' in deze periode' : ''}.
                <br />Start met bellen om data op te bouwen.
              </div>
            )}
            {sessions.slice(0, 50).map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0">
                <div className="text-[10px] font-mono text-muted-foreground tabular-nums w-10">
                  {new Date(s.started_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-foreground truncate">{s.contact_name || 'Onbekend'}</div>
                  {s.company_name && <div className="text-[10px] text-muted-foreground truncate">{s.company_name}</div>}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {s.duration_seconds && s.duration_seconds > 0
                    ? s.duration_seconds >= 60
                      ? `${Math.floor(s.duration_seconds/60)}m`
                      : `${s.duration_seconds}s`
                    : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground">{s.caller_name || '—'}</div>
                {s.result && <ResultBadge result={s.result} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
