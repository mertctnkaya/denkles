import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../shared/Icon';
import type { IconName } from '../shared/Icon';
import { BottomSheet } from '../shared/BottomSheet';
import { usePartyStore } from '../../store/partyStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const BottomNav = () => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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

  const handlePlusClick = () => {
    setIsSheetOpen(true);
  };

  const closeSheet = () => setIsSheetOpen(false);

  const handleAction = (action: 'new_share' | 'add_ghost' | 'new_group' | 'join_group') => {
    closeSheet();
    if (action === 'new_group' || action === 'join_group') {
      if (location.pathname !== '/') {
        navigate('/');
      }
    }
    setGlobalAction(action);
  };

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center w-full pointer-events-none">
        <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe pointer-events-auto shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center px-6 py-3 relative max-w-md mx-auto">

            <NavItem to="/" icon="home" label="Ana Sayfa" />
            <NavItem to="/parties" icon="users" label="Gruplar" />

            {/* Center Floating Action Button */}
            <div className="relative -top-6">
              <button 
                onClick={handlePlusClick}
                className="flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform active:scale-95 cursor-pointer"
              >
                <Icon name="plus" size={28} strokeWidth={2.5} />
              </button>
            </div>

            <NavItem to="/activity" icon="bell" label="Hareketler" />
            <NavItem to="/profile" icon="user" label="Profil" />

          </div>
        </div>
      </div>

      <BottomSheet isOpen={isSheetOpen} onClose={closeSheet}>
        <div className="space-y-2">
          {isPartyPage ? (
            <>
              <button 
                onClick={() => handleAction('new_share')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/10 text-primary-dark dark:text-primary-light hover:bg-primary/20 transition-colors font-bold text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon name="plus" size={20} />
                </div>
                <span>Yeni Harcama Oluştur</span>
              </button>

              {canManageMembers && !currentParty?.is_archived && (
                <button 
                  onClick={() => handleAction('add_ghost')}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-left mt-2"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
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
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/10 text-primary-dark dark:text-primary-light hover:bg-primary/20 transition-colors font-bold text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon name="plus" size={20} />
                </div>
                <span>Grup Oluştur</span>
              </button>

              <button 
                onClick={() => handleAction('join_group')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-left"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                  <Icon name="link" size={20} />
                </div>
                <span>Koda Katıl</span>
              </button>

              {activeParties.length > 0 && (
                <>
                  <div className="my-4 flex items-center gap-3 opacity-50">
                    <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Grupların</span>
                    <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1"></div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {activeParties.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          closeSheet();
                          navigate(`/party/${p.id}`);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </BottomSheet>
    </>
  );
};

const NavItem = ({ to, icon, label }: { to: string; icon: IconName; label: string }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 transition-colors cursor-pointer ${isActive
          ? 'text-primary'
          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
        }`
      }
    >
      <Icon name={icon} size={24} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
};
