import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Eye, EyeOff, CheckCircle, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const verified = (location.state as { verified?: boolean })?.verified;

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [needs2FA, setNeeds2FA]   = useState(false);
  const [twoFAEmail, setTwoFAEmail] = useState('');
  const [digits, setDigits]       = useState(['', '', '', '', '', '']);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });

      if (data.requires2FA) {
        setNeeds2FA(true);
        setTwoFAEmail(data.email);
        setLoading(false);
        return;
      }

      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.status === 403) {
        // Account not verified — redirect to verify page
        navigate('/verify-email', { state: { email: email.toLowerCase().trim() } });
        return;
      }
      setError(err.message || 'Login failed.');
      setLoading(false);
    }
  };

  // 2FA digit input handlers
  const handleDigit = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits]; next[idx] = val; setDigits(next); setError('');
    if (val && idx < 5) digitRefs.current[idx + 1]?.focus();
  };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) digitRefs.current[idx - 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setDigits(p.split('')); digitRefs.current[5]?.focus(); }
  };

  const handleVerify2FA = async () => {
    const code = digits.join('');
    if (code.length < 6) { setError('Enter all 6 digits.'); return; }
    setTwoFALoading(true);
    setError('');
    try {
      const data = await api('/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ email: twoFAEmail, code }),
      });
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA code.');
      setTwoFALoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left strip - desktop */}
      <div className="hidden lg:flex w-80 bg-primary flex-col justify-between p-10 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-5 h-5 bg-white/20 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">SP</span>
            </div>
            <span className="font-serif font-bold text-white text-base">SavePlate</span>
          </div>
          <h2 className="font-serif text-white text-2xl leading-snug mb-4">
            Reduce waste.<br />Feed community.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Track your household food, catch items before they expire, and share what you can't use.
          </p>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden bg-primary px-5 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-white/20 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">SP</span>
          </div>
          <span className="font-serif font-bold text-white text-base">SavePlate</span>
        </div>
        <h2 className="font-serif text-white text-xl leading-snug">Reduce waste. Feed community.</h2>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 lg:p-10">
        <div className="w-full max-w-sm">

          {/* 2FA view */}
          {needs2FA ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck size={22} className="text-primary shrink-0" />
                <div>
                  <h1 className="font-serif text-2xl text-foreground">Two-Factor Authentication</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    A 6-digit code has been sent to <strong className="text-foreground">{twoFAEmail}</strong>.
                  </p>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 mb-5">
                  {error}
                </div>
              )}

              <div className="flex gap-2 mb-5" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => { digitRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-10 h-12 text-center text-xl font-bold border border-input focus:border-primary focus:outline-none transition-colors bg-white"
                  />
                ))}
              </div>

              <button onClick={handleVerify2FA} disabled={twoFALoading}
                className="w-full h-11 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-60">
                {twoFALoading ? 'Verifying…' : 'Verify Code'}
              </button>

              <button onClick={() => { setNeeds2FA(false); setDigits(['','','','','','']); setError(''); }}
                className="mt-4 text-sm text-primary hover:underline underline-offset-2">
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-foreground mb-1">Sign in</h1>
              <p className="text-sm text-muted-foreground mb-6">Welcome back to your food dashboard.</p>

              {verified && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2.5 mb-5">
                  <CheckCircle size={14} className="shrink-0" /> Email verified — you can now sign in.
                </div>
              )}
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Email address</label>
                  <input type="email" value={email} autoComplete="email"
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3 border border-input bg-white text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password"
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Your password"
                      className="w-full h-11 px-3 pr-10 border border-input bg-white text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-11 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-60">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p className="mt-5 text-sm text-muted-foreground">
                No account?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline underline-offset-2">Create one</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
