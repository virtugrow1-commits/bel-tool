import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '@/lib/beltool-store';
import { USERS, type User } from '@/lib/beltool-data';
import { initScores, type Scores, type ActivityLogEntry } from '@/lib/beltool-scoring';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[28px] font-extrabold leading-none" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({ data, max, color, label }: { data: { key: string; value: number }[]; max: number; color: string; label: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{label}</div>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.key} className="flex items-center gap-2">
            <div className="w-20 text-[11px] text-muted-foreground font-medium truncate text-right">{d.key}</div>
            <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${max > 0 ? (d.value / max) * 100 : 0}%`, background: color }}
              />
            </div>
            <div className="w-8 text-[12px] font-bold tabular-nums" style={{ color }}>{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HourHeatmap({ log }: { log: ActivityLogEntry[] }) {
  // Count activity per hour
  const hourCounts = useMemo(() => {
    const counts = new Array(24).fill(0);
    log.forEach(entry => {
      const parts = entry.time.split(':');
      if (parts.length >= 1) {
        const h = parseInt(parts[0], 10);
        if (!isNaN(h) && h >= 0 && h < 24) counts[h]++;
      }
    });
    return counts;
  }, [log]);

  const maxCount = Math.max(...hourCounts, 1);
  const activeHours = hourCounts.slice(8, 18); // 08:00 - 17:00

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Activiteit per uur (08:00–17:00)</div>
      <div className="flex gap-1 items-end h-20">
        {activeHours.map((count, i) => {
          const h = i + 8;
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={h} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  background: count > 0 ? `hsl(174 100% ${60 - (pct * 0.3)}%)` : 'hsl(var(--muted))',
                  minHeight: '2px',
                }}
                title={`${h}:00 — ${count} acties`}
              />
              <span className="text-[8px] text-muted-foreground font-mono">{h}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultPieChart({ scores }: { scores: Scores }) {
  const total = scores.enquetes + scores.afspraken + scores.verstuurd + scores.afgevallen + scores.geenGehoor + (scores.callbacks || 0);
  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center text-muted-foreground text-[12px] py-8">
        Nog geen resultaten
      </div>
    );
  }

  const segments = [
    { label: 'Enquêtes', value: scores.enquetes, color: 'hsl(174 100% 38%)' },
    { label: 'Afspraken', value: scores.afspraken, color: 'hsl(152 56% 42%)' },
    { label: 'Verstuurd', value: scores.verstuurd, color: 'hsl(265 83% 57%)' },
    { label: 'Callbacks', value: scores.callbacks || 0, color: 'hsl(38 92% 50%)' },
    { label: 'Afgevallen', value: scores.afgevallen, color: 'hsl(0 84% 60%)' },
    { label: 'Geen gehoor', value: scores.geenGehoor, color: 'hsl(220 9% 46%)' },
  ].filter(s => s.value > 0);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Resultaatverdeling</div>
      <div className="space-y-1.5">
        {segments.map(s => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
              <div className="flex-1 text-[11px] text-foreground/70">{s.label}</div>
              <div className="text-[11px] font-bold tabular-nums text-foreground">{s.value}</div>
              <div className="w-12 text-[10px] text-muted-foreground text-right">{pct}%</div>
            </div>
          );
        })}
      </div>
      {/* Horizontal stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mt-3">
        {segments.map(s => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            className="transition-all duration-500"
          />
        ))}
      </div>
    </div>
  );
}

function TeamLeaderboard({ allScores }: { allScores: Record<string, Scores> }) {
  const managedUsers: User[] = store.get('managedUsers', USERS);
  const ranked = managedUsers
    .map(u => ({ user: u, scores: allScores[u.id] || initScores() }))
    .sort((a, b) => (b.scores.enquetes + b.scores.afspraken) - (a.scores.enquetes + a.scores.afspraken));

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Team leaderboard</div>
      <div className="space-y-2">
        {ranked.map((r, i) => {
          const total = r.scores.enquetes + r.scores.afspraken;
          const convRate = r.scores.gebeld > 0 ? Math.round((total / r.scores.gebeld) * 100) : 0;
          return (
            <div key={r.user.id} className="flex items-center gap-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-extrabold">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-white">{r.user.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-foreground truncate">{r.user.name}</div>
                <div className="text-[10px] text-muted-foreground">{r.scores.gebeld} gebeld · {convRate}% conversie</div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold text-primary tabular-nums">{total}</div>
                <div className="text-[9px] text-muted-foreground">resultaten</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Rapportage() {
  const navigate = useNavigate();
  const allScores: Record<string, Scores> = store.get('scores', {});
  const currentUser: User | null = store.get('user', null);

  // Aggregate all scores
  const totals = useMemo(() => {
    const t = initScores();
    const allLog: ActivityLogEntry[] = [];
    Object.values(allScores).forEach(s => {
      t.gebeld += s.gebeld;
      t.enquetes += s.enquetes;
      t.afspraken += s.afspraken;
      t.verstuurd += s.verstuurd;
      t.afgevallen += s.afgevallen;
      t.geenGehoor += s.geenGehoor;
      t.callbacks += s.callbacks || 0;
      if (s.bestReeks > t.bestReeks) t.bestReeks = s.bestReeks;
      allLog.push(...(s.log || []));
    });
    t.log = allLog.sort((a, b) => b.time.localeCompare(a.time));
    return t;
  }, [allScores]);

  const myScores = currentUser ? (allScores[currentUser.id] || initScores()) : initScores();
  const convRate = totals.gebeld > 0 ? Math.round(((totals.enquetes + totals.afspraken) / totals.gebeld) * 100) : 0;
  const myConvRate = myScores.gebeld > 0 ? Math.round(((myScores.enquetes + myScores.afspraken) / myScores.gebeld) * 100) : 0;

  // Per-user performance for bar chart
  const managedUsers: User[] = store.get('managedUsers', USERS);
  const userBars = managedUsers.map(u => ({
    key: u.name,
    value: (allScores[u.id]?.enquetes || 0) + (allScores[u.id]?.afspraken || 0),
  }));
  const maxUserResult = Math.max(...userBars.map(b => b.value), 1);

  // Result type bars
  const resultBars = [
    { key: 'Enquêtes', value: totals.enquetes },
    { key: 'Afspraken', value: totals.afspraken },
    { key: 'Verstuurd', value: totals.verstuurd },
    { key: 'Callbacks', value: totals.callbacks },
    { key: 'Afgevallen', value: totals.afgevallen },
    { key: 'Geen gehoor', value: totals.geenGehoor },
  ];
  const maxResult = Math.max(...resultBars.map(b => b.value), 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors text-[14px] border border-border"
          >
            ←
          </button>
          <div className="flex-1">
            <div className="text-[16px] font-bold tracking-tight">Rapportage</div>
            <div className="text-[11px] text-muted-foreground">Overzicht van alle belresultaten</div>
          </div>
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-white">{currentUser.avatar}</div>
              <span className="text-[12px] font-semibold text-foreground">{currentUser.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Totaal gebeld" value={totals.gebeld} color="hsl(222 66% 15%)" />
          <StatCard label="Enquêtes" value={totals.enquetes} color="hsl(174 100% 38%)" />
          <StatCard label="Afspraken" value={totals.afspraken} color="hsl(152 56% 42%)" />
          <StatCard label="Verstuurd" value={totals.verstuurd} color="hsl(265 83% 57%)" />
          <StatCard label="Conversie" value={`${convRate}%`} sub="enquêtes + afspraken" color="hsl(38 92% 50%)" />
          <StatCard label="Beste reeks" value={totals.bestReeks} color="hsl(38 92% 50%)" />
        </div>

        {/* My stats (if logged in) */}
        {currentUser && myScores.gebeld > 0 && (
          <div className="bg-primary/[0.04] border border-primary/15 rounded-xl p-4">
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">Jouw prestaties vandaag</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {[
                { l: 'Gebeld', v: myScores.gebeld, c: 'hsl(222 66% 15%)' },
                { l: 'Enquêtes', v: myScores.enquetes, c: 'hsl(174 100% 38%)' },
                { l: 'Afspraken', v: myScores.afspraken, c: 'hsl(152 56% 42%)' },
                { l: 'Conversie', v: `${myConvRate}%`, c: 'hsl(38 92% 50%)' },
                { l: 'Reeks', v: myScores.reeks, c: 'hsl(38 92% 50%)' },
              ].map(x => (
                <div key={x.l} className="text-center">
                  <div className="text-[22px] font-extrabold leading-none" style={{ color: x.c }}>{x.v}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChart data={userBars} max={maxUserResult} color="hsl(174 100% 38%)" label="Resultaten per beller" />
          <ResultPieChart scores={totals} />
          <BarChart data={resultBars} max={maxResult} color="hsl(210 80% 52%)" label="Resultaten per type" />
          <HourHeatmap log={totals.log} />
        </div>

        {/* Team leaderboard */}
        <TeamLeaderboard allScores={allScores} />

        {/* Recent activity log */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Recente activiteit ({totals.log.length} acties)
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-0.5">
            {totals.log.length === 0 ? (
              <div className="text-center text-muted-foreground/40 text-[12px] py-6">Nog geen activiteit</div>
            ) : (
              totals.log.slice(0, 50).map((entry, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="text-[11px] font-mono text-muted-foreground tabular-nums w-12">{entry.time}</div>
                  <div className="flex-1 text-[12px] text-foreground truncate">{entry.contact || 'Onbekend'}</div>
                  <ResultBadge result={entry.result} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    gebeld: { label: 'Gebeld', color: 'hsl(222 66% 15%)', bg: 'hsl(222 66% 15% / 0.08)' },
    enquete: { label: 'Enquête', color: 'hsl(174 100% 38%)', bg: 'hsl(174 100% 38% / 0.08)' },
    afspraak: { label: 'Afspraak', color: 'hsl(152 56% 42%)', bg: 'hsl(152 56% 42% / 0.08)' },
    verstuurd: { label: 'Verstuurd', color: 'hsl(265 83% 57%)', bg: 'hsl(265 83% 57% / 0.08)' },
    afgevallen: { label: 'Afgevallen', color: 'hsl(0 84% 60%)', bg: 'hsl(0 84% 60% / 0.08)' },
    geenGehoor: { label: 'Geen gehoor', color: 'hsl(220 9% 46%)', bg: 'hsl(220 9% 46% / 0.08)' },
    callback: { label: 'Callback', color: 'hsl(38 92% 50%)', bg: 'hsl(38 92% 50% / 0.08)' },
  };
  const m = map[result] || { label: result, color: 'hsl(var(--muted-foreground))', bg: 'hsl(var(--muted) / 0.5)' };
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color: m.color, background: m.bg, borderColor: m.color + '25' }}
    >
      {m.label}
    </span>
  );
}
