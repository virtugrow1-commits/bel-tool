import { useState } from 'react';
import type { User } from '@/lib/beltool-data';
import { USERS } from '@/lib/beltool-data';
import { store } from '@/lib/beltool-store';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('willem@cliqmakers.nl');
  const [pw, setPw] = useState('demo');
  const [err, setErr] = useState(false);

  const submit = () => {
    const allUsers: User[] = store.get('managedUsers', USERS);
    const u = allUsers.find(u => u.email === email && u.password === pw);
    if (u) onLogin(u);
    else setErr(true);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(222 34% 8%)' }}>
      {/* Fake CRM nav */}
      <div className="w-[72px] border-r border-border/30 flex flex-col items-center py-6" style={{ background: 'hsl(222 34% 6%)' }}>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
          <span className="text-primary text-lg font-extrabold">V</span>
        </div>
        {['🚀','📊','💬','📅','👤','🎯','💳'].map((icon, i) => (
          <div key={i} className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px] text-muted-foreground/20 mb-1">{icon}</div>
        ))}
      </div>

      {/* Login form centered */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[360px] bg-card/50 rounded-xl p-8 border border-border/30 shadow-2xl backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📞</span>
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground/90">Bel-Tool</div>
            <div className="text-[11px] text-muted-foreground/30 mt-1">Log in om te starten</div>
          </div>

          {err && (
            <div className="bg-destructive/8 border border-destructive/15 rounded-lg px-3 py-2 text-[11px] text-destructive mb-3">
              Ongeldig email of wachtwoord
            </div>
          )}

          <div className="mb-3">
            <div className="text-[10px] font-medium text-muted-foreground/40 mb-1">Email</div>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-3 py-2 rounded-lg border border-border/30 bg-foreground/[0.03] text-foreground text-[12px] outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="mb-5">
            <div className="text-[10px] font-medium text-muted-foreground/40 mb-1">Wachtwoord</div>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-3 py-2 rounded-lg border border-border/30 bg-foreground/[0.03] text-foreground text-[12px] outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={submit}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold active:scale-[0.97] transition-transform hover:bg-primary/90"
          >
            Inloggen
          </button>
          <div className="text-[9px] text-muted-foreground/25 text-center mt-4">
            Demo: willem / sophie / mark @cliqmakers.nl — pw: demo
          </div>
        </div>
      </div>
    </div>
  );
}
