import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Company, CompanyContact, CallPhase, CompanyStage, CallbackEntry } from '@/types/beltool';
import { STAGE_META } from '@/types/beltool';
import { useBelTool } from '@/contexts/BelToolContext';
import type { Scores } from '@/lib/beltool-scoring';
import type { User } from '@/lib/beltool-data';
import { store } from '@/lib/beltool-store';
import { CliqErrorBanner } from './CliqErrorBanner';
import { ContactSkeleton } from './Skeletons';
import { DarkModeToggle } from './DarkModeToggle';
import { DailyProgress } from './DailyProgress';
import { ConnectionStatus } from './ConnectionStatus';
import { smartSort } from '@/lib/smart-queue';

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

// DailyTargets type for target state

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
  onSelectFromLog?: (entry: { contact: string; contactId?: string; companyId?: string }) => void;
  onInsertNote?: (text: string) => void;
  cliqError?: string | null;
  onRetryCliq?: () => void;
  theme?: 'light' | 'dark' | 'system';
  onThemeChange?: (t: 'light' | 'dark' | 'system') => void;
  onShowRapportage?: () => void;
  onShowSurveyResults?: () => void;
  callbacks?: CallbackEntry[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export function ContactSidebar({ companies, activeCompId, activeContactId, expandedComp, setExpandedComp, search, onSearchChange, onSelectContact, phase, onBusy, scores, convRate, user, onLogout, onShowAgenda, onShowCallbackQueue, onShowLeaderboard, onShowSettings, dueCallbackCount, appointmentCount, hasMoreLeads, loadingMore, onLoadMore, stageFilter, onStageFilterChange, onSelectFromLog, onInsertNote, cliqError, onRetryCliq, theme, onThemeChange, onShowRapportage, onShowSurveyResults, callbacks, soundEnabled, onToggleSound }: ContactSidebarProps) {
  const { t } = useBelTool();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Data is already filtered from CLIQ API by stage, so no local stage filtering needed
  const searched = companies.filter(c => (c.name + ' ' + c.contacts.map(ct => ct.firstName + ' ' + ct.lastName).join(' ')).toLowerCase().includes(search.toLowerCase()));
  const filtered = smartSort(searched, callbacks || []);

  const stageCounts: Record<string, number> = {};
  for (const tab of FILTER_TABS) {
    // Show total loaded count for the active filter, no local counting needed
    stageCounts[tab.key] = tab.key === stageFilter ? companies.length : (tab.key === 'all' ? companies.length : 0);
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
    <div className="w-[280px] h-full border-r border-border flex flex-col flex-shrink-0 bg-card overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        {/* Row 1: Action icons */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1" />
          <div className="flex gap-0.5">
            {[
              { fn: onShowAgenda, icon: '📅', active: appointmentCount > 0, title: t.agenda },
              { fn: onShowCallbackQueue, icon: '🔔', badge: dueCallbackCount, title: 'Callbacks' },
              { fn: onShowLeaderboard, icon: '🏆', title: 'Leaderboard' },
              { fn: onShowRapportage, icon: '📊', title: 'Rapportage' },
              { fn: onShowSurveyResults, icon: '📋', title: 'Enquête inzendingen' },
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

        {/* Row 2: User */}
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/40 border border-border">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[8px] font-extrabold text-white flex-shrink-0">{user.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-foreground truncate">{user.name}</div>
          </div>
          {theme && onThemeChange && <DarkModeToggle theme={theme} onChange={onThemeChange} compact />}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] text-muted-foreground hover:bg-muted transition-colors"
              title={soundEnabled ? 'Geluid uit' : 'Geluid aan'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          )}
          <button onClick={onLogout} className="text-muted-foreground text-[10px] hover:text-foreground transition-colors" title="Uitloggen">↗</button>
        </div>

        {/* Best call time tip (compact) */}
        {callTimeTip && (
          <div className="px-2.5 py-1.5 rounded-lg bg-primary/[0.06] border border-primary/15 mb-2 text-[10px] font-medium text-primary">
            {callTimeTip}
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

      {/* Daily progress rings */}
      <div className="shrink-0">
        <DailyProgress scores={scores} />
      </div>

      {/* Connection status */}
      <div className="px-3 pb-2 shrink-0">
        <ConnectionStatus />
      </div>

      {/* Contact list — scrollable */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {cliqError && onRetryCliq && (
          <CliqErrorBanner error={cliqError} loading={!!loadingMore} onRetry={onRetryCliq} />
        )}
        {!cliqError && loadingMore && filtered.length === 0 && (
          <ContactSkeleton count={6} />
        )}
        {!loadingMore && filtered.length === 0 && !cliqError && (
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
                        onClick={() => {
                          const canSwitch = phase === 'idle' || phase === 'precall' || phase === 'intro'
                            || ['sent', 'done', 'lost', 'noanswer'].includes(phase);
                          if (!canSwitch && activeContactId !== ct.id) { onBusy(); return; }
                          onSelectContact(comp, ct);
                        }}
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

      {/* Activity log — fixed height at bottom, independently scrollable */}
      {scores.log.length > 0 && (
        <div className="border-t border-border flex flex-col shrink-0 bg-muted/20" style={{ height: '180px' }}>
          <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t.activity} ({scores.log.length})</div>
          </div>
          <div className="overflow-y-auto px-2 pb-2 flex-1 min-h-0">
            {scores.log.map((e, i) => (
              <button
                key={i}
                onClick={() => onSelectFromLog?.(e)}
                className="flex items-center gap-2 py-1.5 px-2 text-[11px] w-full text-left hover:bg-primary/[0.08] rounded-lg transition-colors cursor-pointer bg-transparent border-none group active:scale-[0.98]"
                title={`Klik om ${e.contact} te selecteren en terug te bellen`}
              >
                <span className="text-muted-foreground w-9 text-[10px] font-mono tabular-nums shrink-0">{e.time}</span>
                <span className="text-[13px] shrink-0">{{ afspraak: '📅', enquete: '✅', verstuurd: '📨', afgevallen: '🚫', geenGehoor: '📵', callback: '🔔', gebeld: '📞' }[e.result] || '📞'}</span>
                <span className="text-foreground/70 truncate group-hover:text-primary font-medium transition-colors">{e.contact || 'Onbekend'}</span>
                <span className="ml-auto text-[9px] text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">↗ bel</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
