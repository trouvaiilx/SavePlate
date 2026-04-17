import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { seedFoodData } from '@/lib/store';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const verified = (location.state as { verified?: boolean })?.verified;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));

    const users = JSON.parse(localStorage.getItem('sp_users') || '[]');
    const user = users.find((u: { email: string; password: string }) =>
      u.email === email.toLowerCase().trim() && u.password === password
    );

    if (!user) { setError('Incorrect email or password.'); setLoading(false); return; }
    if (!user.is_verified) { setError('Account not verified. Check your email for the code.'); setLoading(false); return; }

    const { password: _, ...safeUser } = user;
    seedFoodData(safeUser.id);
    login(safeUser, `mock-jwt-${safeUser.id}-${Date.now()}`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex">
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
        <p className="text-white/30 text-xs">BIT216 · HELP University · 2026</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-5 h-5 bg-primary flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">SP</span>
            </div>
            <span className="font-serif font-bold text-foreground text-base">SavePlate</span>
          </div>

          <h1 className="font-serif text-2xl text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-8">Welcome back to your food dashboard.</p>

          {verified && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 mb-5">
              <CheckCircle size={14} /> Email verified — you can now sign in.
            </div>
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                Email address
              </label>
              <input
                type="email" value={email} autoComplete="email"
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                className="w-full h-9 px-3 border border-input bg-white text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password"
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Your password"
                  className="w-full h-9 px-3 pr-9 border border-input bg-white text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button type="button" onClick={() => setShowPw(v=>!v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-9 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 border-l-2 border-primary/30 pl-3 py-1">
            <p className="text-xs text-muted-foreground font-mono">demo@saveplate.my · Demo1234!</p>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            No account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline underline-offset-2">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
