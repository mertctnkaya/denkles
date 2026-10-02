import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { usePartyStore } from '../store/partyStore';
import { useHomeStore } from '../store/homeStore';
import { Icon } from '../components/shared/Icon';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { EmptyState } from '../components/shared/EmptyState';

export const Home = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const { parties, fetchParties, createParty, isLoading } = usePartyStore();
  const { totalOwedToMe, totalIOwe, recentActivities, fetchDashboardData } = useHomeStore();

  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const { addToast } = useToastStore();

  useEffect(() => {
    fetchParties();

    // Davet linkinden geldiyse, login olduktan sonra otomatik katil
    const pendingCode = localStorage.getItem('pending_join_code');
    const pendingRef = localStorage.getItem('pending_join_ref');
    
    if (pendingCode) {
      localStorage.removeItem('pending_join_code');
      if (pendingRef) localStorage.removeItem('pending_join_ref');
      
      usePartyStore.getState().joinParty(pendingCode, pendingRef || undefined).then((result) => {
        if (result) {
          if (result.ignored) return;
          if (result.alreadyJoined) {
            addToast('Zaten bu gruptasınız.', 'info');
          } else {
            addToast('Davet linki ile gruba katıldınız!', 'success');
          }
          navigate(`/party/${result.partyId}`);
        } else {
          addToast('Davet linki geçersiz.', 'error');
        }
      });
    }
  }, [fetchParties]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData(user.id);
    }
  }, [user, parties.length, fetchDashboardData]); // partiler eklendikçe dashboard'ı güncelle

  const activeParties = parties.filter(p => !p.is_archived);
  
  const fullName = profile?.full_name || user?.user_metadata?.full_name;
  const initial = fullName ? fullName.charAt(0).toUpperCase() : 'K';
  const displayName = fullName ? fullName.split(' ')[0] : 'Kullanıcı';

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsCreating(true);
    const newId = await createParty(newGroupName.trim());
    setIsCreating(false);

    const error = usePartyStore.getState().error;
    if (error) {
      addToast(error, 'error');
    } else if (newId) {
      setIsNewGroupModalOpen(false);
      setNewGroupName('');
      addToast('Grup başarıyla oluşturuldu!', 'success');
      navigate(`/party/${newId}`); // Oluşturunca içine girsin
    }
  };

  const handleJoinGroup = async () => {
    if (joinCodeInput.trim().length !== 6) {
      addToast('Kod 6 haneli olmalıdır.', 'warning');
      return;
    }

    setIsJoining(true);
    const result = await usePartyStore.getState().joinParty(joinCodeInput.trim());
    setIsJoining(false);

    const error = usePartyStore.getState().error;
    if (error) {
      addToast(error, 'error');
    } else if (result) {
      setIsJoinModalOpen(false);
      setJoinCodeInput('');
      if (result.ignored) return;
      if (result.alreadyJoined) {
        addToast('Zaten bu gruptasınız.', 'info');
      } else {
        addToast('Gruba başarıyla katıldın!', 'success');
      }
      navigate(`/party/${result.partyId}`);
    }
  };

  return (
    <div className="p-6 md:p-0 pt-12 md:pt-6">
      {/* Üst Karşılama Alanı */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1">Hoş geldin, {displayName}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hesaplar Denk! 🎉</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/profile')}
            className="md:hidden w-12 h-12 bg-primary-light dark:bg-primary-dark/30 rounded-full flex items-center justify-center text-primary font-bold text-lg border-2 border-white dark:border-slate-800 shadow-sm uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            {initial}
          </button>
        </div>
      </div>

      {/* Finansal Özet Kartı (Koyu Modern Tasarım) */}
      <div className="soft-card bg-linear-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white border-0 p-6 md:p-8 rounded-3xl mb-8 relative overflow-hidden shadow-xl shadow-slate-900/10">
        {/* Dekoratif Arkaplan Bulanıklıkları */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-success/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-row items-center justify-between mb-8">
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-1">Alacağın</p>
            <h2 className="text-2xl md:text-3xl font-bold text-success-light">₺{totalOwedToMe.toFixed(2)}</h2>
          </div>
          <div className="w-px h-12 bg-slate-700 mx-4"></div>
          <div className="flex-1 text-right">
            <p className="text-slate-400 text-sm font-medium mb-1">Ödeyeceğin</p>
            <h2 className="text-2xl md:text-3xl font-bold text-danger-light">₺{totalIOwe.toFixed(2)}</h2>
          </div>
        </div>

        <div className="relative z-10 flex gap-4">
          <Button variant="primary" icon="plus" fullWidth onClick={() => addToast('Önce bir gruba girmelisin!', 'info')}>Ben Ödedim</Button>
          <Button className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border-0" fullWidth onClick={() => addToast('Önce bir gruba girmelisin!', 'info')}>Hızlı Paylaş</Button>
        </div>
      </div>

      {/* Partilerim (Gruplar) - Yatay Kaydırma */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Gruplarım</h3>
          <button
            onClick={() => navigate('/parties')}
            className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
          >
            Tümünü Gör
          </button>
        </div>

        {isLoading && activeParties.length === 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            <div className="w-36 h-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl shrink-0"></div>
            <div className="w-36 h-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl shrink-0"></div>
          </div>
        ) : activeParties.length === 0 ? (
          <div className="flex flex-col gap-4">
            <EmptyState
              icon="users"
              title="Henüz Grubun Yok"
              description="Arkadaşlarınla masrafları bölüşmek için hemen yeni bir grup oluştur veya koda katıl."
              actionLabel="Grup Oluştur"
              onAction={() => setIsNewGroupModalOpen(true)}
            />
            <Button variant="outline" fullWidth onClick={() => setIsJoinModalOpen(true)} className="border-dashed">
              Bir koda sahip misin? Katıl!
            </Button>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x -mx-6 px-6 md:mx-0 md:px-0">
            {/* Yeni Grup Ekle Butonu */}
            <div
              onClick={() => setIsNewGroupModalOpen(true)}
              className="snap-start shrink-0 w-32 h-40 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full flex items-center justify-center">
                <Icon name="plus" size={24} />
              </div>
              <span className="font-semibold text-sm text-slate-500">Yeni Grup</span>
            </div>

            {/* Kod İle Katıl Butonu */}
            <div
              onClick={() => setIsJoinModalOpen(true)}
              className="snap-start shrink-0 w-32 h-40 soft-card bg-slate-100 dark:bg-slate-800/50 rounded-3xl border-0 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-12 h-12 bg-white dark:bg-slate-700 text-primary rounded-full flex items-center justify-center shadow-sm">
                <Icon name="users" size={24} />
              </div>
              <span className="font-semibold text-sm text-slate-600 dark:text-slate-400">Koda Katıl</span>
            </div>

            {/* Mevcut Gruplar */}
            {activeParties.map((party) => (
              <div
                key={party.id}
                onClick={() => navigate(`/party/${party.id}`)}
                className="snap-start shrink-0 w-36 h-40 soft-card bg-slate-50 dark:bg-card-dark rounded-3xl border border-slate-200/60 dark:border-slate-800/50 shadow-sm p-4 flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div className="text-3xl group-hover:scale-110 transition-transform origin-bottom-left">🏕️</div>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                    <Icon name="users" size={12} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {party.member_count || 1}
                    </span>
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-center gap-1.5 mb-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{party.name}</h4>
                    {party.is_archived && (
                      <Icon name="archive" size={14} className="text-slate-400 shrink-0" title="Arşivlendi" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(party.join_code);
                        addToast('Davet kodu kopyalandı!', 'success');
                      }}
                      className="inline-flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary-dark dark:text-primary-light px-2 py-1 rounded-md transition-colors"
                      title="Kodu kopyala"
                    >
                      <Icon name="copy" size={10} />
                      <span className="text-[10px] font-bold tracking-wider">{party.join_code}</span>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const refParam = user?.id ? `?ref=${user.id}` : '';
                        const inviteLink = `${window.location.origin}/join/${party.join_code}${refParam}`;
                        navigator.clipboard.writeText(inviteLink);
                        addToast('Davet linki kopyalandı!', 'success');
                      }}
                      className="inline-flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 px-2 py-1 rounded-md transition-colors"
                      title="Davet linkini kopyala"
                    >
                      <Icon name="link" size={10} />
                      <span className="text-[10px] font-bold">Davet Linki</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aktif Paylaşımlar */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Son Hareketler</h3>
        <button
          onClick={() => navigate('/parties')}
          className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer hidden md:block"
        >
          Tümünü Gör
        </button>
      </div>

      {parties.length === 0 || recentActivities.length === 0 ? (
        <div className="soft-card p-6 bg-slate-50 dark:bg-card-dark rounded-3xl border border-slate-200/60 dark:border-slate-800/50 shadow-sm text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Grup kurduktan sonra harcamaların burada görünecek.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentActivities.map((share) => (
            <div key={share.id} onClick={() => navigate(`/party/${share.partyId}`)} className="soft-card p-4 flex items-center justify-between hover:scale-[1.02] cursor-pointer bg-slate-50 dark:bg-card-dark rounded-2xl border border-slate-200/60 dark:border-slate-800/50 shadow-sm group">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ${share.isDebt ? 'bg-danger-light/50 dark:bg-danger-dark/20' : 'bg-success-light/50 dark:bg-success-dark/20'}`}>
                  {share.emoji}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">{share.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{share.partyName} • {share.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${share.isDebt ? 'text-danger' : 'text-success'}`}>
                  {share.isDebt ? '-' : '+'}₺{Math.abs(share.amount).toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{share.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Grup Modalı */}
      <Modal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        title="Yeni Grup Oluştur"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setIsNewGroupModalOpen(false)}>İptal</Button>
            <Button variant="primary" fullWidth isLoading={isCreating} onClick={handleCreateGroup}>Oluştur</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Grup Adı
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Örn: Antalya Tatili, Ev Masrafları..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
              autoFocus
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Grup oluşturduktan sonra arkadaşlarınızı davet kodunuzla gruba ekleyebilirsiniz.
          </p>
        </div>
      </Modal>

      {/* Kod ile Katıl Modalı */}
      <Modal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Koda Göre Katıl"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setIsJoinModalOpen(false)}>İptal</Button>
            <Button variant="primary" fullWidth isLoading={isJoining} onClick={handleJoinGroup}>Katıl</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              6 Haneli Davet Kodu
            </label>
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="Örn: 7QG99T"
              maxLength={6}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white text-center tracking-[0.5em] font-bold uppercase"
              autoFocus
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Arkadaşından aldığın 6 haneli kodu girerek gruba anında dahil olabilirsin.
          </p>
        </div>
      </Modal>

    </div>
  );
};
