import { supabase } from '@/integrations/supabase/client';
export async function publicBooking(action:string,params:Record<string,unknown>={}){
  const {data,error}=await supabase.functions.invoke('public-booking',{body:{action,...params}});
  if(error){let msg='Verzoek opslaan of ophalen mislukt';try{const body=await error.context?.json();if(body?.error)msg=body.error;}catch{}throw new Error(msg);}
  if(data?.error)throw new Error(data.error);
  return data;
}