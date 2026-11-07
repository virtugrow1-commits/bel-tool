import { serviceClient } from './auth.ts';
export async function organizationCliq(orgId?: string) {
  const db=serviceClient();
  const query=db.from('organizations').select('id,ghl_api_key,ghl_location_id');
  const {data,error}=await (orgId?query.eq('id',orgId):query.eq('slug','cliqmakers')).single();
  if(error || !data?.ghl_api_key || !data.ghl_location_id) throw new Error('CLIQ-koppeling niet beschikbaar');
  const org=data;
  const request=async(path:string,method='GET',body?:unknown)=>{
    const res=await fetch(`https://services.leadconnectorhq.com${path}`,{method,headers:{Authorization:`Bearer ${org.ghl_api_key}`,Version:'2021-07-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
    if(!res.ok) throw new Error(`CLIQ-verzoek mislukt (${res.status})`);
    return res.status===204?{}:await res.json();
  };
  const contact=async(id:string)=>{
    const data=await request(`/contacts/${encodeURIComponent(id)}`);
    if(data.contact?.locationId!==org.ghl_location_id) throw new Error('Ongeldige enquêtelink');
    return data.contact;
  };
  return {db,org,request,contact};
}