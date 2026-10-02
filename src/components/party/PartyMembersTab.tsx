import { useState } from 'react';
import type { Party, PartyMember } from '../../types/database';
import { usePartyStore } from '../../store/partyStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { Icon } from '../shared/Icon';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';

import { useShareStore } from '../../store/shareStore';

interface PartyMembersTabProps {
  party: Party;
  members: PartyMember[];
}

export const PartyMembersTab = ({ party, members }: PartyMembersTabProps) => {
  const { user } = useAuthStore();
  const { updateMemberRole, removeMember, addShadowMember } = usePartyStore();
  const { fetchShares } = useShareStore();
  const { addToast } = useToastStore();

  const [isAddGhostModalOpen, setIsAddGhostModalOpen] = useState(false);
  const [ghostName, setGhostName] = useState('');
  const [isAddingGhost, setIsAddingGhost] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string, name: string } | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [memberToTransfer, setMemberToTransfer] = useState<{ id: string, name: string } | null>(null);

  // Current user's member object
  const me = (members || []).find(m => m.profile_id === user?.id);
  const myRole = me?.role || 'member';

  const canManageRoles = myRole === 'owner';
  const canManageMembers = myRole === 'owner' || myRole === 'admin';

  const handleAddGhost = async () => {
    if (!ghostName.trim()) return;
    setIsAddingGhost(true);
    const result = await addShadowMember(party.id, ghostName.trim());
    setIsAddingGhost(false);
    
    if (result.success) {
      setIsAddGhostModalOpen(false);
      setGhostName('');
      addToast('Hayalet üye eklendi.', 'success');
    } else {
      addToast(result.errorMsg || 'Hayalet üye eklenirken hata oluştu.', 'error');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'owner' | 'admin' | 'member') => {
    if (!canManageRoles) return;
    const result = await updateMemberRole(party.id, memberId, newRole);
    if (result.success) {
      addToast('Rol güncellendi.', 'success');
    } else {
      addToast(result.errorMsg || 'Rol güncellenirken hata oluştu.', 'error');
    }
  };

  const openDeleteModal = (memberId: string, name: string) => {
    setMemberToDelete({ id: memberId, name });
    setIsDeleteModalOpen(true);
  };

  const openTransferModal = (memberId: string, name: string) => {
    setMemberToTransfer({ id: memberId, name });
    setIsTransferModalOpen(true);
  };

  const confirmRemove = async () => {
    if (!canManageMembers || !memberToDelete) return;
    
    const result = await removeMember(party.id, memberToDelete.id);
    
    if (!result.success) {
      addToast(result.errorMsg || 'Hata oluştu.', 'error');
    } else {
      await fetchShares(party.id);
      addToast('Kişi başarıyla çıkarıldı.', 'success');
    }
    
    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
  };

  const confirmTransfer = async () => {
    if (!canManageRoles || !memberToTransfer) return;
    
    const result = await updateMemberRole(party.id, memberToTransfer.id, 'owner');
    
    if (result.success) {
      addToast('Kuruculuk başarıyla devredildi.', 'success');
      setIsTransferModalOpen(false);
      setMemberToTransfer(null);
    } else {
      addToast(result.errorMsg || 'Kuruculuk devredilirken hata oluştu.', 'error');
    }
  };

  return (
    <div className="py-4 space-y-4">
      {canManageMembers && !party.is_archived && (
        <button
          onClick={() => setIsAddGhostModalOpen(true)}
          className="w-full flex items-center justify-center cursor-pointer gap-2 p-3 bg-primary/10 text-primary-dark dark:text-primary-light hover:bg-primary/20 rounded-2xl font-bold transition-colors border border-primary/20 border-dashed"
        >
          <Icon name="plus" size={18} />
          Uygulaması Olmayan Üye (Hayalet) Ekle
        </button>
      )}

      <div className="space-y-3">
        {members.map(member => {
          const isMe = member.profile_id === user?.id;
          const isGhost = member.profile_id === null;

          return (
            <div key={member.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-lg uppercase shrink-0">
                {member.display_name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {member.display_name} {isMe && '(Sen)'}
                  </h4>
                  {isGhost && (
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                      Hayalet
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {member.role === 'owner' && <span className="text-xs text-primary font-bold">Kurucu</span>}
                  {member.role === 'admin' && <span className="text-xs text-orange-500 font-bold">Yönetici</span>}
                  {member.role === 'member' && !isGhost && <span className="text-xs text-slate-500 font-medium">Üye</span>}
                </div>
              </div>

              {/* Actions Menu */}
              {canManageMembers && !isMe && member.role !== 'owner' && (
                <div className="flex items-center gap-2">
                  {isGhost ? (
                    <button
                      onClick={() => addToast('Davet linki oluşturma yakında eklenecek!', 'info')}
                      className="text-[10px] md:text-xs font-bold cursor-pointer px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Kullanıcıyı Davet Et
                    </button>
                  ) : canManageRoles ? (
                    <>
                      {member.role === 'member' ? (
                        <button
                          onClick={() => handleRoleChange(member.id, 'admin')}
                          className="text-[10px] md:text-xs cursor-pointer font-bold px-2 py-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
                        >
                          Yönetici Yap
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(member.id, 'member')}
                          className="text-[10px] md:text-xs cursor-pointer font-bold px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Yetkiyi Al
                        </button>
                      )}
                      <button
                        onClick={() => openTransferModal(member.id, member.display_name)}
                        className="text-[10px] md:text-xs cursor-pointer font-bold px-2 py-1.5 bg-primary/10 text-primary-dark dark:text-primary-light rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        Kurucu Yap
                      </button>
                    </>
                  ) : null}

                  <button
                    onClick={() => openDeleteModal(member.id, member.display_name)}
                    className="p-1.5 text-slate-400 cursor-pointer hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isAddGhostModalOpen}
        onClose={() => !isAddingGhost && setIsAddGhostModalOpen(false)}
        title="Hayalet Üye Ekle"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Uygulamayı kullanmayan biri için hayalet profil oluşturun. Onun harcamalarını siz takip edebilirsiniz.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Ad Soyad</label>
            <input
              type="text"
              value={ghostName}
              onChange={(e) => setGhostName(e.target.value)}
              placeholder="Örn: Ayşe Yılmaz"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="danger" fullWidth onClick={() => setIsAddGhostModalOpen(false)} disabled={isAddingGhost}>
              İptal
            </Button>
            <Button variant="primary" fullWidth onClick={handleAddGhost} isLoading={isAddingGhost} disabled={!ghostName.trim()}>
              Ekle
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Kişiyi Çıkar"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white">{memberToDelete?.name}</span> adlı kişiyi gruptan çıkarmak istediğinize emin misiniz? (Bu kişinin dahil olduğu harcamalar da etkilenecektir)
          </p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setIsDeleteModalOpen(false)}>
              İptal
            </Button>
            <Button variant="danger" fullWidth onClick={confirmRemove}>
              Çıkar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Kuruculuğu Devret"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Grubun kuruculuğunu <span className="font-bold text-slate-900 dark:text-white">{memberToTransfer?.name}</span> adlı kişiye devretmek istediğinize emin misiniz? 
            Bu işlemi onaylarsanız <span className="font-bold text-rose-500">sizin yetkiniz "Yönetici" olarak düşürülecektir.</span>
          </p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setIsTransferModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" fullWidth onClick={confirmTransfer}>
              Onayla ve Devret
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
