import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Organization } from '@/lib/beltool-data';
export function useOrganizations(){
  const [organizations,setOrganizations]=useState<Organization[]>([]);
  const [loading,setLoading]=useState(true);
  const fetchOrgs=useCallback(async()=>{
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setOrganizations([]);setLoading(false);return;}
    const {data,error}=await supabase.rpc('safe_organizations');
    setOrganizations(error?[]:(data || []).map(row=>({id:row.id,name:row.name,slug:'',voipzeker_outbound_number:row.voipzeker_outbound_number || undefined,has_ghl_key:row.has_ghl_key,voipzeker_connected:row.voipzeker_connected})));
    setLoading(false);
  },[]);
  useEffect(()=>{void fetchOrgs();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>void fetchOrgs(),0);});return ()=>subscription.unsubscribe();},[fetchOrgs]);
  const createOrg=useCallback(async(_org:unknown)=>{throw new Error('Je mag alleen je eigen organisatie beheren.');},[]);
  const updateOrg=useCallback(async(id:string,updates:Partial<Organization>)=>{
    const {data,error}=await supabase.functions.invoke('organization-settings',{body:{organizationId:id,updates}});
    if(error || data?.error)throw new Error(data?.error || 'Instellingen opslaan mislukt');
    await fetchOrgs();
  },[fetchOrgs]);
  return {organizations,loading,refresh:fetchOrgs,createOrg,updateOrg};
}
