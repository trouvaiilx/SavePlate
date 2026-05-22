import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { CheckCircle, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email } = (location.state as { email?: string }) || {};

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
    setError('');
    try {
      await api('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/login', { state: { verified: true } }), 1800);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await api('/auth/resend-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setDigits(['', '', '', '', '', '']);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    }
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
