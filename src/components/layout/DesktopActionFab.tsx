import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../shared/Icon';
import { usePartyStore } from '../../store/partyStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const DesktopActionFab = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { parties, currentParty, members } = usePartyStore();
  const { user } = useAuthStore();
  const { setGlobalAction } = useUiStore();

  const isPartyPage = location.pathname.startsWith('/party/');
  const activeParties = parties.filter(p => !p.is_archived);

  let canManageMembers = false;
  if (isPartyPage && currentParty && user) {
    const myMember = members.find(m => m.profile_id === user.id);
    if (myMember?.role === 'owner' || myMember?.role === 'admin') {
      canManageMembers = true;
    }
  }

  // If in an archived party, hide the action button entirely
  if (isPartyPage && currentParty?.is_archived) {
    return null;
  }

  const handleAction = (action: 'new_share' | 'add_ghost' | 'new_group' | 'join_group') => {
    setIsOpen(false);
    if (action === 'new_group' || action === 'join_group') {
      if (location.pathname !== '/') {
        navigate('/');
      }
    }
    setGlobalAction(action);
  };

  return (
    <div className="hidden md:block fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      {isOpen && (
        <>
          {/* Backdrop to close when clicking outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Drop-up Menu */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 z-50">
            <div className="p-2 space-y-2">
              {isPartyPage ? (
                <>
                  <button
                    onClick={() => handleAction('new_share')}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl bg-primary/10 text-primary-dark dark:text-primary-light hover:bg-primary/20 transition-colors font-bold text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Icon name="plus" size={20} />
                    </div>
                    <span>Yeni Harcama Oluştur</span>
                  </button>

                  {canManageMembers && (
                    <button
                      onClick={() => handleAction('add_ghost')}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                        <Icon name="user" size={20} />
                      </div>
                      <span>Hayalet Üye Ekle</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleAction('new_group')}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl bg-primary/10 text-primary-dark dark:text-primary-light hover:bg-primary/20 transition-colors font-bold text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Icon name="plus" size={20} />
                    </div>
                    <span>Grup Oluştur</span>
                  </button>

                  <button
                    onClick={() => handleAction('join_group')}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                      <Icon name="link" size={20} />
                    </div>
                    <span>Koda Katıl</span>
                  </button>

                  {activeParties.length > 0 && (
                    <>
                      <div className="my-2 flex items-center gap-3 opacity-50 px-2">
                        <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Grupların</span>
                        <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
                      </div>

                      <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                        {activeParties.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/party/${p.id}`);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate text-sm">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all cursor-pointer relative z-50 ${isOpen ? 'rotate-45' : ''}`}
      >
        <Icon name="plus" size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};
