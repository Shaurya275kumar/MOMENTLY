import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'signin') {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    } else {
      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters');
        setBusy(false);
        return;
      }
      const { error } = await signUp(email.trim(), password, username.trim(), fullName.trim() || username.trim());
      if (error) setError(error);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] px-4 py-8">
      <div className="w-full max-w-[350px]">
        <div className="bg-white border border-[#dbdbdb] rounded-md px-10 py-8 flex flex-col items-center">
          <h1 className="font-logo text-5xl text-[#262626] mb-8">Momently</h1>

          <form onSubmit={submit} className="w-full flex flex-col gap-1.5">
            {mode === 'signup' && (
              <>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="ig-input" />
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name (optional)" className="ig-input" />
              </>
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="ig-input" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="ig-input" required />

            <button type="submit" disabled={busy} className="mt-2 w-full bg-[#0095f6] hover:bg-[#1877f2] disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-1.5 transition flex items-center justify-center gap-1.5">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'signin' ? 'Log in' : 'Sign up'}
            </button>
          </form>

          {error && <p className="text-xs text-[#ed4956] mt-3 text-center">{error}</p>}
        </div>

        <div className="bg-white border border-[#dbdbdb] rounded-md mt-2.5 px-10 py-5 text-center text-sm">
          {mode === 'signin' ? "Don't have an account?" : 'Have an account?'}{' '}
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }} className="text-[#0095f6] font-semibold hover:underline">
            {mode === 'signin' ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
