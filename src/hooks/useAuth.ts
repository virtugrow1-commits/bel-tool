import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/lib/beltool-data';
import { store, setStoreScope } from '@/lib/beltool-store';

export function useAuth() {
  const [user,setUser]=useState<User | null>(null);
  const [session,setSession]=useState<Session | null>(null);
  const [loading,setLoading]=useState(true);
  const loadUser=useCallback(async()=>{
    const {data:{user:identity},error}=await supabase.auth.getUser();
    if(error || !identity){setStoreScope();setUser(null);setLoading(false);return null;}
    const {data:profile}=await supabase.from('profiles').select('*').eq('auth_user_id',identity.id).maybeSingle();
    const {data:grant}=await supabase.from('user_roles').select('role').eq('user_id',identity.id).maybeSingle();
    if(!profile?.organization_id || !grant){setUser(null);setLoading(false);return null;}
    const resolved: User={id:profile.id,name:profile.name,email:profile.email,role:grant.role as User['role'],avatar:profile.avatar || profile.name.slice(0,2),deviceId:profile.device_id || '',voipzekerExtension:profile.voipzeker_extension || '',organizationId:profile.organization_id};
    setStoreScope(profile.organization_id);setUser(resolved);setLoading(false);return resolved;
  },[]);
  useEffect(()=>{
    store.del('user');store.del('managedUsers');store.del('apiKey');
    let alive=true;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{
      if(!alive)return;
      setSession(next);
      if(!next){setStoreScope();setUser(null);setLoading(false);return;}
      setLoading(true);
      // Avoid nested Auth API calls while the session listener holds its lock.
      setTimeout(()=>{if(alive)void loadUser();},0);
    });
    void supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);if(data.session)void loadUser();else setLoading(false);}});
    return ()=>{alive=false;subscription.unsubscribe();};
  },[loadUser]);
  const login=useCallback(async(email:string,password:string)=>{
    setLoading(true);
    const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
    if(error){setLoading(false);return {error:'E-mailadres of wachtwoord is onjuist.'};}
    const employee=await loadUser();
    if(!employee){await supabase.auth.signOut();return {error:'Dit account heeft geen toegang tot de beltool.'};}
    return {};
  },[loadUser]);
  const logout=useCallback(async()=>{await supabase.auth.signOut();setUser(null);setSession(null);store.del('user');},[]);
  const resetPassword=useCallback(async(email:string)=>{
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:`${window.location.origin}/reset-password`});
    return error?{error:'Resetmail kon niet worden verstuurd. Probeer later opnieuw.'}:{};
  },[]);
  return {user,session,loading,authMode:'email' as const,login,logout,resetPassword};
}
