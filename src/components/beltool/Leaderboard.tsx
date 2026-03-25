import { useState } from 'react';
import { Modal } from './Modal';
import { useBelTool } from '@/contexts/BelToolContext';
import { useTeamProfiles } from '@/hooks/useTeamProfiles';
import { useLeaderboardData } from '@/hooks/useLeaderboardData';
import { initScores } from '@/lib/beltool-scoring';
import { cn } from '@/lib/utils';

type Tab = 'team' | 'individual';

export function Leaderboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { allScores, t } = useBelTool();
  const { profiles } = useTeamProfiles();
  const { individuals, teams, loading } = useLeaderboardData();
  const [tab, setTab] = useState<Tab>('team');

  // Merge local scores with DB data for current-session accuracy
  const localRows = profiles.map(u => {
    const s = allScores[u.id] || initScores();
    return {
      ...u,
      ...s,
      orgName: u.organizationName || 'CliqMakers',
      conv: s.gebeld > 0 ? Math.round(((s.enquetes + s.afspraken) / s.gebeld) * 100) : 0,
    };
  }).sort((a, b) => (b.enquetes + b.afspraken) - (a.enquetes + a.afspraken));

  const teamHeaders = [t.rank, 'Organisatie', t.calls, t.surveys, t.appointments, t.conversion, 'Bellers'];
  const indivHeaders = [t.rank, t.name, 'Organisatie', t.calls, t.surveys, t.appointments, t.conversion];

  return (
    <Modal open={open} onClose={onClose} title="🏆 Competitie Scoreboard" wide>
      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setTab('team')}
          className={cn(
            'px-4 py-2 rounded-lg text-xs font-bold border transition-colors',
            tab === 'team' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          🏢 Teams
        </button>
        <button
          onClick={() => setTab('individual')}
          className={cn(
            'px-4 py-2 rounded-lg text-xs font-bold border transition-colors',
            tab === 'individual' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          👤 Individueel
        </button>
      </div>

      {loading && <div className="text-center text-muted-foreground/40 py-6 text-sm">Laden...</div>}

      {/* TEAM TAB */}
      {tab === 'team' && !loading && (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {teamHeaders.map(h => (
                <th key={h} className="px-2.5 py-2 text-left text-muted-foreground font-semibold text-[11px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              // Fallback: show local data grouped
              <tr className="border-b border-border/30">
                <td className="p-2.5 font-bold">🥇</td>
                <td className="p-2.5 font-semibold">CliqMakers</td>
                <td className="p-2.5 text-muted-foreground">{localRows.reduce((s, r) => s + r.gebeld, 0)}</td>
                <td className="p-2.5 text-primary font-semibold">{localRows.reduce((s, r) => s + r.enquetes, 0)}</td>
                <td className="p-2.5 text-success font-semibold">{localRows.reduce((s, r) => s + r.afspraken, 0)}</td>
                <td className="p-2.5 font-semibold" style={{ color: 'hsl(var(--success))' }}>
                  {(() => { const g = localRows.reduce((s, r) => s + r.gebeld, 0); const e = localRows.reduce((s, r) => s + r.enquetes + r.afspraken, 0); return g > 0 ? Math.round((e / g) * 100) : 0; })()}%
                </td>
                <td className="p-2.5 text-muted-foreground">{localRows.length}</td>
              </tr>
            ) : (
              teams.map((team, i) => (
                <tr key={team.orgId} className="border-b border-border/30">
                  <td className="p-2.5 font-bold" style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : undefined }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="p-2.5 font-semibold">{team.orgName}</td>
                  <td className="p-2.5 text-muted-foreground">{team.gebeld}</td>
                  <td className="p-2.5 text-primary font-semibold">{team.enquetes}</td>
                  <td className="p-2.5 text-success font-semibold">{team.afspraken}</td>
                  <td className="p-2.5 font-semibold" style={{ color: team.conv >= 50 ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>{team.conv}%</td>
                  <td className="p-2.5 text-muted-foreground">{team.memberCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* INDIVIDUAL TAB */}
      {tab === 'individual' && !loading && (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {indivHeaders.map(h => (
                <th key={h} className="px-2.5 py-2 text-left text-muted-foreground font-semibold text-[11px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(individuals.length > 0 ? individuals : localRows).map((r, i) => (
              <tr key={'userId' in r ? r.userId : r.id} className="border-b border-border/30">
                <td className="p-2.5 font-bold" style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : undefined }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </td>
                <td className="p-2.5 font-semibold">{'userName' in r ? r.userName : r.name}</td>
                <td className="p-2.5 text-muted-foreground text-[11px]">{'orgName' in r ? r.orgName : 'CliqMakers'}</td>
                <td className="p-2.5 text-muted-foreground">{r.gebeld}</td>
                <td className="p-2.5 text-primary font-semibold">{r.enquetes}</td>
                <td className="p-2.5 text-success font-semibold">{r.afspraken}</td>
                <td className="p-2.5 font-semibold" style={{ color: r.conv >= 50 ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>{r.conv}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
