import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Company, CompanyContact, CallPhase, CompanyStage } from '@/types/beltool';
import { STAGE_META } from '@/types/beltool';
import { useBelTool } from '@/contexts/BelToolContext';
import type { Scores } from '@/lib/beltool-scoring';
import type { User } from '@/lib/beltool-data';

const FILTER_TABS: { key: CompanyStage | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'Alles', icon: '📋' },
  { key: 'nieuw', label: 'Nieuw', icon: '🆕' },
  { key: 'terugbellenGepland', label: 'Terugbellen', icon: '🔔' },
  { key: 'geenGehoor', label: 'Geen gehoor', icon: '📵' },
  { key: 'enqueteVerstuurd', label: 'Verstuurd', icon: '📨' },
  { key: 'afspraak', label: 'Afspraak', icon: '📅' },
  { key: 'nietInteressant', label: 'Afgevallen', icon: '🚫' },
];

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
}

export function ContactSidebar({ companies, activeCompId, activeContactId, expandedComp, setExpandedComp, search, onSearchChange, onSelectContact, phase, onBusy, scores, convRate, user, onLogout, onShowAgenda, onShowCallbackQueue, onShowLeaderboard, onShowSettings, dueCallbackCount, appointmentCount, hasMoreLeads, loadingMore, onLoadMore, stageFilter, onStageFilterChange, onSelectFromLog }: ContactSidebarProps) {
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

  const stageFiltered = stageFilter === 'all' ? companies : companies.filter(c => c.stage === stageFilter);
  const filtered = stageFiltered.filter(c => (c.name + ' ' + c.contacts.map(ct => ct.firstName + ' ' + ct.lastName).join(' ')).toLowerCase().includes(search.toLowerCase()));

  const stageCounts: Record<string, number> = {};
  for (const tab of FILTER_TABS) {
    stageCounts[tab.key] = tab.key === 'all' ? companies.length : companies.filter(c => c.stage === tab.key).length;
  }

  return (
    <div className="w-[280px] border-r border-border flex flex-col flex-shrink-0 bg-card">
      <div className="px-3 pt-3 pb-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1">
            <div className="text-[14px] font-bold tracking-tight text-foreground">Bel-Tool</div>
          </div>
          <div className="flex gap-1">
            <button onClick={onShowAgenda} className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[13px] transition-colors border', appointmentCount > 0 ? 'text-primary bg-primary/10 border-primary/20' : 'text-muted-foreground border-transparent hover:bg-muted')} title={t.agenda}>📅</button>
            <button onClick={onShowCallbackQueue} className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] relative transition-colors border border-transparent hover:bg-muted" style={{ color: dueCallbackCount > 0 ? 'hsl(38 92% 50%)' : undefined }}>🔔{dueCallbackCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-destructive text-white text-[7px] font-bold flex items-center justify-center">{dueCallbackCount}</span>}</button>
            <button onClick={onShowLeaderboard} className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] text-muted-foreground border border-transparent hover:bg-muted transition-colors">🏆</button>
          </div>
        </div>

        {/* User pill */}
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/50 mb-2.5 border border-border">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[9px] font-extrabold text-white">{user.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-foreground truncate">{user.name}</div>
          </div>
          <button onClick={onLogout} className="text-muted-foreground text-[10px] hover:text-foreground transition-colors">↗</button>
        </div>

        {/* Stats */}
        <div className="bg-card border border-border rounded-xl p-2.5 mb-2.5 shadow-cliq">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t.today}</span>
            {scores.reeks >= 2 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">🔥{scores.reeks}x</span>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: t.called, value: scores.gebeld, color: 'hsl(var(--navy))' },
              { label: t.surveys, value: scores.enquetes, color: 'hsl(var(--primary))' },
              { label: t.appointments, value: scores.afspraken, color: 'hsl(var(--success))' },
            ].map(s => (
              <div key={s.label} className="text-center py-1.5 rounded-lg bg-muted/50 border border-border">
                <div className="text-lg font-extrabold leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] font-medium text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {scores.gebeld > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-[3px] rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${convRate}%` }} />
              </div>
              <span className="text-[10px] font-bold" style={{ color: convRate >= 50 ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>{convRate}%</span>
            </div>
          )}
        </div>

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
