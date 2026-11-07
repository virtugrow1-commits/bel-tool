import { summarizeResults } from '@/lib/result-summary';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LeaderboardRow {
  userId: string;
  userName: string;
  orgId: string;
  orgName: string;
  gebeld: number;
  enquetes: number;
  afspraken: number;
  verstuurd: number;
  conv: number;
}

export interface TeamRow {
  orgId: string;
  orgName: string;
  logoUrl?: string;
  gebeld: number;
  enquetes: number;
  afspraken: number;
  verstuurd: number;
  conv: number;
  memberCount: number;
}

const TODAY = new Date().toISOString().split('T')[0];

export function useLeaderboardData() {
  const { user } = useAuth();
  const [individuals, setIndividuals] = useState<LeaderboardRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setIndividuals([]); setTeams([]); setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch today's scores with profile + org info
      const { data: scores, error: scoresErr } = await (supabase as any)
        .from('call_sessions')
        .select('caller_id,caller_name,result,source,organization_id')
        .gte('started_at', new Date().toISOString().slice(0,10)+'T00:00:00+01:00');

      const { data: profiles, error: profilesErr } = await (supabase as any)
        .from('profiles')
        .select('id, name, organization_id');

      const { data: orgs, error: orgsErr } = await (supabase as any)
        .rpc('safe_organizations');

      if (scoresErr || profilesErr || orgsErr) {
        console.warn('[Leaderboard] Fetch error');
        setLoading(false);
        return;
      }

      const orgMap = new Map((orgs || []).map((o: any) => [o.id, o]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const grouped=new Map<string,any[]>();
      for(const row of scores || []){if(!row.caller_id)continue;grouped.set(row.caller_id,[...(grouped.get(row.caller_id)||[]),row]);}
      const indivRows:LeaderboardRow[]=Array.from(grouped.entries()).map(([userId,rows])=>{
        const totals=summarizeResults(rows);const org=orgMap.get(rows[0].organization_id) as any;
        return {userId,userName:rows[0].caller_name,orgId:org?.id || '',orgName:org?.name || '',...totals,conv:totals.gebeld?Math.round((totals.enquetes+totals.afspraken)/totals.gebeld*100):0};
      });

      setIndividuals(indivRows);

      // Build team rows
      const teamMap = new Map<string, TeamRow>();
      for (const row of indivRows) {
        if (!row.orgId) continue;
        const existing = teamMap.get(row.orgId);
        if (existing) {
          existing.gebeld += row.gebeld;
          existing.enquetes += row.enquetes;
          existing.afspraken += row.afspraken;
          existing.verstuurd += row.verstuurd;
          existing.memberCount += 1;
        } else {
          const org = orgMap.get(row.orgId) as any;
          teamMap.set(row.orgId, {
            orgId: row.orgId,
            orgName: row.orgName,
            logoUrl: org?.logo_url,
            gebeld: row.gebeld,
            enquetes: row.enquetes,
            afspraken: row.afspraken,
            verstuurd: row.verstuurd,
            conv: 0,
            memberCount: 1,
          });
        }
      }
      // Calc team conv
      for (const team of teamMap.values()) {
        team.conv = team.gebeld > 0 ? Math.round(((team.enquetes + team.afspraken) / team.gebeld) * 100) : 0;
      }

      setTeams(
        Array.from(teamMap.values()).sort((a, b) => (b.enquetes + b.afspraken) - (a.enquetes + a.afspraken))
      );
    } catch (err) {
      console.warn('[Leaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetch(); }, [fetch]);

  return { individuals, teams, loading, refresh: fetch };
}
