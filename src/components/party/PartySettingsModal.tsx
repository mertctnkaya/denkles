import { useState } from 'react';
import type { Party, PartyMember } from '../../types/database';
import { usePartyStore } from '../../store/partyStore';
import { useToastStore } from '../../store/toastStore';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';

interface PartySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  myMember: PartyMember;
  netBalance: number;
  onDeleteParty?: () => void;
  onLeaveParty: () => void;
}

export const PartySettingsModal = ({ isOpen, onClose, party, myMember, netBalance, onDeleteParty, onLeaveParty }: PartySettingsModalProps) => {
  const { addToast } = useToastStore();
  const { updateParty } = usePartyStore();

  const [partyName, setPartyName] = useState(party.name);
  const [isUpdating, setIsUpdating] = useState(false);

  const canEditName = myMember.role === 'owner' || myMember.role === 'admin';
  const isOwner = myMember.role === 'owner';

  const handleUpdateName = async () => {
    if (!partyName.trim() || partyName === party.name) return;
    setIsUpdating(true);
    const result = await updateParty(party.id, { name: partyName.trim() });
    setIsUpdating(false);

    if (result.success) {
      addToast('Grup adı güncellendi.', 'success');
    } else {
      addToast(result.errorMsg || 'Güncellenirken hata oluştu.', 'error');
    }
  };

  const handleToggleArchive = async () => {
    setIsUpdating(true);
    const result = await updateParty(party.id, { is_archived: !party.is_archived }, myMember.id);
    setIsUpdating(false);

    if (result.success) {
      addToast(party.is_archived ? 'Grup arşivden çıkarıldı.' : 'Grup arşivlendi.', 'success');
    } else {
      addToast(result.errorMsg || 'İşlem başarısız.', 'error');
    }
  };

  const handleLeave = () => {
    if (party.is_archived) {
      addToast('Arşivlenmiş gruptan çıkılamaz. Önce arşivi kaldırın.', 'error');
      return;
    }
    if (netBalance !== 0) {
      addToast(`Gruptan ayrılabilmek için bakiyenizin sıfır olması gerekiyor (Mevcut: ${netBalance > 0 ? '+' : ''}${netBalance} TL).`, 'warning');
      return;
    }

    if (isOwner) {
      addToast('Kurucu gruptan ayrılamaz. Önce kuruculuğu devretmelisiniz.', 'error');
      return;
    }
    
    onClose();
    onLeaveParty();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Grup Ayarları">
      <div className="space-y-6">

        {/* Grup Adı */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Grup Adı</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              disabled={!canEditName}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white disabled:opacity-50"
            />
            {canEditName && (
              <Button onClick={handleUpdateName} isLoading={isUpdating} disabled={partyName === party.name || !partyName.trim()}>
                Kaydet
              </Button>
            )}
          </div>
        </div>

        {/* Yönetim Modu */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Grup Yönetim Tercihleri</h4>

          <div className="flex items-center justify-between opacity-60">
            <div>
              <h5 className="font-bold text-sm text-slate-900 dark:text-white">Demokrasi Modu</h5>
              <p className="text-xs text-slate-500 mt-0.5">Sadece kurucu değil, herkes harcama silebilir/düzenleyebilir.</p>
              <span className="text-[9px] bg-primary/10 text-primary-dark dark:text-primary-light px-1.5 py-0.5 rounded uppercase font-bold mt-1 inline-block">Yakında</span>
            </div>
            <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full relative cursor-not-allowed">
              <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
            </div>
          </div>

          <div className="flex items-center justify-between opacity-60">
            <div>
              <h5 className="font-bold text-sm text-slate-900 dark:text-white">Harcama Onay Sistemi</h5>
              <p className="text-xs text-slate-500 mt-0.5">Eklenen harcamalar gruptakiler onaylayınca kesinleşir.</p>
              <span className="text-[9px] bg-primary/10 text-primary-dark dark:text-primary-light px-1.5 py-0.5 rounded uppercase font-bold mt-1 inline-block">Yakında</span>
            </div>
            <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full relative cursor-not-allowed">
              <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
            </div>
          </div>
        </div>

        {/* Arşivleme */}
        {isOwner && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Partiyi Arşivle</h4>
            <p className="text-xs text-slate-500 mb-3">Arşivlenen gruplara yeni harcama eklenemez, ancak geçmiş kayıtlar okunabilir kalır.</p>
            <Button variant={party.is_archived ? "primary" : "outline"} fullWidth onClick={handleToggleArchive} isLoading={isUpdating}>
              {party.is_archived ? 'Arşivden Çıkar' : 'Grubu Arşivle'}
            </Button>
          </div>
        )}

        {/* Gruptan Ayrıl */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="danger" fullWidth onClick={handleLeave}>
            Gruptan Ayrıl
          </Button>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Gruptan ayrılabilmek için bakiyenizin tam olarak 0 (sıfır) olması gerekir.
          </p>
        </div>

        {/* Grubu Sil (Sadece Kurucu) */}
        {isOwner && onDeleteParty && (
          <div className="">
            <Button variant="danger" fullWidth onClick={() => { onClose(); onDeleteParty(); }}>
              Grubu Sil
            </Button>
          </div>
        )}

      </div>
    </Modal>
  );
};
