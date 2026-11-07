import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
Deno.serve(req => req.method === 'OPTIONS' ? new Response('ok',{headers:corsHeaders}) : new Response(JSON.stringify({error:'Deze oude telefoniekoppeling is uitgeschakeld. Gebruik VoIPzeker.'}),{status:410,headers:{...corsHeaders,'Content-Type':'application/json'}}));
