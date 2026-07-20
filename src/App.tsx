import { useState } from 'react';
import { useAuth } from './lib/auth';
import AuthScreen from './components/AuthScreen';
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
