import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function ResetPassword() {
  const navigate=useNavigate();
  const { session } = useAuth();
  const [allowed,setAllowed]=useState(false);
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const type=new URLSearchParams(window.location.hash.slice(1)).get('type');
    const fromLink=type==='recovery' || type==='invite' || sessionStorage.getItem('password-link')==='pending';
    setAllowed(Boolean(fromLink && session));
  },[session]);
  const save=async()=>{
    if(!allowed)return;
    if(password.length<8 || password!==confirm){setMessage('Gebruik minimaal 8 tekens en twee gelijke wachtwoorden.');return;}
    setBusy(true);
    const {error}=await supabase.auth.updateUser({password});
    setBusy(false);
    if(error){setMessage('Wachtwoord opslaan mislukt. Kies een sterker wachtwoord of vraag een nieuwe link aan.');return;}
    sessionStorage.removeItem('password-link');await supabase.auth.signOut();navigate('/');
  };
  return <main className="min-h-screen bg-background flex items-center justify-center px-4">
    <form className="w-full max-w-sm space-y-4" onSubmit={e=>{e.preventDefault();void save();}}>
      <img src="/cliqmakers-logo.png" alt="CliqMakers" className="h-14 mx-auto object-contain" />
      <h1 className="text-2xl font-bold">Wachtwoord instellen</h1>
      {!allowed ? <p className="text-muted-foreground">Open de link uit je uitnodiging of resetmail.</p> : <>
        <label className="block">Nieuw wachtwoord<input aria-label="Nieuw wachtwoord" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="block w-full mt-2 border border-border bg-background rounded-lg p-3" /></label>
        <label className="block">Herhaal wachtwoord<input aria-label="Herhaal wachtwoord" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="block w-full mt-2 border border-border bg-background rounded-lg p-3" /></label>
        <Button type="submit" disabled={busy} className="w-full">{busy?'Opslaan…':'Wachtwoord opslaan'}</Button>
      </>}
      {message && <p role="alert" className="text-destructive">{message}</p>}
      <Button type="button" variant="ghost" onClick={()=>navigate('/')}>Terug naar inloggen</Button>
    </form>
  </main>;
}