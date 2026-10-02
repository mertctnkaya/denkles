import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePartyStore } from '../store/partyStore';
import { useShareStore } from '../store/shareStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { Icon } from '../components/shared/Icon';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import { AddShareModal } from '../components/party/AddShareModal';
import { PartyMembersTab } from '../components/party/PartyMembersTab';
import { ViewShareModal } from '../components/party/ViewShareModal';
import { BalanceBreakdownModal } from '../components/party/BalanceBreakdownModal';
import { PartySettingsModal } from '../components/party/PartySettingsModal';
import type { Share } from '../types/database';

export const PartyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentParty, members, events, fetchPartyDetails, fetchEvents, isLoading: partyLoading, error: partyError } = usePartyStore();
  const { shares, participants, computedDebts, fetchShares, addShare, isLoading: shareLoading } = useShareStore();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'feed' | 'balances' | 'members' | 'history'>('feed');
  const [isAddShareModalOpen, setIsAddShareModalOpen] = useState(false);
  const [shareToDelete, setShareToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settleDebtModal, setSettleDebtModal] = useState<{ payer: string, payee: string, amount: number } | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [viewShare, setViewShare] = useState<Share | null>(null);
  const [editingShare, setEditingShare] = useState<Share | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeletingParty, setIsDeletingParty] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (id) {
      setHasFetched(true);
      fetchPartyDetails(id);
      fetchShares(id);
      fetchEvents(id);
    }
  }, [id, fetchPartyDetails, fetchShares, fetchEvents]);

  // Refresh events when shares or members change (due to actions like addShare, settleDebt, removeMember, changeRole, editShare)
  useEffect(() => {
    if (id) {
      fetchEvents(id);
    }
  }, [id, shares, members, fetchEvents]);

  const handleAddShare = async (
    title: string,
    amount: number,
    paidByMemberId: string,
    category: Share['category'],
    selectedParticipants: string[],
    splitMode: 'equal' | 'percentage' | 'exact' | 'shares',
    customValues?: Record<string, number>
  ) => {
    if (!id || !user) return false;

    // Geçerli kullanıcının party_member ID'sini bul
    const me = members.find(m => m.profile_id === user.id);
    if (!me) {
      addToast('Bu grupta üye olarak görünmüyorsunuz.', 'error');
      return false;
    }

    if (editingShare) {
      const { deleteShare } = useShareStore.getState();
      await deleteShare(editingShare.id, id);
    }

    const success = await addShare(
      id,
      me.id, // created_by
      title,
      amount,
      { totalAmount: amount, splitMode, participants: selectedParticipants, customValues }, // splitInput
      paidByMemberId,
      category
    );

    if (success) {
      addToast(editingShare ? 'Harcama başarıyla güncellendi!' : 'Harcama başarıyla eklendi!', 'success');
      setEditingShare(null);
      setIsAddShareModalOpen(false);
    } else {
      const errorMsg = useShareStore.getState().error;
      addToast(errorMsg || 'Harcama eklenirken bir hata oluştu.', 'error');
    }

    return success;
  };

  const handleDeleteShare = async () => {
    if (!shareToDelete || !id) return;
    setIsDeleting(true);
    const success = await useShareStore.getState().deleteShare(shareToDelete, id);
    setIsDeleting(false);
    setShareToDelete(null);

    if (success) {
      addToast('Harcama silindi', 'success');
    } else {
      const errorMsg = useShareStore.getState().error;
      addToast(errorMsg || 'Silinirken hata oluştu', 'error');
    }
  };

  const handleSettleDebt = async () => {
    if (!settleDebtModal || !id) return;
    setIsSettling(true);
    const success = await useShareStore.getState().settleDebt(id, settleDebtModal.payer, settleDebtModal.payee, settleDebtModal.amount);
    setIsSettling(false);
    setSettleDebtModal(null);

    if (success) {
      addToast('Ödeme kaydedildi!', 'success');
    } else {
      const errorMsg = useShareStore.getState().error;
      addToast(errorMsg || 'Ödeme kaydedilirken hata oluştu', 'error');
    }
  };

  const isLoading = partyLoading || shareLoading;
  const error = partyError;

  const myMember = (members || []).find(m => m.profile_id === user?.id);

  const myNetBalance = useMemo(() => {
    let balance = 0;
    if (myMember && computedDebts) {
      computedDebts.forEach(debt => {
        if (debt.from === myMember.id) balance -= debt.amount;
        if (debt.to === myMember.id) balance += debt.amount;
      });
    }
    return balance;
  }, [myMember, computedDebts]);

  useEffect(() => {
    // Sadece fetch işlemi bittiğinde, silme/çıkma işlemi yapılmıyorsa ve HEDEF partide değilsek veya yetki yoksa hata ver
    if (hasFetched && !isLoading && !isDeletingParty && !isLeaving) {
      if (error || !currentParty || (currentParty.id === id && !myMember)) {
        addToast(error || 'Grup bulunamadı veya yetkiniz yok.', 'error');
        navigate('/', { replace: true });
      }
    }
  }, [hasFetched, isLoading, isDeletingParty, isLeaving, error, currentParty, myMember, id, navigate, addToast]);

  // 1. Durum: İlk sayfa yüklemesi veya farklı bir grubun verisi kalmışsa
  if (!hasFetched || isLoading || (currentParty && currentParty.id !== id)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Durum: Yüklendi ama parti yok, hata var veya kullanıcı bu grupta değil (useEffect navigate edecek)
  if (error || !currentParty || !myMember) {
    return null;
  }

  const performDeleteParty = async () => {
    setIsDeletingParty(true);
    const { success, errorMsg } = await usePartyStore.getState().deleteParty(currentParty.id);
    if (success) {
      addToast('Grup başarıyla silindi.', 'success');
      navigate('/');
    } else {
      setIsDeletingParty(false);
      addToast(errorMsg || 'Grup silinirken bir hata oluştu.', 'error');
      setIsConfirmDeleteOpen(false);
    }
  };

  const performLeaveParty = async () => {
    setIsLeaving(true);
    const { success, errorMsg } = await usePartyStore.getState().leaveParty(currentParty.id, myMember!.id);
    if (success) {
      addToast('Gruptan ayrıldınız.', 'success');
      navigate('/');
    } else {
      setIsLeaving(false);
      addToast(errorMsg || 'Gruptan ayrılırken bir hata oluştu.', 'error');
      setIsConfirmLeaveOpen(false);
    }
  };

  const isPositive = myNetBalance > 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 pb-24 md:pb-6 relative min-h-screen md:min-h-[85vh] md:rounded-3xl md:border md:border-slate-200/50 dark:md:border-slate-800 md:shadow-lg overflow-hidden">
      {/* 1. HEADER */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 md:px-6 flex items-center justify-between mt-0 pt-8 md:pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          >
            <Icon name="back" size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {currentParty.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <div
                onClick={() => {
                  navigator.clipboard.writeText(currentParty.join_code);
                  addToast('Davet kodu kopyalandı!', 'success');
                }}
                className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary-dark dark:text-primary-light px-2 py-1 rounded-md cursor-pointer transition-colors"
                title="Kodu kopyala"
              >
                <Icon name="copy" size={12} />
                <span className="text-xs font-bold tracking-wider">{currentParty.join_code}</span>
              </div>
              <div
                onClick={() => {
                  const inviteLink = `${window.location.origin}/join/${currentParty.join_code}?ref=${user?.id || ''}`;
                  navigator.clipboard.writeText(inviteLink);
                  addToast('Davet linki kopyalandı!', 'success');
                }}
                className="flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-md cursor-pointer transition-colors"
                title="Davet linkini kopyala"
              >
                <Icon name="link" size={12} />
                <span className="text-xs font-bold">Davet Linki</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium ml-1">
                {new Date(currentParty.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (myNetBalance !== 0) {
                addToast(`Gruptan ayrılabilmek için bakiyenizin sıfır olması gerekiyor.`, 'warning');
                return;
              }
              if (myMember?.role === 'owner') {
                addToast('Kurucu gruptan ayrılamaz. Önce kuruculuğu devretmelisiniz.', 'error');
                return;
              }
              setIsConfirmLeaveOpen(true);
            }}
            className="w-10 h-10 cursor-pointer flex items-center justify-center rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors text-rose-500"
            title="Gruptan Ayrıl"
          >
            <Icon name="logout" size={20} />
          </button>

          {myMember?.role === 'owner' && (
            <button
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="w-10 h-10 cursor-pointer flex items-center justify-center rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors text-rose-500"
              title="Grubu Sil"
            >
              <Icon name="trash" size={20} />
            </button>
          )}

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-10 h-10 cursor-pointer flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          >
            <Icon name="settings" size={20} />
          </button>
        </div>
      </div>

      {/* ARŞİV UYARISI */}
      {currentParty.is_archived && (
        <div className="mx-4 md:mx-6 mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <Icon name="archive" size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-600 dark:text-amber-500">Bu grup arşivlendi</h4>
            <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">Yeni harcama eklenemez veya ödeşme yapılamaz. Sadece geçmiş kayıtları okuyabilirsiniz.</p>
          </div>
        </div>
      )}

      {/* 2. DASHBOARD / ÖZET KARTI */}
      <div className="p-4 md:p-6">
        <div className="soft-card bg-linear-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-slate-900/10">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1 flex items-center gap-2">
                  Senin Durumun
                  <Icon name="forward" size={14} className="opacity-50" />
                </p>
                <div
                  className="flex items-end gap-2 cursor-pointer group"
                  onClick={() => setIsBreakdownModalOpen(true)}
                  title="Bakiye dökümünü gör"
                >
                  <h2 className={`text-3xl font-bold transition-transform group-hover:scale-105 origin-left ${myNetBalance === 0 ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {myNetBalance === 0 ? 'Ödeştiniz' : `${isPositive ? '+' : '-'}₺${Math.abs(myNetBalance).toFixed(2)}`}
                  </h2>
                </div>
              </div>
              <div className="flex -space-x-3">
                {(members || []).slice(0, 4).map((m) => (
                  <div key={m.id} className="w-10 h-10 rounded-full border-2 border-slate-800 bg-primary-light text-primary-dark font-bold text-sm flex items-center justify-center uppercase shadow-sm">
                    {m.display_name.charAt(0)}
                  </div>
                ))}
                {(members || []).length > 4 && (
                  <div className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-700 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    +{(members || []).length - 4}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-[80%]">
              Grupta toplam <span className="text-white font-bold">{members.length} kişi</span> var. Harcamaları görmek ve bölüşmek için aşağıdaki alanı kullan.
            </p>
          </div>
        </div>
      </div>

      {/* 3. TABS (Hareketler & Hesaplaşma) */}
      <div className="px-4 md:px-6 mb-2">
        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === 'feed' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Harcamalar
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === 'balances' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Hesaplaşma
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === 'members' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Üyeler
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Geçmiş
          </button>
        </div>
      </div>

      {/* 4. İÇERİK ALANI */}
      <div className="flex-1 px-4 md:px-6 overflow-y-auto">
        {activeTab === 'feed' ? (
          (shares || []).length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-3xl">
                💸
              </div>
              <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-2">Henüz Harcama Yok</h3>
              <p className="text-slate-500 text-sm max-w-62.5">Gruptaki ilk harcamayı sen ekle ve hesapları denkleştirmeye başla.</p>
            </div>
          ) : (
            <div className="py-4 space-y-3">
              {(shares || []).map(share => {
                const payerParticipant = participants.find(p => p.share_id === share.id && p.paid_amount > 0);
                const payerMember = (members || []).find(m => m.id === payerParticipant?.party_member_id);

                // Kategori ikonunu belirle
                let catIcon: string = 'receipt';
                if (share.category === 'fuel') catIcon = 'camera';
                if (share.category === 'restaurant') catIcon = 'star';
                if (share.category === 'shopping') catIcon = 'card';

                const splitModeLabels = {
                  equal: 'Eşit',
                  percentage: '%',
                  shares: 'Pay',
                  exact: 'Tam Tutar'
                };
                const splitLabel = splitModeLabels[share.split_mode as keyof typeof splitModeLabels] || share.split_mode;

                return (
                  <div
                    key={`share-${share.id}`}
                    onClick={() => setViewShare(share)}
                    className="relative bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                      <Icon name={catIcon as any} size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm pr-6">{share.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {payerMember?.profile_id === user?.id ? 'Sen' : payerMember?.display_name || 'Biri'}
                          </span> ödedi
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                        <span className="font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
                          {splitLabel}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end justify-center">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-900 dark:text-white">₺{share.total_amount.toFixed(2)}</div>
                        {(myMember?.role === 'owner' || myMember?.role === 'admin' || share.created_by === myMember?.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShareToDelete(share.id);
                            }}
                            className="text-slate-300 dark:text-slate-600 hover:text-danger hover:bg-danger/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 pr-9">
                        {new Date(share.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'history' ? (
          (events || []).length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-3xl">
                📋
              </div>
              <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-2">Geçmiş İşlem Yok</h3>
              <p className="text-slate-500 text-sm max-w-62.5">Grupta henüz kaydedilen bir işlem bulunmuyor.</p>
            </div>
          ) : (
            <div className="py-4 space-y-3 relative before:content-[''] before:absolute before:top-4 before:bottom-4 before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {(events || []).map(event => {
                const actor = (members || []).find(m => m.id === event.actor_id);
                const isMe = actor?.profile_id === user?.id;
                // Eğer actor artık grupta yoksa (ayrıldı/çıkarıldı), description zaten adı içeriyor.
                // Bu durumda ek isim yazmaya gerek yok.
                const displayName = actor ? actor.display_name : '';
                const formattedName = actor ? (isMe ? `${displayName} (Sen)` : displayName) : '';

                let eventIcon = 'info';
                let eventColor = 'text-slate-500';
                let eventBg = 'bg-slate-100 dark:bg-slate-800';

                if (event.event_type.includes('member_added')) { eventIcon = 'plus'; eventColor = 'text-emerald-500'; }
                if (event.event_type.includes('member_removed')) { eventIcon = 'close'; eventColor = 'text-rose-500'; }
                if (event.event_type.includes('debt_settled')) { eventIcon = 'success'; eventColor = 'text-emerald-500'; }
                if (event.event_type.includes('role_updated')) { eventIcon = 'shield'; eventColor = 'text-orange-500'; }
                if (event.event_type.includes('share_deleted')) { eventIcon = 'trash'; eventColor = 'text-rose-500'; }
                if (event.event_type.includes('archived')) { eventIcon = 'archive'; eventColor = 'text-amber-500'; }

                // Text coloring logic
                const renderDescription = (text: string) => {
                  if (!text) return null;
                  const parts = text.split(/(".*?"|\d+(?:\.\d+)?\s*TL)/g);
                  return parts.map((part, i) => {
                    if (part.startsWith('"') && part.endsWith('"')) {
                      const inner = part.slice(1, -1);
                      if (['Kurucu', 'Yönetici', 'Üye'].includes(inner)) {
                        let roleColor = 'text-slate-500';
                        if (inner === 'Kurucu') roleColor = 'text-indigo-500 dark:text-indigo-400';
                        if (inner === 'Yönetici') roleColor = 'text-orange-500 dark:text-orange-400';
                        return <span key={i} className={`font-semibold ${roleColor}`}>"{inner}"</span>;
                      }
                      return <span key={i} className="font-semibold text-slate-900 dark:text-white">{part}</span>;
                    }
                    if (part.includes('TL')) {
                      const isNegative = event.event_type.includes('deleted') || event.event_type.includes('removed');
                      const moneyColor = isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400';
                      return <span key={i} className={`font-bold ${moneyColor}`}>{part}</span>;
                    }
                    return <span key={i}>{part}</span>;
                  });
                };

                return (
                  <div key={`event-${event.id}`} className="relative flex items-start gap-4 ml-2 z-10 py-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-[3px] border-slate-50 dark:border-slate-950 ${eventBg} ${eventColor} mt-1`}>
                      <Icon name={eventIcon as any} size={14} strokeWidth={3} />
                    </div>
                    <div className="flex-1 bg-transparent py-1.5">
                      <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-tight">
                        <strong className="text-slate-900 dark:text-white mr-1">
                          {formattedName}
                        </strong>
                        {renderDescription(event.description)}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(event.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'balances' ? (
          computedDebts && computedDebts.length > 0 ? (
            <div className="py-4 space-y-3">
              {computedDebts.map((debt, index) => {
                const fromMember = (members || []).find(m => m.id === debt.from);
                const toMember = (members || []).find(m => m.id === debt.to);

                if (!fromMember || !toMember) return null;

                const amIOwing = fromMember.profile_id === user?.id;
                const amIOwed = toMember.profile_id === user?.id;

                let iconColor = 'text-slate-400 dark:text-slate-500';
                let bgColor = 'bg-slate-100 dark:bg-slate-800';

                if (amIOwing) {
                  iconColor = 'text-rose-500';
                  bgColor = 'bg-rose-500/10';
                } else if (amIOwed) {
                  iconColor = 'text-emerald-500';
                  bgColor = 'bg-emerald-500/10';
                }

                return (
                  <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bgColor} ${iconColor}`}>
                      {/* Placeholder for arrow icon if not in library, let's use standard icons for now */}
                      <span className="font-bold text-lg">
                        {amIOwing ? '↗' : amIOwed ? '↙' : '→'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {amIOwing ? 'Sen' : fromMember.display_name}
                        </span>
                        {', '}
                        <span className="font-bold text-slate-900 dark:text-white">
                          {amIOwed ? 'sana' : `${toMember.display_name}'e`}
                        </span>
                        {amIOwing ? ' ödeyeceksin' : ' ödeyecek'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <span className={`font-bold ${amIOwing ? 'text-rose-500' : amIOwed ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                        ₺{debt.amount.toFixed(2)}
                      </span>
                      {(amIOwing || amIOwed) && !currentParty.is_archived && (
                        <button
                          onClick={() => setSettleDebtModal({ payer: debt.from, payee: debt.to, amount: debt.amount })}
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors ${amIOwing ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
                        >
                          {amIOwing ? 'Ödedim' : 'Tahsil Ettim'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-3xl">
                ⚖️
              </div>
              <h3 className="text-slate-800 dark:text-slate-100 font-bold mb-2">Hesaplar Denk</h3>
              <p className="text-slate-500 text-sm max-w-62.5">Şu an kimsenin kimseye borcu yok. Harika!</p>
            </div>
          )
        ) : activeTab === 'members' ? (
          <PartyMembersTab party={currentParty} members={members} />
        ) : null}
      </div>

      {/* 5. FLOATING ACTION BUTTON (Yeni Harcama) */}
      {!currentParty.is_archived && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50">
          <button
            onClick={() => setIsAddShareModalOpen(true)}
            className="h-14 px-6 bg-primary hover:bg-primary-dark text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center gap-2 font-bold text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Icon name="plus" size={20} />
            Yeni Harcama
          </button>
        </div>
      )}

      {/* Yeni / Düzenle Harcama Modalı */}
      {user && (
        <AddShareModal
          isOpen={isAddShareModalOpen}
          onClose={() => {
            setIsAddShareModalOpen(false);
            setEditingShare(null);
          }}
          members={members}
          currentUserId={user.id}
          onAdd={handleAddShare}
          initialShare={editingShare}
          initialParticipants={editingShare ? participants.filter(p => p.share_id === editingShare.id) : undefined}
        />
      )}

      {/* Silme Onay Modalı */}
      <Modal
        isOpen={!!shareToDelete}
        onClose={() => !isDeleting && setShareToDelete(null)}
        title="Harcamayı Sil"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Bu harcamayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve gruptaki herkesin hesaplaşma tablosu yeniden hesaplanır.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setShareToDelete(null)} disabled={isDeleting}>
              İptal
            </Button>
            <Button variant="danger" fullWidth onClick={handleDeleteShare} isLoading={isDeleting}>
              Evet, Sil
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ödeme Onay Modalı */}
      <Modal
        isOpen={!!settleDebtModal}
        onClose={() => !isSettling && setSettleDebtModal(null)}
        title="Ödemeyi Onayla"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-white">₺{settleDebtModal?.amount?.toFixed(2)}</strong> tutarındaki borcun ödendiğini onaylıyor musunuz? Bu işlem bakiyelerden düşülecektir.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" fullWidth onClick={() => setSettleDebtModal(null)} disabled={isSettling}>
              İptal
            </Button>
            <Button variant="primary" fullWidth onClick={handleSettleDebt} isLoading={isSettling}>
              Evet, Onayla
            </Button>
          </div>
        </div>
      </Modal>

      {/* VIEW SHARE MODAL */}
      <ViewShareModal
        isOpen={!!viewShare}
        onClose={() => setViewShare(null)}
        share={viewShare}
        participants={participants}
        members={members}
        currentUserId={user?.id || ''}
        isArchived={currentParty.is_archived}
        onEdit={() => {
          if (viewShare) {
            setEditingShare(viewShare);
            setIsAddShareModalOpen(true);
            setViewShare(null);
          }
        }}
      />

      {/* BALANCE BREAKDOWN MODAL */}
      <BalanceBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        member={myMember}
        shares={shares || []}
        participants={participants || []}
        settlements={useShareStore.getState().settlements || []}
        members={members || []}
        onViewShare={(share) => {
          setIsBreakdownModalOpen(false);
          setViewShare(share);
        }}
      />

      {/* PARTY SETTINGS MODAL */}
      <PartySettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        party={currentParty}
        myMember={myMember!}
        netBalance={myNetBalance}
        onDeleteParty={() => setIsConfirmDeleteOpen(true)}
        onLeaveParty={() => setIsConfirmLeaveOpen(true)}
      />

      {/* CONFIRM LEAVE MODAL */}
      <ConfirmModal
        isOpen={isConfirmLeaveOpen}
        onClose={() => setIsConfirmLeaveOpen(false)}
        onConfirm={performLeaveParty}
        title="Gruptan Ayrıl"
        message="Gruptan ayrılmak istediğinize emin misiniz? Bu işlem, geri alınamaz ancak gruptaki geçmişinizi etkilemez."
        confirmText="Evet, Ayrıl"
        isDestructive={true}
        isLoading={isLeaving}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={performDeleteParty}
        title="Grubu Kökten Sil"
        message="Bu grubu ve içindeki tüm harcamaları KÖKTEN silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve gruptaki herkesin verisi silinir!"
        confirmText="Kökten Sil"
        isDestructive={true}
        isLoading={isDeletingParty}
      />
    </div>
  );

};
