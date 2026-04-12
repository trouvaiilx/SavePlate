import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';

const PW_RULES = [
  { label: '8+ characters',       test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter',    test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number',              test: (p: string) => /\d/.test(p) },
  { label: 'Special character',   test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', household_size: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    setApiError('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim())  e.full_name = 'Required.';
    if (!form.email.trim())      e.email     = 'Required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password)          e.password  = 'Required.';
    else if (!PW_RULES.every(r => r.test(form.password))) e.password = 'Password does not meet all requirements.';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const users = JSON.parse(localStorage.getItem('sp_users') || '[]');
    if (users.find((u: {email:string}) => u.email === form.email.toLowerCase())) {
      setApiError('This email is already registered.'); setLoading(false); return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = { id: Date.now(), full_name: form.full_name.trim(), email: form.email.toLowerCase(), password: form.password, household_size: form.household_size ? parseInt(form.household_size) : null, is_2fa_enabled: false, food_visibility: 'private', is_verified: false };
    users.push(newUser);
    localStorage.setItem('sp_users', JSON.stringify(users));
    localStorage.setItem('sp_pending_verification', JSON.stringify({ email: newUser.email, code, expires_at: Date.now() + 600000 }));
    setLoading(false);
    navigate('/verify-email', { state: { email: newUser.email, code } });
  };

  const pwOk = PW_RULES.map(r => r.test(form.password));

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
          <h2 className="font-serif text-white text-2xl leading-snug mb-4">Join the movement<br />against food waste.</h2>
          <p className="text-white/60 text-sm leading-relaxed">Households in Malaysia waste thousands of tonnes of food annually. SavePlate helps you track, act, and share.</p>
        </div>
        <p className="text-white/30 text-xs">BIT216 · HELP University · 2026</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-5 h-5 bg-primary flex items-center justify-center"><span className="text-white text-[10px] font-bold">SP</span></div>
            <span className="font-serif font-bold text-base">SavePlate</span>
          </div>

          <h1 className="font-serif text-2xl mb-1">Create account</h1>
          <p className="text-sm text-muted-foreground mb-7">Start tracking and reducing your household food waste.</p>

          {apiError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 mb-4">{apiError}</div>}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder="Ahmad bin Razali"
                className={`w-full h-9 px-3 border text-sm focus:outline-none focus:border-primary transition-colors ${errors.full_name ? 'border-destructive' : 'border-input'}`} />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Email Address *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@example.com"
                className={`w-full h-9 px-3 border text-sm focus:outline-none focus:border-primary transition-colors ${errors.email ? 'border-destructive' : 'border-input'}`} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Create a strong password"
                  className={`w-full h-9 px-3 pr-9 border text-sm focus:outline-none focus:border-primary transition-colors ${errors.password ? 'border-destructive' : 'border-input'}`} />
                <button type="button" onClick={() => setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              {form.password && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
                  {PW_RULES.map((r, i) => (
                    <div key={r.label} className={`flex items-center gap-1 text-xs ${pwOk[i] ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                      {pwOk[i] ? <Check size={10}/> : <X size={10}/>} {r.label}
                    </div>
                  ))}
                </div>
              )}
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Confirm Password *</label>
              <input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)}
                placeholder="Re-enter password"
                className={`w-full h-9 px-3 border text-sm focus:outline-none focus:border-primary transition-colors ${errors.confirm_password ? 'border-destructive' : 'border-input'}`} />
              {errors.confirm_password && <p className="text-xs text-destructive mt-1">{errors.confirm_password}</p>}
            </div>

            {/* Household */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Household Size <span className="text-muted-foreground normal-case font-normal">(optional)</span></label>
              <input type="number" min="1" max="20" value={form.household_size} onChange={e => set('household_size', e.target.value)}
                placeholder="e.g. 4"
                className="w-24 h-9 px-3 border border-input text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-9 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline underline-offset-2">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
