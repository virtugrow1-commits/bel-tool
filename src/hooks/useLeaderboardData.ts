import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [individuals, setIndividuals] = useState<LeaderboardRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch today's scores with profile + org info
      const { data: scores, error: scoresErr } = await (supabase as any)
        .from('user_scores')
        .select('*')
        .eq('score_date', TODAY);

      const { data: profiles, error: profilesErr } = await (supabase as any)
        .from('profiles')
        .select('id, name, organization_id');

      const { data: orgs, error: orgsErr } = await (supabase as any)
        .from('organizations')
        .select('id, name, logo_url');

      if (scoresErr || profilesErr || orgsErr) {
        console.warn('[Leaderboard] Fetch error');
        setLoading(false);
        return;
      }

      const orgMap = new Map((orgs || []).map((o: any) => [o.id, o]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Build individual rows
      const indivRows: LeaderboardRow[] = (scores || []).map((s: any) => {
        const profile = profileMap.get(s.user_id) as any;
        const org = profile ? orgMap.get(profile.organization_id) as any : null;
        return {
          userId: s.user_id,
          userName: profile?.name || s.user_id,
          orgId: org?.id || '',
          orgName: org?.name || 'Onbekend',
          gebeld: s.gebeld || 0,
          enquetes: s.enquetes || 0,
          afspraken: s.afspraken || 0,
          verstuurd: s.verstuurd || 0,
          conv: s.gebeld > 0 ? Math.round(((s.enquetes + s.afspraken) / s.gebeld) * 100) : 0,
        };
      }).sort((a: LeaderboardRow, b: LeaderboardRow) => (b.enquetes + b.afspraken) - (a.enquetes + a.afspraken));

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
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { individuals, teams, loading, refresh: fetch };
}
