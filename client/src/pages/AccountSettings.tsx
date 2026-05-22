import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Shield, Eye, User, Check, AlertCircle } from 'lucide-react';

const Field = ({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">{label}</label>
    {children}
    {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
  </div>
);

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.FC<{size:number;className?:string}>; children: React.ReactNode }) => (
  <div className="border border-border">
    <div className="flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border bg-muted/30">
      <Icon size={14} className="text-primary shrink-0" />
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
    <div className="px-4 sm:px-5 py-4 sm:py-5">{children}</div>
  </div>
);

const SavedBadge = ({ k, saved }: { k: string; saved: string }) =>
  saved === k ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium"><Check size={11}/>Saved</span> : null;

export default function AccountSettings() {
  const { user, updateUser } = useAuth();
  const [name, setName]               = useState(user?.full_name || '');
  const [hSize, setHSize]             = useState(String(user?.household_size || ''));
  const [twoFA, setTwoFA]             = useState(user?.is_2fa_enabled || false);
  const [visibility, setVisibility]   = useState<'public'|'private'>(user?.food_visibility || 'private');
  const [saved, setSaved]             = useState('');
  const [error, setError]             = useState('');
  const [saving, setSaving]           = useState('');

  const flash = (key: string) => { setSaved(key); setTimeout(() => setSaved(''), 2500); };

  const saveProfile = async () => {
    setSaving('profile'); setError('');
    try {
      await api('/auth/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: name.trim(),
          household_size: hSize ? parseInt(hSize) : null,
        }),
      });
      updateUser({ full_name: name.trim(), household_size: hSize ? parseInt(hSize) : undefined });
      flash('profile');
    } catch (e: any) {
      setError(e.message || 'Failed to save profile.');
    } finally {
      setSaving('');
    }
  };

  const toggle2FA = async (val: boolean) => {
    setSaving('2fa'); setError('');
    try {
      await api('/auth/settings', {
        method: 'PATCH',
        body: JSON.stringify({ is_2fa_enabled: val }),
      });
      setTwoFA(val);
      updateUser({ is_2fa_enabled: val });
      flash('2fa');
    } catch (e: any) {
      setError(e.message || 'Failed to update 2FA.');
    } finally {
      setSaving('');
    }
  };

  const savePrivacy = async () => {
    setSaving('privacy'); setError('');
    try {
      await api('/auth/settings', {
        method: 'PATCH',
        body: JSON.stringify({ food_visibility: visibility }),
      });
      updateUser({ food_visibility: visibility });
      flash('privacy');
    } catch (e: any) {
      setError(e.message || 'Failed to save privacy settings.');
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-5 sm:space-y-6">

        <div className="pb-4 sm:pb-5 border-b border-border">
          <h1 className="font-serif text-2xl sm:text-3xl">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, security, and privacy.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        {/* Profile */}
        <Section title="Profile Information" icon={User}>
          <div className="space-y-4">
            <Field label="Full Name">
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full h-10 px-2.5 border border-input text-sm focus:outline-none focus:border-primary transition-colors" />
            </Field>
            <Field label="Email Address" note="Cannot be changed after registration.">
              <input value={user?.email || ''} disabled
                className="w-full h-10 px-2.5 border border-input text-sm bg-muted/40 text-muted-foreground cursor-not-allowed" />
            </Field>
            <Field label="Household Size">
              <input type="number" min="1" max="20" value={hSize} onChange={e => setHSize(e.target.value)} placeholder="e.g. 4"
                className="w-24 h-10 px-2.5 border border-input text-sm focus:outline-none focus:border-primary transition-colors" />
            </Field>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={saveProfile} disabled={saving === 'profile'}
                className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-60">
                {saving === 'profile' ? 'Saving…' : 'Save Profile'}
              </button>
              <SavedBadge k="profile" saved={saved} />
            </div>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" icon={Shield}>
          <div className="space-y-4">
            {/* 2FA row - stacks on very small screens */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 py-1">
              <div className="flex-1">
                <p className="text-sm font-semibold">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A 6-digit code is sent to your email at each login, adding a second layer of protection.
                </p>
              </div>
              <div className="flex items-center gap-3 sm:shrink-0">
                <span className={`text-xs font-mono font-semibold px-2 py-1 border ${twoFA ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-border text-muted-foreground'}`}>
                  {twoFA ? 'ON' : 'OFF'}
                </span>
                {/* Square toggle - intentional, not a pill */}
                <button onClick={() => toggle2FA(!twoFA)} disabled={saving === '2fa'}
                  className={`w-11 h-6 relative flex items-center border transition-colors disabled:opacity-60 ${twoFA ? 'bg-primary border-primary' : 'bg-muted border-input'}`}
                  aria-label={twoFA ? 'Disable 2FA' : 'Enable 2FA'}>
                  <span className={`absolute w-4 h-4 bg-white border border-border/50 transition-transform ${twoFA ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                </button>
                <SavedBadge k="2fa" saved={saved} />
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Account status: <span className="text-emerald-700 font-semibold">Verified ✓</span>
              </p>
            </div>
          </div>
        </Section>

        {/* Privacy */}
        <Section title="Privacy" icon={Eye}>
          <div className="space-y-4">
            <Field label="Food Listing Visibility">
              <div className="flex mt-1">
                {(['public', 'private'] as const).map(v => (
                  <button key={v} onClick={() => setVisibility(v)}
                    className={`h-10 flex-1 sm:flex-none sm:px-6 text-sm font-semibold border transition-colors capitalize first:border-r-0 ${visibility === v ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted active:bg-muted'}`}>
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {visibility === 'public'
                  ? 'Your donation listings appear in community Browse searches.'
                  : 'Your donation listings are hidden from other users.'}
              </p>
            </Field>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={savePrivacy} disabled={saving === 'privacy'}
                className="h-10 px-5 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-60">
                {saving === 'privacy' ? 'Saving…' : 'Save Privacy'}
              </button>
              <SavedBadge k="privacy" saved={saved} />
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
