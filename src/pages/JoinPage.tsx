import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { usePartyStore } from '../store/partyStore';
import { useToastStore } from '../store/toastStore';
import { Button } from '../components/shared/Button';
import { Icon } from '../components/shared/Icon';

export const JoinPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { joinParty } = usePartyStore();
  const { addToast } = useToastStore();
  
  const [guestName, setGuestName] = useState('');
  const [isAnonymousLoading, setIsAnonymousLoading] = useState(false);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);

  useEffect(() => {
    // Oturum varsa direkt katıl ve yönlendir
    if (session && code && !hasAttemptedJoin) {
      setHasAttemptedJoin(true);
      handleJoin(code);
    }
  }, [session, code, hasAttemptedJoin]);

  const handleJoin = async (joinCode: string) => {
    const partyId = await joinParty(joinCode);
    if (partyId) {
      addToast('Gruba başarıyla katıldın!', 'success');
      navigate(`/party/${partyId}`, { replace: true });
    } else {
      const err = usePartyStore.getState().error;
      addToast(err || 'Grup bulunamadı veya kod geçersiz.', 'error');
      navigate('/', { replace: true });
    }
  };

  const handleGuestJoin = async () => {
    if (!guestName.trim() || !code) return;
    setIsAnonymousLoading(true);
    try {
      // 1. Supabase Anonymous SignIn
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      // 2. Misafir adını profile yaz
      await supabase.auth.updateUser({
        data: { full_name: guestName.trim() }
      });
      
      // authStore onAuthStateChange tetiklenecek ve App yeniden render olacak.
      // Bu sayfa tekrar yüklendiğinde session olduğu için useEffect handleJoin'i çağıracak.
    } catch (err: any) {
      addToast(err.message || 'Misafir girişi başarısız oldu.', 'error');
      setIsAnonymousLoading(false);
    }
  };

  const handleAuthRedirect = () => {
    if (code) {
      localStorage.setItem('pending_join_code', code);
    }
    navigate('/auth');
  };

  if (session) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center">
        <div className="animate-spin text-indigo-500">
          <Icon name="history" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-800 text-center">
        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Icon name="link" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Denkleş'e Davetlisin</h1>
        <p className="text-slate-400 mb-8">
          <strong className="text-white">{code?.toUpperCase()}</strong> kodlu gruba katılmak için bir yöntem seç.
        </p>

        {showGuestInput ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Adınız (Örn: Mert)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
            />
            <Button
              variant="primary"
              fullWidth
              onClick={handleGuestJoin}
              isLoading={isAnonymousLoading}
              disabled={!guestName.trim()}
            >
              Katıl
            </Button>
            <button
              onClick={() => setShowGuestInput(false)}
              className="text-sm text-slate-500 hover:text-white transition-colors"
            >
              Geri Dön
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="primary"
              fullWidth
              onClick={() => setShowGuestInput(true)}
            >
              Misafir (Hayalet) Olarak Katıl
            </Button>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-2 text-slate-500">veya</span>
              </div>
            </div>

            <Button
              variant="outline"
              fullWidth
              onClick={handleAuthRedirect}
            >
              Hesap Aç / Giriş Yap
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
