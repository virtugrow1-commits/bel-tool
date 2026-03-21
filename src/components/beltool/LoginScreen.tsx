import { useState } from 'react';
import type { User } from '@/lib/beltool-data';
import { USERS } from '@/lib/beltool-data';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('willem@cliqmakers.nl');
  const [pw, setPw] = useState('demo');
  const [err, setErr] = useState(false);

  const submit = () => {
    const u = USERS.find(u => u.email === email && u.password === pw);
    if (u) onLogin(u);
    else setErr(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-[380px] bg-card rounded-2xl p-9 border border-border shadow-2xl">
        <div className="text-center mb-7">
          <div className="flex justify-center">
            <Logo size={56} />
          </div>
          <div className="text-xl font-extrabold mt-3 tracking-tight">
            Cliq<span className="text-primary">Makers</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 tracking-[1.5px]">BEL-TOOL</div>
        </div>

        {err && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive mb-3">
            Ongeldig email of wachtwoord
          </div>
        )}

        <div className="mb-3">
          <div className="text-[11px] text-muted-foreground mb-1">Email</div>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full px-3 py-2 rounded-lg border border-border bg-foreground/[0.04] text-foreground text-[13px] outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="mb-5">
          <div className="text-[11px] text-muted-foreground mb-1">Wachtwoord</div>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full px-3 py-2 rounded-lg border border-border bg-foreground/[0.04] text-foreground text-[13px] outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={submit}
          className="w-full py-2.5 rounded-xl border-none bg-gradient-to-r from-info to-primary text-white text-sm font-bold active:scale-[0.97] transition-transform"
        >
          Inloggen
        </button>
        <div className="text-[10px] text-muted-foreground/40 text-center mt-4">
          Demo: willem / sophie / mark @cliqmakers.nl — pw: demo
        </div>
      </div>
    </div>
  );
}
