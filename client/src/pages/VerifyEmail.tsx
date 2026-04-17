import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, code: demoCode } = (location.state as { email: string; code: string }) || {};

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (!email) navigate('/register'); }, [email, navigate]);
  useEffect(() => {
    if (cooldown > 0) { const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [cooldown]);

  const handleDigit = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits]; next[idx] = val; setDigits(next); setError('');
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setDigits(p.split('')); refs.current[5]?.focus(); }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Enter all 6 digits.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const pending = JSON.parse(localStorage.getItem('sp_pending_verification') || 'null');
    if (!pending || pending.email !== email) { setError('Session expired. Please register again.'); setLoading(false); return; }
    if (Date.now() > pending.expires_at)      { setError('Code expired. Request a new one.'); setLoading(false); return; }
    if (pending.code !== code)                 { setError('Incorrect code.'); setLoading(false); return; }
    const users = JSON.parse(localStorage.getItem('sp_users') || '[]');
    const idx = users.findIndex((u: {email:string}) => u.email === email);
    if (idx !== -1) { users[idx].is_verified = true; localStorage.setItem('sp_users', JSON.stringify(users)); }
    localStorage.removeItem('sp_pending_verification');
    setSuccess(true); setLoading(false);
    setTimeout(() => navigate('/login', { state: { verified: true } }), 1800);
  };

  const handleResend = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('sp_pending_verification', JSON.stringify({ email, code: newCode, expires_at: Date.now() + 600000 }));
    setDigits(['','','','','','']); setError(''); setCooldown(60);
    alert(`[DEMO] New code: ${newCode}`);
  };

  if (success) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <CheckCircle size={40} className="text-primary mx-auto mb-4" />
        <h2 className="font-serif text-xl mb-1">Email verified</h2>
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-5 h-5 bg-primary flex items-center justify-center"><span className="text-white text-[10px] font-bold">SP</span></div>
          <span className="font-serif font-bold text-base">SavePlate</span>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Mail size={20} className="text-primary shrink-0" />
          <div>
            <h1 className="font-serif text-xl">Check your inbox</h1>
            <p className="text-sm text-muted-foreground">Sent a 6-digit code to <strong className="text-foreground">{email}</strong>. Expires in 10 min.</p>
          </div>
        </div>

        {demoCode && (
          <div className="border-l-2 border-amber-400 bg-amber-50 px-3 py-2 mb-5">
            <p className="text-xs text-amber-800 font-mono">Demo code: <strong className="text-base tracking-widest">{demoCode}</strong></p>
          </div>
        )}

        {error && <div className="text-sm text-red-700 border border-red-200 bg-red-50 px-3 py-2 mb-4">{error}</div>}

        <div className="flex gap-2 mb-5" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input key={i} ref={el => { refs.current[i] = el; }}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className="w-10 h-12 text-center text-xl font-bold border border-input focus:border-primary focus:outline-none transition-colors bg-white"
            />
          ))}
        </div>

        <button onClick={handleVerify} disabled={loading}
          className="w-full h-9 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 mb-4">
          {loading ? 'Verifying…' : 'Verify Email'}
        </button>

        <button onClick={handleResend} disabled={cooldown > 0}
          className="text-sm text-primary hover:underline underline-offset-2 disabled:text-muted-foreground disabled:no-underline">
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
