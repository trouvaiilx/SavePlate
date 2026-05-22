import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { api } from '@/lib/api';

const PW_RULES = [
  { label: '8+ characters',     test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter',  test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number',            test: (p: string) => /\d/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]         = useState({ full_name: '', email: '', password: '', confirm_password: '', household_size: '' });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); setApiError(''); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'Required.';
    if (!form.email.trim()) e.email = 'Required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password) e.password = 'Required.';
    else if (!PW_RULES.every(r => r.test(form.password))) e.password = 'Password does not meet all requirements.';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.toLowerCase(),
          password: form.password,
          household_size: form.household_size ? parseInt(form.household_size) : null
        })
      });
      setLoading(false);
      navigate('/verify-email', { state: { email: form.email.toLowerCase() } });
    } catch (err: any) {
      setApiError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  const pwOk = PW_RULES.map(r => r.test(form.password));

  const inputCls = (err?: string) =>
    `w-full h-11 px-3 border text-sm focus:outline-none focus:border-primary transition-colors ${err ? 'border-destructive' : 'border-input'}`;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left strip - desktop */}
      <div className="hidden lg:flex w-80 bg-primary flex-col justify-between p-10 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-5 h-5 bg-white/20 flex items-center justify-center"><span className="text-white text-[10px] font-bold">SP</span></div>
            <span className="font-serif font-bold text-white text-base">SavePlate</span>
          </div>
          <h2 className="font-serif text-white text-2xl leading-snug mb-4">Join the movement<br />against food waste.</h2>
          <p className="text-white/60 text-sm leading-relaxed">Households in Malaysia waste thousands of tonnes annually. SavePlate helps you track, act, and share.</p>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden bg-primary px-5 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-white/20 flex items-center justify-center"><span className="text-white text-[10px] font-bold">SP</span></div>
          <span className="font-serif font-bold text-white text-base">SavePlate</span>
        </div>
        <h2 className="font-serif text-white text-xl">Join the movement against food waste.</h2>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 lg:p-10">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-2xl mb-1">Create account</h1>
          <p className="text-sm text-muted-foreground mb-6">Start tracking and reducing your household food waste.</p>

          {apiError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 mb-4">{apiError}</div>}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Ahmad bin Razali" className={inputCls(errors.full_name)} />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Email Address *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" className={inputCls(errors.email)} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Create a strong password" className={inputCls(errors.password) + ' pr-10'} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                  {PW_RULES.map((r, i) => (
                    <div key={r.label} className={`flex items-center gap-1 text-xs ${pwOk[i] ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                      {pwOk[i] ? <Check size={10} /> : <X size={10} />} {r.label}
                    </div>
                  ))}
                </div>
              )}
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Confirm Password *</label>
              <input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} placeholder="Re-enter password" className={inputCls(errors.confirm_password)} />
              {errors.confirm_password && <p className="text-xs text-destructive mt-1">{errors.confirm_password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                Household Size <span className="text-muted-foreground normal-case font-normal">(optional)</span>
              </label>
              <input type="number" min="1" max="20" value={form.household_size} onChange={e => set('household_size', e.target.value)} placeholder="e.g. 4"
                className="w-24 h-11 px-3 border border-input text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-60">
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
