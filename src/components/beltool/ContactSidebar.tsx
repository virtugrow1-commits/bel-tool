import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Company, CompanyContact, CallPhase, CompanyStage } from '@/types/beltool';
import { STAGE_META } from '@/types/beltool';
import { useBelTool } from '@/contexts/BelToolContext';
import type { Scores } from '@/lib/beltool-scoring';
import type { User } from '@/lib/beltool-data';
import { store } from '@/lib/beltool-store';

const FILTER_TABS: { key: CompanyStage | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'Alles', icon: '📋' },
  { key: 'nieuw', label: 'Nieuw', icon: '🆕' },
  { key: 'terugbellenGepland', label: 'Terugbellen', icon: '🔔' },
  { key: 'geenGehoor', label: 'Geen gehoor', icon: '📵' },
  { key: 'enqueteVerstuurd', label: 'Verstuurd', icon: '📨' },
  { key: 'afspraak', label: 'Afspraak', icon: '📅' },
  { key: 'nietInteressant', label: 'Afgevallen', icon: '🚫' },
];

const QUICK_NOTES = [
  { label: 'VM ingesproken', icon: '📩' },
  { label: 'Terugbellen na vakantie', icon: '🏖️' },
  { label: 'Interesse maar druk', icon: '⏳' },
  { label: 'Doorverbonden secretaresse', icon: '👩‍💼' },
  { label: 'Voicemail vol', icon: '📵' },
  { label: 'Verkeerd nummer', icon: '❌' },
];

function getBestCallTimeSuggestion(scores: Scores): string | null {
  const hour = new Date().getHours();
  if (scores.gebeld < 3) return null;
  const successRate = (scores.enquetes + scores.afspraken) / scores.gebeld;
  if (hour < 9) return '🕘 Beste beltijd begint om 9:00 – meeste leads nemen dan op';
  if (hour >= 9 && hour < 11) return '🎯 Nu is een topmoment — leads zijn het meest bereikbaar';
  if (hour >= 11 && hour < 12) return '⏰ Nog 1 uur tot lunch — maak je calls af!';
  if (hour >= 12 && hour < 13.5) return '🍽️ Lunchpauze — minder bereikbaarheid';
  if (hour >= 13.5 && hour < 15) return '🎯 Middag-piek — veel leads nemen nu op';
  if (hour >= 15 && hour < 17) return '📞 Laatste uren — focus op warme leads!';
  if (successRate < 0.2) return '💡 Tip: probeer meer open vragen te stellen';
  return null;
}

interface DailyTargets {
  calls: number;
  appointments: number;
  surveys: number;
}

function DailyTargetBar({ scores, targets }: { scores: Scores; targets: DailyTargets }) {
  const items = [
    { label: 'Calls', current: scores.gebeld, target: targets.calls, color: 'hsl(var(--navy))' },
    { label: 'Enquêtes', current: scores.enquetes, target: targets.surveys, color: 'hsl(var(--primary))' },
    { label: 'Afspraken', current: scores.afspraken, target: targets.appointments, color: 'hsl(var(--success))' },
  ];
  return (
    <div className="bg-card border border-border rounded-xl p-2.5 mb-2.5 shadow-sm">
      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">📊 Dagdoel</div>
      <div className="space-y-1.5">
        {items.map(it => {
          const pct = Math.min((it.current / it.target) * 100, 100);
          const done = it.current >= it.target;
          return (
            <div key={it.label} className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground w-[52px]">{it.label}</span>
              <div className="flex-1 h-[5px] rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%`, background: done ? 'hsl(var(--success))' : it.color }}
                />
              </div>
              <span className={cn('text-[10px] font-bold tabular-nums w-[36px] text-right', done ? 'text-success' : 'text-foreground/60')}>
                {it.current}/{it.target}
              </span>
              {done && <span className="text-[10px]">✅</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PauseTimer({ onPauseChange }: { onPauseChange?: (paused: boolean) => void }) {
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setSessionSeconds(s => s + 1);
      if (paused) setElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [paused]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={cn(
      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] mb-2.5 transition-colors',
      paused ? 'bg-warning/10 border-warning/20' : 'bg-muted/30 border-border'
    )}>
      <button
        onClick={() => { setPaused(!paused); onPauseChange?.(!paused); }}
        className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center text-[12px] transition-colors',
          paused ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        {paused ? '▶' : '⏸'}
      </button>
      <div className="flex-1">
        <span className="text-muted-foreground font-medium">
          {paused ? '⏸ Pauze' : '🟢 Actief'}
        </span>
      </div>
      <span className="font-mono tabular-nums text-muted-foreground">{fmt(sessionSeconds)}</span>
      {elapsed > 0 && (
        <span className="font-mono tabular-nums text-warning text-[10px]">({fmt(elapsed)} pauze)</span>
      )}
    </div>
  );
}

interface ContactSidebarProps {
  companies: Company[];
  activeCompId: string | null;
  activeContactId: string | null;
  expandedComp: string | null;
  setExpandedComp: (id: string | null) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onSelectContact: (comp: Company, contact: CompanyContact) => void;
  phase: CallPhase;
  onBusy: () => void;
  scores: Scores;
  convRate: number;
  user: User;
  onLogout: () => void;
  onShowAgenda: () => void;
  onShowCallbackQueue: () => void;
  onShowLeaderboard: () => void;
  onShowSettings?: () => void;
  dueCallbackCount: number;
  appointmentCount: number;
  hasMoreLeads?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  stageFilter: CompanyStage | 'all';
  onStageFilterChange: (f: CompanyStage | 'all') => void;
  onSelectFromLog?: (contactName: string) => void;
  onInsertNote?: (text: string) => void;
}

export function ContactSidebar({ companies, activeCompId, activeContactId, expandedComp, setExpandedComp, search, onSearchChange, onSelectContact, phase, onBusy, scores, convRate, user, onLogout, onShowAgenda, onShowCallbackQueue, onShowLeaderboard, onShowSettings, dueCallbackCount, appointmentCount, hasMoreLeads, loadingMore, onLoadMore, stageFilter, onStageFilterChange, onSelectFromLog, onInsertNote }: ContactSidebarProps) {
  const { t } = useBelTool();
  const [filterOpen, setFilterOpen] = useState(false);
  const [showTargetEdit, setShowTargetEdit] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [targets, setTargets] = useState<DailyTargets>(() => store.get('dailyTargets', { calls: 50, appointments: 5, surveys: 10 }));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const stageFiltered = stageFilter === 'all' ? companies : companies.filter(c => c.stage === stageFilter);
  const filtered = stageFiltered.filter(c => (c.name + ' ' + c.contacts.map(ct => ct.firstName + ' ' + ct.lastName).join(' ')).toLowerCase().includes(search.toLowerCase()));

  const stageCounts: Record<string, number> = {};
  for (const tab of FILTER_TABS) {
    stageCounts[tab.key] = tab.key === 'all' ? companies.length : companies.filter(c => c.stage === tab.key).length;
  }

  const callTimeTip = getBestCallTimeSuggestion(scores);

  const exportCSV = useCallback(() => {
    const rows = [['Tijd', 'Contact', 'Resultaat']];
    scores.log.forEach(e => rows.push([e.time, e.contact, e.result]));
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `belresultaten-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scores.log]);

  return (
    <div className="w-[280px] border-r border-border flex flex-col flex-shrink-0 bg-card">
      <div className="px-3 pt-3 pb-2">
        {/* Row 1: Title + action icons */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[14px] font-bold tracking-tight text-foreground flex-1">Bel-Tool</div>
          <div className="flex gap-0.5">
            {[
              { fn: onShowAgenda, icon: '📅', active: appointmentCount > 0, title: t.agenda },
              { fn: onShowCallbackQueue, icon: '🔔', badge: dueCallbackCount, title: 'Callbacks' },
              { fn: onShowLeaderboard, icon: '🏆', title: 'Leaderboard' },
              { fn: exportCSV, icon: '📤', title: 'Exporteer' },
              { fn: onShowSettings, icon: '⚙️', title: 'Instellingen' },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.fn}
                title={btn.title}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-[12px] transition-colors relative',
                  btn.active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {btn.icon}
                {btn.badge && btn.badge > 0 ? <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-destructive text-white text-[7px] font-bold flex items-center justify-center">{btn.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: User + pause timer combined */}
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/40 border border-border">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[8px] font-extrabold text-white flex-shrink-0">{user.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-foreground truncate">{user.name}</div>
          </div>
          <PauseTimerInline />
          <button onClick={onLogout} className="text-muted-foreground text-[10px] hover:text-foreground transition-colors" title="Uitloggen">↗</button>
        </div>

        {/* Row 3: Combined stats + daily targets */}
        <div className="bg-card border border-border rounded-xl p-2.5 mb-2 shadow-sm">
          {/* Stats row */}
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t.today}</span>
            {scores.reeks >= 2 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">🔥{scores.reeks}x</span>}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {[
              { label: t.called, value: scores.gebeld, target: targets.calls, color: 'hsl(var(--navy))' },
              { label: t.surveys, value: scores.enquetes, target: targets.surveys, color: 'hsl(var(--primary))' },
              { label: t.appointments, value: scores.afspraken, target: targets.appointments, color: 'hsl(var(--success))' },
            ].map(s => (
              <div key={s.label} className="text-center py-1.5 rounded-lg bg-muted/50 border border-border">
                <div className="text-lg font-extrabold leading-none" style={{ color: s.color }}>{s.value}<span className="text-[10px] font-semibold text-muted-foreground">/{s.target}</span></div>
                <div className="text-[9px] font-medium text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Progress bars */}
          <div className="space-y-1">
            {[
              { label: 'Calls', current: scores.gebeld, target: targets.calls, color: 'hsl(var(--navy))' },
              { label: 'Enquêtes', current: scores.enquetes, target: targets.surveys, color: 'hsl(var(--primary))' },
              { label: 'Afspraken', current: scores.afspraken, target: targets.appointments, color: 'hsl(var(--success))' },
            ].map(it => {
              const pct = Math.min((it.current / it.target) * 100, 100);
              return (
                <div key={it.label} className="flex items-center gap-1.5">
                  <div className="flex-1 h-[3px] rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: pct >= 100 ? 'hsl(var(--success))' : it.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowTargetEdit(!showTargetEdit)}
            className="text-[9px] text-muted-foreground hover:text-primary transition-colors mt-1.5 block"
          >
            {showTargetEdit ? '▲ Sluiten' : '⚙ Dagdoel aanpassen'}
          </button>
          {showTargetEdit && (
            <div className="bg-muted/30 border border-border rounded-lg p-2 mt-1.5 space-y-1">
              {(['calls', 'appointments', 'surveys'] as const).map(key => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-[52px]">{key === 'calls' ? 'Calls' : key === 'appointments' ? 'Afspraken' : 'Enquêtes'}</span>
                  <input
                    type="number"
                    value={targets[key]}
                    onChange={e => {
                      const v = { ...targets, [key]: Math.max(1, parseInt(e.target.value) || 1) };
                      setTargets(v);
                      store.set('dailyTargets', v);
                    }}
                    className="flex-1 px-2 py-1 rounded-md border border-border bg-card text-foreground text-[11px] outline-none focus:border-primary w-16"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Best call time tip (compact) */}
        {callTimeTip && (
          <div className="px-2.5 py-1.5 rounded-lg bg-primary/[0.06] border border-primary/15 mb-2 text-[10px] font-medium text-primary">
            {callTimeTip}
          </div>
        )}

        {/* Quick notes */}
        {onInsertNote && phase !== 'idle' && (
          <div className="mb-2.5">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">📝 Snelnotities</div>
            <div className="flex flex-wrap gap-1">
              {QUICK_NOTES.map(n => (
                <button
                  key={n.label}
                  onClick={() => onInsertNote(n.label)}
                  className="px-2 py-1 rounded-md border border-border bg-muted/30 text-[10px] font-medium text-foreground/70 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors active:scale-[0.95]"
                >
                  {n.icon} {n.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <input
          placeholder={t.search}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-[12px] outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary/20 mb-2"
        />

        {/* Stage filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card text-[12px] font-semibold transition-colors hover:border-primary/40"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-[13px]">{FILTER_TABS.find(f => f.key === stageFilter)?.icon}</span>
              <span className="text-foreground">{FILTER_TABS.find(f => f.key === stageFilter)?.label}</span>
              <span className="text-[10px] text-muted-foreground">({stageCounts[stageFilter]})</span>
            </span>
            <span className={cn('text-muted-foreground text-[9px] transition-transform', filterOpen && 'rotate-180')}>▼</span>
          </button>
          {filterOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              {FILTER_TABS.map(tab => {
                const count = stageCounts[tab.key];
                const isActive = stageFilter === tab.key;
                const meta = tab.key !== 'all' ? STAGE_META[tab.key] : null;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { onStageFilterChange(tab.key); setFilterOpen(false); }}
                    className={cn(
                      'flex items-center gap-2.5 w-full text-left px-3 py-2 text-[12px] font-medium transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'
                    )}
                  >
                    <span className="text-[13px]">{tab.icon}</span>
                    <span className="flex-1">{tab.label}</span>
                    {count > 0 && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{
                          background: meta ? meta.color + '15' : 'hsl(var(--muted))',
                          color: meta ? meta.color : 'hsl(var(--muted-foreground))',
                        }}
                      >{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="px-3 pb-1.5">
        <div className="flex flex-wrap gap-1 text-[9px] text-muted-foreground/50">
          <span className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">Space</span><span>bellen</span>
          <span className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">Esc</span><span>ophangen</span>
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground text-[12px] py-6">Geen contacten in deze lijst</div>
        )}
        {filtered.map(comp => {
          const s = STAGE_META[comp.stage] || STAGE_META.nieuw;
          const isExpanded = expandedComp === comp.id;
          const isActiveComp = activeCompId === comp.id;
          return (
            <div key={comp.id} className="mb-px">
              <button
                onClick={() => setExpandedComp(isExpanded ? null : comp.id)}
                className={cn(
                  'flex items-center gap-2.5 w-full text-left px-3 py-2.5 transition-all',
                  isExpanded ? 'rounded-t-xl' : 'rounded-xl',
                  isActiveComp
                    ? 'border border-primary/30 bg-primary/[0.06] shadow-sm'
                    : isExpanded
                    ? 'border border-border bg-muted/30'
                    : 'border border-transparent hover:bg-muted/40'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-foreground/60 flex-shrink-0 border border-border">{comp.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-semibold text-[12px] truncate', isActiveComp ? 'text-foreground' : 'text-foreground/80')}>{comp.name}</div>
                  <div className="text-[10px] text-muted-foreground">{comp.contacts.length} {t.contacts}</div>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ background: s.color + '10', color: s.color, borderColor: s.color + '25' }}>{s.label}</span>
                <span className={cn('text-muted-foreground text-[9px] transition-transform', isExpanded && 'rotate-90')}>▶</span>
              </button>
              {isExpanded && (
                <div className="bg-muted/20 rounded-b-xl border border-border border-t-0 px-1.5 pb-1.5">
                  {comp.contacts.map(ct => {
                    const isSel = activeContactId === ct.id;
                    return (
                      <button
                        key={ct.id}
                        onClick={() => { if (phase !== 'idle' && phase !== 'precall' && activeContactId !== ct.id) { onBusy(); return; } onSelectContact(comp, ct); }}
                        className={cn(
                          'flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-lg mt-px transition-all',
                          isSel ? 'border border-primary/30 bg-primary/[0.08] shadow-sm' : 'border border-transparent hover:bg-muted/50'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                          isSel ? 'bg-primary text-white' : 'bg-muted text-muted-foreground border border-border'
                        )}>{ct.firstName[0]}{ct.lastName[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-[12px] font-semibold truncate', isSel ? 'text-foreground' : 'text-foreground/70')}>{ct.firstName} {ct.lastName}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {(() => {
          const totalLeads = companies.length;
          const actionedLeads = companies.filter(c => c.stage !== 'nieuw').length;
          const pct = totalLeads > 0 ? (actionedLeads / totalLeads) * 100 : 0;
          return hasMoreLeads && onLoadMore && pct >= 60 ? (
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="w-full py-2.5 mt-2 rounded-xl border border-primary/20 bg-primary/[0.05] text-primary text-[11px] font-semibold hover:bg-primary/10 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              {loadingMore ? 'Laden...' : `Volgende 25 laden → (${actionedLeads}/${totalLeads})`}
            </button>
          ) : null;
        })()}
      </div>

      {/* Activity log */}
      {scores.log.length > 0 && (
        <div className="border-t border-border max-h-[80px] overflow-y-auto px-3 py-1.5 bg-muted/20">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.activity}</div>
          {scores.log.slice(0, 4).map((e, i) => (
            <button
              key={i}
              onClick={() => onSelectFromLog?.(e.contact)}
              className="flex items-center gap-1.5 py-0.5 text-[10px] w-full text-left hover:bg-muted/50 rounded px-1 transition-colors cursor-pointer bg-transparent border-none"
            >
              <span className="text-muted-foreground w-8 text-[9px] tabular-nums">{e.time}</span>
              <span className="text-[11px]">{{ afspraak: '📅', enquete: '✅', verstuurd: '📨', afgevallen: '🚫', geenGehoor: '📵', callback: '🔔', gebeld: '📞' }[e.result]}</span>
              <span className="text-foreground/60 truncate">{e.contact}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
