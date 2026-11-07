import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { organizationCliq } from '../_shared/cliq.ts';
import { serviceClient } from '../_shared/auth.ts';
const id=z.string().regex(/^[a-zA-Z0-9_-]{15,100}$/);
const info=z.object({naam:z.string().trim().min(1).max(150),email:z.string().trim().email().max(255),telefoon:z.string().trim().max(30).regex(/^[+0-9 ().-]*$/),bedrijf:z.string().trim().max(150)});
const answers=info.extend({uren:z.string().min(1).max(30),taken:z.array(z.string().max(100)).max(10),takenOverig:z.string().max(500),groei:z.enum(['Bijbenen & verwerken','Klaar voor groei']),ai:z.enum(['Al mee bezig','Komt niet aan toe'])});
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('survey'),id}).strict(),
  z.object({action:z.literal('saveSurvey'),id,answers}).strict(),
  z.object({action:z.literal('calendars')}).strict(),
  z.object({action:z.literal('slots'),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).strict(),
  z.object({action:z.literal('book'),contactId:id.optional(),contact:info.extend({opmerking:z.string().max(2000)}),start:z.string().datetime({offset:true}),requestId:z.string().uuid()}).strict(),
]);
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
function offset(date:string){const value=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Amsterdam',timeZoneName:'shortOffset'}).formatToParts(new Date(`${date}T12:00:00Z`)).find(p=>p.type==='timeZoneName')?.value || 'GMT+1';const m=value.match(/GMT([+-])(\d+)/);return m?`${m[1]}${m[2].padStart(2,'0')}:00`:'+01:00';}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  try{
    if(req.method!=='POST')return reply({error:'Alleen POST toegestaan'},405);
    const db=serviceClient();
    // Infrastructure-forwarded IP only; do not accept a body-supplied IP.
    const ip=(req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown').split(',')[0].trim();
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
    const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    const {data:allowed,error:limitError}=await db.rpc('consume_public_request',{p_hash:hash});
    if(limitError) return reply({error:'Tijdelijk niet beschikbaar'},503);
    if(!allowed)return reply({error:'Te veel verzoeken. Probeer over een minuut opnieuw.'},429);
    const raw=await req.text();if(raw.length>12000)return reply({error:'Invoer te groot'},400);
    const input=schema.parse(JSON.parse(raw));
    const {org,request,contact}=await organizationCliq();
    const calendar=async()=>{const data=await request(`/calendars/?locationId=${encodeURIComponent(org.ghl_location_id)}`);const c=data.calendars?.find((c:{name:string;isActive?:boolean})=>c.name.trim().toLowerCase()==='adviesgesprekken' && c.isActive!==false);if(!c)throw new Error('Agenda Adviesgesprekken niet beschikbaar');return c;};
    const slots=async(date:string)=>{const from=new Date(`${date}T00:00:00${offset(date)}`).getTime();if(!Number.isFinite(from)||from<Date.now()-86400000 || from>Date.now()+61*86400000)throw new Error('Ongeldige datum');const c=await calendar();const data=await request(`/calendars/${encodeURIComponent(c.id)}/free-slots?startDate=${from}&endDate=${from+86400000-1}&timezone=Europe/Amsterdam`);return {c,data};};
    if(input.action==='survey'){
      const c=await contact(input.id);
      const {data:saved}=await db.from('public_surveys').select('answers').eq('id',input.id).eq('organization_id',org.id).maybeSingle();
      return reply({contact:{id:c.id,name:c.name || [c.firstName,c.lastName].filter(Boolean).join(' '),email:c.email || '',phone:c.phone || '',companyName:c.companyName || ''},answers:saved?.answers || null});
    }
    if(input.action==='saveSurvey'){
      await contact(input.id);const a=input.answers;
      const {error}=await db.from('public_surveys').upsert({id:input.id,organization_id:org.id,answers:a,updated_at:new Date().toISOString()});if(error)throw new Error('Enquête opslaan mislukt');
      await request(`/contacts/${input.id}`,'PUT',{name:a.naam,email:a.email,phone:a.telefoon,companyName:a.bedrijf});
      await request(`/contacts/${input.id}/notes`,'POST',{body:`Digitale enquête\nUren: ${a.uren}\nTaken: ${a.taken.join(', ')} ${a.takenOverig}\nGroei: ${a.groei}\nAI: ${a.ai}`});
      await request(`/contacts/${input.id}/tags`,'POST',{tags:['enquete-digitaal-ingevuld','beltool-enquete-voltooid']});
      return reply({success:true,contactId:input.id});
    }
    if(input.action==='calendars'){const c=await calendar();return reply({calendars:[{id:c.id,name:c.name}]});}
    if(input.action==='slots'){const {data}=await slots(input.date);return reply(data);}
    const existing=await db.from('call_sessions').select('id').eq('organization_id',org.id).eq('request_id',input.requestId).eq('source','public_booking').maybeSingle();
    if(existing.data)return reply({success:true,alreadyBooked:true});
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(input.start));
    const {c,data:free}=await slots(date);
    const available=Object.values(free).flatMap((v:unknown)=>typeof v==='object' && v && 'slots' in v ? (v as {slots:string[]}).slots:[]);
    if(!available.some((s:string)=>new Date(s).getTime()===new Date(input.start).getTime()))return reply({error:'Dit tijdstip is niet meer beschikbaar'},409);
    let cid=input.contactId;
    if(cid)await contact(cid);
    else {const created=await request('/contacts/','POST',{locationId:org.ghl_location_id,name:input.contact.naam,email:input.contact.email,phone:input.contact.telefoon,companyName:input.contact.bedrijf,source:'Website adviesgesprek'});cid=created.contact?.id;}
    if(!cid)throw new Error('Contact aanmaken mislukt');
    await request(`/contacts/${cid}`,'PUT',{name:input.contact.naam,email:input.contact.email,phone:input.contact.telefoon,companyName:input.contact.bedrijf});
    const appointment=await request('/calendars/events/appointments','POST',{calendarId:c.id,locationId:org.ghl_location_id,contactId:cid,startTime:input.start,endTime:new Date(new Date(input.start).getTime()+30*60000).toISOString(),title:`Adviesgesprek — ${input.contact.bedrijf || input.contact.naam}`,appointmentStatus:'confirmed',notes:input.contact.opmerking});
    const {error:save}=await db.from('call_sessions').insert({organization_id:org.id,request_id:input.requestId,source:'public_booking',contact_id:cid,company_name:input.contact.bedrijf,contact_name:input.contact.naam,phone:input.contact.telefoon,caller_name:'Zelfgeboekt (website)',result:'afspraak',notes:`Afspraak: ${input.start}`,ghl_synced:true});
    if(save)return reply({error:'Afspraak is geboekt, maar de rapportage kon niet worden bijgewerkt. Neem contact op.',appointmentBooked:true},500);
    await request(`/contacts/${cid}/tags`,'POST',{tags:['beltool-afspraak-gepland','appointment-booked']});
    await request(`/contacts/${cid}/notes`,'POST',{body:`Adviesgesprek geboekt: ${input.start}\n${input.contact.opmerking}`});
    return reply({success:true,appointmentId:appointment.id || appointment.event?.id});
  }catch(e){return reply({error:e instanceof z.ZodError?'Controleer de ingevulde gegevens':e instanceof Error?e.message:'Verzoek mislukt'},400);}
});