import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useThemeStore } from '../store/themeStore';
import { Icon } from '../components/shared/Icon';
import type { IconName } from '../components/shared/Icon';
import { Button } from '../components/shared/Button';
import { Modal } from '../components/shared/Modal';

export const Profile = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuthStore();
  const { addToast } = useToastStore();
  const { isDarkMode, setTheme } = useThemeStore();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || 'Kullanıcı';
  const initial = fullName.charAt(0).toUpperCase();
  const email = user?.email || 'e-posta bulunamadı';

  const handleLogoutClick = () => {
    if (user?.is_anonymous) {
      
      setIsLogoutModalOpen(true);
    } else {
      executeLogout();
    }

  };

  const executeLogout = async () => {
    try {
      setIsLogoutModalOpen(false);
      await signOut();
      addToast('Başarıyla çıkış yapıldı.', 'info');
    } catch (error) {
      addToast('Çıkış yapılırken bir hata oluştu.', 'error');
    }
  };

  const menuItems: { icon: IconName; title: string; subtitle?: string }[] = [
    { icon: 'user', title: 'Hesap Bilgileri', subtitle: 'İsim, e-posta ve şifre' },
    { icon: 'card', title: 'Ödeme Yöntemleri', subtitle: 'IBAN ve Papara ekle' },
    { icon: 'bell', title: 'Bildirimler', subtitle: 'Push bildirim ayarları' },
    { icon: 'shield', title: 'Gizlilik ve Güvenlik', subtitle: 'Veri tercihleri' },
    { icon: 'help', title: 'Yardım ve Destek', subtitle: 'Sık sorulan sorular' },
  ];

  // AI Fikri: Dinamik Karma Skoru
  const karmaScore = 85; // İleride veritabanından gelecek
  const getKarmaColors = (score: number) => {
    if (score >= 90) return {
      bg: 'from-success-light/50 to-success-light/10 dark:from-success-dark/20 dark:to-transparent border-success/20',
      icon: 'text-success-dark dark:text-success',
      text: 'text-success-dark dark:text-success',
      message: 'Harika! Borçlarını her zaman vaktinde ödüyorsun.'
    };
    if (score >= 70) return {
      bg: 'from-warning-light/50 to-warning-light/10 dark:from-warning-dark/20 dark:to-transparent border-warning/20',
      icon: 'text-warning-dark dark:text-warning',
      text: 'text-warning-dark dark:text-warning',
      message: 'Fena değil. Borçlarını genelde vaktinde ödüyorsun.'
    };
    return {
      bg: 'from-danger-light/50 to-danger-light/10 dark:from-danger-dark/20 dark:to-transparent border-danger/20',
      icon: 'text-danger-dark dark:text-danger',
      text: 'text-danger-dark dark:text-danger',
      message: 'Dikkat! Borçlarını ödemekte gecikiyorsun.'
    };
  };
  const karma = getKarmaColors(karmaScore);

  return (
    <div className="p-6 md:p-0 pt-12 md:pt-6 pb-24 md:pb-6 max-w-2xl mx-auto w-full">
      {/* Üst Kısım: Başlık */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="md:hidden w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Icon name="back" size={20} />
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Profil Ayarları</h1>
      </div>

      {/* Profil Kartı */}
      <div className="bg-white dark:bg-card-dark rounded-3xl p-6 md:p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm mb-8 flex items-center gap-6">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-light dark:bg-primary-dark/30 rounded-2xl flex items-center justify-center text-primary font-bold text-3xl md:text-4xl border-2 border-white dark:border-slate-800 shadow-sm shrink-0 uppercase">
          {initial}
        </div>
        <div className="overflow-hidden">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white truncate">{fullName}</h2>
          <p className="text-sm md:text-base text-slate-500 font-medium truncate mt-1">{email}</p>
        </div>
      </div>

      {/* Tema Seçici */}
      <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-4 md:p-5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            <Icon name="moon" size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">Görünüm Modu</h3>
            <p className="text-sm text-slate-500 mt-0.5">Açık veya Koyu tema seçimi</p>
          </div>
        </div>

        {/* Switch Segment */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setTheme(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer ${!isDarkMode
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
          >
            Açık
          </button>
          <button
            onClick={() => setTheme(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer ${isDarkMode
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
          >
            Koyu
          </button>
        </div>
      </div>

      {/* Karma Puanı (AI Fikri) */}
      <div className={`bg-linear-to-r ${karma.bg} rounded-3xl p-6 md:p-8 border mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-300`}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="star" size={20} className={karma.icon} />
            <p className="font-bold text-lg text-slate-900 dark:text-white">Karma Puanı</p>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-sm">
            {karma.message}
          </p>
        </div>
        <div className="text-left md:text-right">
          <span className={`text-4xl font-black ${karma.text}`}>%{karmaScore}</span>
        </div>
      </div>

      {/* Menü Listesi */}
      <div className="bg-white dark:bg-card-dark rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        {menuItems.map((item, index) => (
          <div
            key={index}
            className={`group flex items-center p-4 md:p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${index !== menuItems.length - 1 ? 'border-b border-slate-200/60 dark:border-slate-800/50' : ''
              }`}
            onClick={() => addToast('Bu özellik yakında eklenecek!', 'info')}
          >
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-light dark:group-hover:bg-primary-dark/30 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-primary-light shrink-0 mr-4 md:mr-5 transition-all duration-300">
              <Icon name={item.icon} size={22} className="group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base group-hover:text-primary dark:group-hover:text-primary-light transition-colors">{item.title}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{item.subtitle}</p>
            </div>
            <Icon name="forward" size={20} className="text-slate-400 group-hover:text-primary dark:group-hover:text-primary-light group-hover:translate-x-1 transition-all duration-300" />
          </div>
        ))}
      </div>

      {/* Çıkış Yap Butonu */}
      {user?.is_anonymous && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-4 text-center">
          <Icon name="warning" size={24} className="text-orange-500 mx-auto mb-2" />
          <h3 className="font-bold text-orange-700 dark:text-orange-400 text-sm mb-1">Şu an Misafir Hesabındasınız!</h3>
          <p className="text-xs text-orange-600 dark:text-orange-300">
            Eğer çıkış yaparsanız bu hesaba bir daha giriş yapamazsınız. Tarayıcıyı kapattığınızda hesap kalır ama çıkış yaparsanız veya uygulamayı silerseniz geçmişteki tüm verilerinize erişiminiz sonsuza dek kaybolur. Hesabı kalıcı yapma özelliği çok yakında eklenecektir.
          </p>
        </div>
      )}

      <Button
        variant="danger"
        size="lg"
        fullWidth
        icon="logout"
        onClick={handleLogoutClick}
        className="bg-transparent border-2 border-danger! hover:bg-danger text-danger hover:text-white mt-2"
      >
        Çıkış Yap
      </Button>

      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Kalıcı Veri Kaybı Riski"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-left">
            <h3 className="font-bold text-orange-700 dark:text-orange-400 text-sm mb-1 flex items-center gap-2">
              <Icon name="warning" size={16} /> Şu an Misafir Hesabındasınız!
            </h3>
            <p className="text-xs text-orange-600 dark:text-orange-300 leading-relaxed">
              Çıkış yaparsanız bu hesaba ve geçmişteki tüm verilerinize (borçlar, alacaklar) bir daha <strong>asla</strong> ulaşamazsınız. Tarayıcıyı kapattığınızda sorun olmaz ama "Çıkış Yap" dediğiniz an hesap kalıcı olarak kilitlenir. Yine de çıkış yapmak istiyor musunuz?
            </p>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" fullWidth onClick={() => setIsLogoutModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" fullWidth onClick={executeLogout} className="bg-danger! hover:bg-danger/90! border-danger!">
              Evet, Çıkış Yap
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
