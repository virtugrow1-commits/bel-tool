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
  onShowSettings: () => void;
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

  const stageFiltered = stageFilter === 'all' ? companies : companies.filter(c => c.stage === stageFilter);
  const filtered = stageFiltered.filter(c => (c.name + ' ' + c.contacts.map(ct => ct.firstName + ' ' + ct.lastName).join(' ')).toLowerCase().includes(search.toLowerCase()));

  // Count per stage for badge
  const stageCounts: Record<string, number> = {};
  for (const tab of FILTER_TABS) {
    stageCounts[tab.key] = tab.key === 'all' ? companies.length : companies.filter(c => c.stage === tab.key).length;
  }

  return (
    <div className="w-[290px] border-r border-border flex flex-col flex-shrink-0" style={{ background: 'hsl(222 32% 8%)' }}>
      <div className="px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1">
            <div className="text-sm font-extrabold tracking-tight">Bel-Tool</div>
          </div>
          <div className="flex gap-0.5">
            <button onClick={onShowAgenda} className={cn('bg-transparent border-none text-[15px] cursor-pointer', appointmentCount > 0 ? 'text-primary' : 'text-muted-foreground/20')} title={t.agenda}>📅</button>
            <button onClick={onShowCallbackQueue} className="bg-transparent border-none text-[15px] relative cursor-pointer" style={{ color: dueCallbackCount > 0 ? 'hsl(38 92% 50%)' : undefined }}>🔔{dueCallbackCount > 0 && <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-destructive text-white text-[8px] font-bold flex items-center justify-center">{dueCallbackCount}</span>}</button>
            <button onClick={onShowLeaderboard} className="bg-transparent border-none text-muted-foreground/20 text-[15px] cursor-pointer">🏆</button>
            <button onClick={onShowSettings} className="bg-transparent border-none text-muted-foreground/20 text-[15px] cursor-pointer">⚙️</button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-foreground/[0.03] mb-2.5 border border-border/40">
          <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center text-[9px] font-extrabold text-white">{user.avatar}</div>
          <div className="flex-1 text-xs font-semibold">{user.name}</div>
          <button onClick={onLogout} className="bg-transparent border-none text-muted-foreground/30 text-xs cursor-pointer">↗</button>
        </div>
        <div className="bg-foreground/[0.02] border border-border/40 rounded-xl p-2.5 mb-2.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold text-muted-foreground/30 tracking-[1.5px]">{t.today}</span>
            {scores.reeks >= 2 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/15">🔥 {scores.reeks}x</span>}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[{ label: t.called, value: scores.gebeld, color: 'rgba(255,255,255,0.4)' },{ label: t.surveys, value: scores.enquetes, color: 'hsl(174 100% 38%)' },{ label: t.appointments, value: scores.afspraken, color: 'hsl(152 56% 42%)' }].map(s => (
              <div key={s.label} className="text-center p-1.5 rounded-lg" style={{ background: s.color + '10', border: `1px solid ${s.color}20` }}>
                <div className="text-xl font-extrabold leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] font-semibold text-muted-foreground/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {scores.gebeld > 0 && <div className="mt-1.5 flex items-center gap-1.5"><div className="flex-1 h-[3px] rounded-full bg-foreground/[0.05] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-info to-primary transition-[width] duration-500" style={{ width: `${convRate}%` }} /></div><span className="text-[10px] font-bold" style={{ color: convRate >= 50 ? 'hsl(152 56% 42%)' : 'hsl(38 92% 50%)' }}>{convRate}%</span></div>}
        </div>
        <input placeholder={t.search} value={search} onChange={e => onSearchChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-foreground/[0.04] text-foreground text-[13px] outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary mb-2" />

        {/* Stage filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map(tab => {
            const count = stageCounts[tab.key];
            const isActive = stageFilter === tab.key;
            const meta = tab.key !== 'all' ? STAGE_META[tab.key] : null;
            return (
              <button
                key={tab.key}
                onClick={() => onStageFilterChange(tab.key)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all border flex-shrink-0',
                  isActive
                    ? 'border-primary/40 bg-primary/[0.12] text-primary'
                    : 'border-transparent bg-foreground/[0.03] text-muted-foreground/40 hover:bg-foreground/[0.06]'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{
                      background: isActive ? 'hsl(var(--primary) / 0.2)' : meta ? meta.color + '20' : 'rgba(255,255,255,0.06)',
                      color: isActive ? 'hsl(var(--primary))' : meta ? meta.color : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5">
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground/30 text-[12px] py-6">Geen contacten in deze lijst</div>
        )}
        {filtered.map(comp => {
          const s = STAGE_META[comp.stage] || STAGE_META.nieuw;
          const isExpanded = expandedComp === comp.id;
          const isActiveComp = activeCompId === comp.id;
          return (
            <div key={comp.id} className="mb-0.5">
              <button onClick={() => setExpandedComp(isExpanded ? null : comp.id)} className={cn('flex items-center gap-2 w-full text-left px-3 py-2.5 transition-all', isExpanded ? 'rounded-t-xl' : 'rounded-xl', isActiveComp ? 'border border-primary/30 bg-primary/[0.06]' : isExpanded ? 'border border-transparent bg-foreground/[0.03]' : 'border border-transparent')}>
                <div className="w-[30px] h-[30px] rounded-lg bg-foreground/[0.04] flex items-center justify-center text-xs font-bold text-muted-foreground/40 flex-shrink-0">{comp.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-semibold text-[12.5px] truncate', isActiveComp ? 'text-foreground' : 'text-foreground/75')}>{comp.name}</div>
                  <div className="text-[10px] text-muted-foreground/30">{comp.industry ? `${comp.industry} • ` : ''}{comp.contacts.length} {t.contacts}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.color + '15', color: s.color }}>{s.label}</span>
                <span className={cn('text-muted-foreground/20 text-[10px] transition-transform', isExpanded && 'rotate-90')}>▶</span>
              </button>
              {isExpanded && (
                <div className="bg-foreground/[0.02] rounded-b-xl border border-border/30 border-t-0 px-1.5 pb-1.5">
                  {comp.contacts.map(ct => {
                    const isSel = activeContactId === ct.id;
                    return (
                      <button key={ct.id} onClick={() => { if (phase !== 'idle' && phase !== 'precall' && activeContactId !== ct.id) { onBusy(); return; } onSelectContact(comp, ct); }} className={cn('flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg mt-0.5 transition-all', isSel ? 'border border-primary/40 bg-primary/[0.08]' : 'border border-transparent')}>
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0', isSel ? 'bg-gradient-to-br from-info to-primary text-white' : 'bg-foreground/[0.06] text-muted-foreground/40')}>{ct.firstName[0]}{ct.lastName[0]}</div>
                        <div className="flex-1">
                          <div className={cn('text-xs font-semibold', isSel ? 'text-foreground' : 'text-foreground/60')}>{ct.firstName} {ct.lastName}</div>
                          <div className="text-[10px] text-muted-foreground/30">{ct.role}</div>
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
              className="w-full py-2.5 mt-3 rounded-lg border border-primary/20 bg-primary/[0.06] text-primary text-[12px] font-semibold hover:bg-primary/10 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              {loadingMore ? 'Laden...' : `Volgende 25 leads laden → (${actionedLeads}/${totalLeads} afgewerkt)`}
            </button>
          ) : null;
        })()}
      </div>
      {scores.log.length > 0 && (
        <div className="border-t border-border/30 max-h-[100px] overflow-y-auto px-3 py-1.5">
          <div className="text-[9px] font-bold text-muted-foreground/20 tracking-[1.5px] mb-1">{t.activity}</div>
          {scores.log.slice(0, 5).map((e, i) => (
            <button
              key={i}
              onClick={() => onSelectFromLog?.(e.contact)}
              className="flex items-center gap-1 py-0.5 text-[10px] w-full text-left hover:bg-foreground/[0.04] rounded px-1 transition-colors cursor-pointer bg-transparent border-none"
            >
              <span className="text-muted-foreground/20 w-8">{e.time}</span>
              <span>{{ afspraak: '📅', enquete: '✅', verstuurd: '📨', afgevallen: '🚫', geenGehoor: '📵', callback: '🔔', gebeld: '📞' }[e.result]}</span>
              <span className="text-muted-foreground/40 truncate">{e.contact}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
