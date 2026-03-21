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
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #1A3060 55%, #00C4B4 100%)' }}>
      {/* Fake CRM nav */}
      <div className="w-[220px] flex flex-col items-start py-6 px-4" style={{ background: 'rgba(13, 27, 62, 0.9)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-extrabold">C</span>
          </div>
          <span className="text-sm font-bold text-white/80">ClioCRM</span>
        </div>
        {['🚀 Launchpad','📊 Dashboard','💬 Gesprekken','📅 Kalenders','👤 Contacten','🎯 Leads','💳 Betalingen'].map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 py-[7px] w-full text-[12px] text-white/20 font-medium">{item}</div>
        ))}
      </div>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[380px] rounded-xl p-8 border" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', borderColor: 'rgba(0,196,180,0.25)', boxShadow: '0 8px 32px rgba(0,196,180,0.2)' }}>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">📞</span>
            </div>
            <div className="text-xl font-bold tracking-tight text-white">Bel-Tool</div>
            <div className="text-[12px] text-white/40 mt-1">Log in om te starten</div>
          </div>

          {err && (
            <div className="bg-destructive/15 border border-destructive/25 rounded-lg px-3 py-2.5 text-[12px] text-red-300 mb-3">
              Ongeldig email of wachtwoord
            </div>
          )}

          <div className="mb-3">
            <div className="text-[11px] font-semibold text-white/50 mb-1.5">Email</div>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-3 py-2.5 rounded-lg border text-white text-[13px] outline-none focus:border-primary"
              style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
            />
          </div>
          <div className="mb-5">
            <div className="text-[11px] font-semibold text-white/50 mb-1.5">Wachtwoord</div>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full px-3 py-2.5 rounded-lg border text-white text-[13px] outline-none focus:border-primary"
              style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
            />
          </div>
          <button
            onClick={submit}
            className="w-full py-3 rounded-lg bg-primary text-white text-[14px] font-bold active:scale-[0.97] transition-all hover:bg-primary/90"
            style={{ boxShadow: '0 4px 18px rgba(0,196,180,0.45)' }}
          >
            Inloggen
          </button>
          <div className="text-[10px] text-white/25 text-center mt-4">
            Demo: willem / sophie / mark @cliqmakers.nl — pw: demo
          </div>
        </div>
      </div>
    </div>
  );
}
