import { Modal } from './Modal';
import { useBelTool } from '@/contexts/BelToolContext';
import { USERS } from '@/lib/beltool-data';
import { initScores } from '@/lib/beltool-scoring';

export function Leaderboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { allScores, t } = useBelTool();

  const rows = USERS.map(u => {
    const s = allScores[u.id] || initScores();
    return {
      ...u,
      ...s,
      conv: s.gebeld > 0 ? Math.round(((s.enquetes + s.afspraken) / s.gebeld) * 100) : 0,
    };
  }).sort((a, b) => (b.enquetes + b.afspraken) - (a.enquetes + a.afspraken));

  const headers = [t.rank, t.name, t.calls, t.surveys, t.appointments, t.conversion];

  return (
    <Modal open={open} onClose={onClose} title={t.leaderboard} wide>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {headers.map(h => (
              <th key={h} className="px-2.5 py-2 text-left text-muted-foreground font-semibold text-[11px]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b border-border/30">
              <td className="p-2.5 font-bold" style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : undefined }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </td>
              <td className="p-2.5 font-semibold">{r.name}</td>
              <td className="p-2.5 text-muted-foreground">{r.gebeld}</td>
              <td className="p-2.5 text-primary font-semibold">{r.enquetes}</td>
              <td className="p-2.5 text-success font-semibold">{r.afspraken}</td>
              <td className="p-2.5 font-semibold" style={{ color: r.conv >= 50 ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>{r.conv}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
