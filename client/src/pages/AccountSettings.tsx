import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { Shield, Eye, User, Check } from 'lucide-react';

export default function AccountSettings() {
  const { user, updateUser } = useAuth();
  const [name, setName]           = useState(user?.full_name || '');
  const [hSize, setHSize]         = useState(String(user?.household_size || ''));
  const [twoFA, setTwoFA]         = useState(user?.is_2fa_enabled || false);
  const [visibility, setVisibility] = useState<'public'|'private'>(user?.food_visibility || 'private');
  const [saved, setSaved]         = useState('');

  const flash = (key: string) => { setSaved(key); setTimeout(() => setSaved(''), 2500); };

  const saveProfile = () => {
    updateUser({ full_name: name.trim(), household_size: hSize ? parseInt(hSize) : undefined });
    flash('profile');
  };

  const toggle2FA = (val: boolean) => { setTwoFA(val); updateUser({ is_2fa_enabled: val }); flash('2fa'); };

  const savePrivacy = () => { updateUser({ food_visibility: visibility }); flash('privacy'); };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.FC<{size:number;className?:string}>; children: React.ReactNode }) => (
    <div className="border border-border">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
        <Icon size={14} className="text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );

  const Field = ({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
    </div>
  );

  const SavedBadge = ({ k }: { k: string }) => saved === k
    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium"><Check size={11}/>Saved</span>
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        <div className="pb-5 border-b border-border">
          <h1 className="font-serif text-3xl">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, security, and privacy.</p>
        </div>

        {/* Profile */}
        <Section title="Profile Information" icon={User}>
          <div className="space-y-4">
            <Field label="Full Name">
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full h-8 px-2.5 border border-input text-sm focus:outline-none focus:border-primary transition-colors" />
            </Field>
            <Field label="Email Address" note="Cannot be changed after registration.">
              <input value={user?.email || ''} disabled
                className="w-full h-8 px-2.5 border border-input text-sm bg-muted/40 text-muted-foreground cursor-not-allowed" />
            </Field>
            <Field label="Household Size">
              <input type="number" min="1" max="20" value={hSize}
                onChange={e => setHSize(e.target.value)} placeholder="e.g. 4"
                className="w-20 h-8 px-2.5 border border-input text-sm focus:outline-none focus:border-primary transition-colors" />
            </Field>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={saveProfile}
                className="h-8 px-4 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                Save Profile
              </button>
              <SavedBadge k="profile" />
            </div>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" icon={Shield}>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-semibold">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                  A 6-digit code is sent to your email at each login, adding a second layer of protection.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 border ${twoFA ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-border text-muted-foreground'}`}>
                  {twoFA ? 'ON' : 'OFF'}
                </span>
                {/* Toggle */}
                <button onClick={() => toggle2FA(!twoFA)}
                  className={`w-10 h-5 relative flex items-center border transition-colors ${twoFA ? 'bg-primary border-primary' : 'bg-muted border-input'}`}>
                  <span className={`absolute w-3 h-3 bg-white border border-border/50 transition-transform ${twoFA ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                </button>
                <SavedBadge k="2fa" />
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Account status:{' '}
                <span className="text-emerald-700 font-semibold">Verified ✓</span>
              </p>
            </div>
          </div>
        </Section>

        {/* Privacy */}
        <Section title="Privacy" icon={Eye}>
          <div className="space-y-4">
            <Field label="Food Listing Visibility">
              <div className="flex gap-0 mt-1">
                {(['public', 'private'] as const).map(v => (
                  <button key={v} onClick={() => setVisibility(v)}
                    className={`h-8 px-4 text-xs font-semibold border transition-colors capitalize first:border-r-0 ${visibility === v ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}>
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
              <button onClick={savePrivacy}
                className="h-8 px-4 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                Save Privacy
              </button>
              <SavedBadge k="privacy" />
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
