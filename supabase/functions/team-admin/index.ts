import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { authorize, AccessError } from '../_shared/auth.ts';
const schema = z.object({ action: z.enum(['invite','update']), organizationId: z.string().uuid().optional(), profileId: z.string().uuid().optional(), name: z.string().trim().min(1).max(150).optional(), email: z.string().trim().email().optional(), role: z.enum(['admin','manager','caller']).optional(), avatar: z.string().max(20).optional(), voipzekerExtension: z.string().trim().max(100).optional() });
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req => {
  if (req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  try {
    const input=schema.parse(await req.json());
    const {db,organizationId,user}=await authorize(req,input.organizationId,true);
    if(input.action==='invite') {
      if(!input.name || !input.email || !input.role) return reply({error:'Naam, e-mail en rol zijn verplicht'},400);
      const email=input.email.toLowerCase();
      const {data: profile,error}=await db.from('profiles').insert({name:input.name,email,role:input.role,organization_id:organizationId,voipzeker_extension:input.voipzekerExtension || null,avatar:input.name.slice(0,2).toUpperCase()}).select('id').single();
      if(error || !profile) return reply({error: error?.message || 'Profiel aanmaken mislukt'},400);
      const {error: inviteError}=await db.auth.admin.inviteUserByEmail(email,{redirectTo:'https://bel-tool.lovable.app/reset-password'});
      if(inviteError) { await db.from('profiles').delete().eq('id',profile.id).is('auth_user_id',null); return reply({error:'Uitnodiging versturen mislukt. Probeer opnieuw.'},400); }
      return reply({success:true});
    }
    if(!input.profileId) return reply({error:'Profiel ontbreekt'},400);
    const {data: target}=await db.from('profiles').select('id,auth_user_id,email').eq('id',input.profileId).eq('organization_id',organizationId).single();
    if(!target) return reply({error:'Medewerker niet gevonden'},404);
    if(target.auth_user_id===user.id && input.role && input.role!=='admin') return reply({error:'Je kunt je eigen beheerdersrol niet verwijderen'},400);
    if(input.email && input.email.toLowerCase()!==target.email.toLowerCase()) return reply({error:'Het inlogadres kan hier niet gewijzigd worden'},400);
    const {error}=await db.from('profiles').update({...(input.name?{name:input.name}:{}),...(input.avatar?{avatar:input.avatar}:{}),...(input.voipzekerExtension!==undefined?{voipzeker_extension:input.voipzekerExtension || null}:{})}).eq('id',target.id);
    if(error) throw error;
    if(input.role && target.auth_user_id) {
      const {error: roleError}=await db.from('user_roles').update({role:input.role}).eq('user_id',target.auth_user_id);
      if(roleError) throw roleError;
    }
    return reply({success:true});
  } catch(e) { return reply({error:e instanceof z.ZodError?'Ongeldige invoer':e instanceof AccessError?e.message:'Opslaan mislukt'},e instanceof AccessError?e.status:400); }
});