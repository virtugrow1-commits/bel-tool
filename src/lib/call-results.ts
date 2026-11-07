import { supabase } from '@/integrations/supabase/client';
export async function saveCallResult(payload:Record<string,unknown>){
  const {data,error}=await supabase.functions.invoke('call-result',{body:payload});
  if(error){let message='Gesprek opslaan mislukt. Probeer opnieuw.';try{const result=await error.context?.json();if(result?.error)message=result.error;}catch{}throw new Error(message);}
  if(data?.error)throw new Error(data.error);
  return data;
}