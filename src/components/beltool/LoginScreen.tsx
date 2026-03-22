import { useState } from 'react';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<{ error?: string }>;
  onResetPassword: (email: string) => Promise<{ error?: string }>;
  loading?: boolean;
}

export function LoginScreen({ onLogin, onResetPassword, loading }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim()) { setErr('Vul je email in'); return; }
    setErr(null);
    setSubmitting(true);

    if (mode === 'reset') {
      const result = await onResetPassword(email);
      setSubmitting(false);
      if (result.error) { setErr(result.error); return; }
      setResetSent(true);
      return;
    }

    if (!pw) { setErr('Vul je wachtwoord in'); setSubmitting(false); return; }
    const result = await onLogin(email, pw);
    setSubmitting(false);
    if (result.error) setErr(result.error);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #1A3060 55%, #00C4B4 100%)' }}>
      {/* Fake CRM nav */}
      <div className="hidden sm:flex w-[220px] flex-col items-start py-6 px-4" style={{ background: 'rgba(13, 27, 62, 0.9)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
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
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[380px] rounded-xl p-8 border" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', borderColor: 'rgba(0,196,180,0.25)', boxShadow: '0 8px 32px rgba(0,196,180,0.2)' }}>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">{mode === 'reset' ? '🔑' : '📞'}</span>
            </div>
            <div className="text-xl font-bold tracking-tight text-white">
              {mode === 'reset' ? 'Wachtwoord herstellen' : 'Bel-Tool'}
            </div>
            <div className="text-[12px] text-white/40 mt-1">
              {mode === 'reset'
                ? 'We sturen een reset-link naar je email'
                : 'Log in met je Supabase account'}
            </div>
          </div>

          {err && (
            <div className="bg-destructive/15 border border-destructive/25 rounded-lg px-3 py-2.5 text-[12px] text-red-300 mb-3">
              {err}
            </div>
          )}

          {resetSent ? (
            <div className="text-center">
              <div className="bg-success/15 border border-success/25 rounded-lg px-3 py-4 text-[13px] text-green-300 mb-4">
                ✅ Reset-link is verstuurd naar <strong>{email}</strong>. Check je inbox (en spam-map).
              </div>
              <button
                onClick={() => { setMode('login'); setResetSent(false); setErr(null); }}
                className="text-[12px] text-primary/80 hover:text-primary underline"
              >
                Terug naar inloggen
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <div className="text-[11px] font-semibold text-white/50 mb-1.5">Email</div>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  type="email"
                  autoComplete="email"
                  placeholder="naam@bedrijf.nl"
                  className="w-full px-3 py-2.5 rounded-lg border text-white text-[13px] outline-none focus:border-primary placeholder:text-white/20"
                  style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
                />
              </div>

              {mode === 'login' && (
                <div className="mb-5">
                  <div className="text-[11px] font-semibold text-white/50 mb-1.5">Wachtwoord</div>
                  <input
                    type="password"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 rounded-lg border text-white text-[13px] outline-none focus:border-primary placeholder:text-white/20"
                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
                  />
                </div>
              )}

              <button
                onClick={submit}
                disabled={submitting || loading}
                className="w-full py-3 rounded-lg bg-primary text-white text-[14px] font-bold active:scale-[0.97] transition-all hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 4px 18px rgba(0,196,180,0.45)' }}
              >
                {submitting || loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === 'reset' ? 'Versturen...' : 'Inloggen...'}
                  </span>
                ) : (
                  mode === 'reset' ? 'Reset-link versturen' : 'Inloggen'
                )}
              </button>

              <div className="text-center mt-4">
                {mode === 'login' ? (
                  <button
                    onClick={() => { setMode('reset'); setErr(null); }}
                    className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    Wachtwoord vergeten?
                  </button>
                ) : (
                  <button
                    onClick={() => { setMode('login'); setErr(null); }}
                    className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    ← Terug naar inloggen
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
