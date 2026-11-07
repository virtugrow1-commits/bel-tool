import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { authorize,AccessError } from '../_shared/auth.ts';
import { organizationCliq } from '../_shared/cliq.ts';
const schema=z.object({requestId:z.string().uuid(),contactId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),companyId:z.string().max(150),companyName:z.string().max(150),contactName:z.string().max(150),phone:z.string().max(30).regex(/^[+0-9 ().-]*$/),result:z.enum(['bereikt','geenGehoor','voicemail','terugbellenGepland','afspraak','nietInteressant','nietBellen','enqueteTel','enqueteVerstuurd','anderMoment']),durationSeconds:z.number().int().min(0).max(86400),notes:z.string().max(5000),callback:z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),time:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),note:z.string().max(2000)}).optional()}).strict();
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
  try{
    const {db,user,organizationId}=await authorize(req);
    const i=schema.parse(await req.json());
    const {contact}=await organizationCliq(organizationId);await contact(i.contactId);
    const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!key)throw new Error('Serverconfiguratie ontbreekt');
    const client=createClient(url,key,{global:{headers:{Authorization:req.headers.get('Authorization') || ''}},auth:{persistSession:false}});
    let phone=i.phone.replace(/[ ().-]/g,'');if(phone.startsWith('0'))phone='+31'+phone.slice(1);
    const {data:sid,error}=await client.rpc('save_call_result',{p_request:i.requestId,p_contact:i.contactId,p_company:i.companyId,p_company_name:i.companyName,p_contact_name:i.contactName,p_phone:phone,p_result:i.result,p_duration:i.durationSeconds,p_notes:i.notes,p_callback:i.callback || null});
    if(error || !sid)return reply({error:'Uitkomst opslaan mislukt. Je contact blijft geopend; probeer opnieuw.'},500);
    const {data:stored}=await db.from('call_sessions').select('ghl_synced').eq('id',sid).eq('organization_id',organizationId).single();
    if(stored?.ghl_synced)return reply({success:true,sessionId:sid});
    const {data:profile}=await db.from('profiles').select('name').eq('auth_user_id',user.id).single();
    try{
      const invoke=async(body:unknown)=>{const res=await fetch(`${url}/functions/v1/ghl-proxy`,{method:'POST',headers:{Authorization:req.headers.get('Authorization') || '',apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await res.json();if(!res.ok || result.success===false || result.error)throw new Error('CLIQ-synchronisatie mislukt');return result;};
      if(i.result==='nietBellen')await invoke({action:'addTag',contactId:i.contactId,tags:['beltool-niet-bellen','DNC']});
      await invoke({action:'logCallActivity',contactId:i.contactId,result:i.result,resultLabel:i.result,durationSeconds:i.durationSeconds,callerName:profile?.name || '',notes:i.notes});
      const {error:update}=await db.from('call_sessions').update({ghl_synced:true,sync_error:null}).eq('id',sid);if(update)throw update;
      return reply({success:true,sessionId:sid});
    }catch{
      await db.from('call_sessions').update({sync_error:'CLIQ notitie/tag niet opgeslagen'}).eq('id',sid);
      return reply({error:'Gesprek is opgeslagen, maar CLIQ-notitie/tag ontbreekt. Probeer opnieuw; de beluitkomst wordt niet dubbel opgeslagen.',saved:true,sessionId:sid},502);
    }
  }catch(e){return reply({error:e instanceof z.ZodError?'Controleer de uitkomstgegevens':e instanceof AccessError?e.message:e instanceof Error?e.message:'Opslaan mislukt'},e instanceof AccessError?e.status:400);}
});