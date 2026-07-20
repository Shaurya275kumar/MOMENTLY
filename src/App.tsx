import { useState } from 'react';
import { useAuth } from './lib/auth';
import { supabase } from './lib/supabase';
import ProfileScreen from './components/ProfileScreen';
import { Loader2, User } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'profile' | null>('profile');

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0095f6]" /></div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#dbdbdb] sticky top-0 bg-white z-10">
        <div className="max-w-[935px] mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-[#262626]">DevGram</span>
          <button onClick={() => setView('profile')} className="text-[#262626]"><User className="w-6 h-6" /></button>
        </div>
      </header>
      {view === 'profile' && <ProfileScreen onBack={() => setView(null)} />}
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-[#dbdbdb] rounded-xl p-8 space-y-3">
        <h1 className="text-2xl font-bold text-center text-[#262626] mb-4">DevGram</h1>
        {mode === 'signup' && <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="ig-input py-2.5" required />}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="ig-input py-2.5" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="ig-input py-2.5" required />
        {err && <p className="text-xs text-[#ed4956]">{err}</p>}
        <button disabled={busy} className="w-full py-2 text-sm font-semibold bg-[#0095f6] text-white rounded-lg disabled:opacity-50">{mode === 'signup' ? 'Sign up' : 'Log in'}</button>
        <p className="text-xs text-center ig-gray pt-2">
          {mode === 'signup' ? 'Have an account?' : "Don't have one?"}{' '}
          <button type="button" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')} className="text-[#0095f6] font-semibold">{mode === 'signup' ? 'Log in' : 'Sign up'}</button>
        </p>
      </form>
    </div>
  );
}
