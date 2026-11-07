import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { authorize, AccessError } from '../_shared/auth.ts';
const fields=z.object({ name:z.string().trim().min(1).max(150).optional(),brand_name:z.string().max(150).optional(),enquete_link:z.string().url().optional(),booking_link:z.string().url().optional(),ghl_api_key:z.string().trim().min(1).max(500).optional(),ghl_location_id:z.string().trim().min(1).max(100).optional(),voipzeker_outbound_number:z.string().trim().max(100).optional(),shared_settings:z.object({surveyConfig:z.record(z.unknown()).optional(),cliqConfig:z.object({pipelineId:z.string().max(100).optional(),calendarId:z.string().max(100).optional(),syncContacts:z.boolean().optional(),syncOpportunities:z.boolean().optional(),syncAppointments:z.boolean().optional(),createNotes:z.boolean().optional(),apiKey:z.literal('').optional(),locationId:z.literal('').optional()}).optional(),webhooks:z.array(z.object({url:z.string().url().max(500),active:z.boolean()}).passthrough()).max(20).optional()}).strict().refine(v=>JSON.stringify(v).length<200_000,'Te groot').optional() }).strict();
Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  let status=200; let result: unknown;
  try {
    const input=z.object({organizationId:z.string().uuid().optional(),updates:fields}).parse(await req.json());
    const {db,organizationId}=await authorize(req,input.organizationId,true);
    const {error}=await db.from('organizations').update(input.updates).eq('id',organizationId);
    if(error) throw error;
    result={success:true};
  }catch(e){status=e instanceof AccessError?e.status:400;result={error:e instanceof AccessError?e.message:'Ongeldige instellingen of opslaan mislukt'};}
  return new Response(JSON.stringify(result),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
});