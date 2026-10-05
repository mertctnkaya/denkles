import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { Landing } from './pages/Landing';
import { Profile } from './pages/Profile';
import { Activity } from './pages/Activity';
import { PartyDetail } from './pages/PartyDetail';
import { JoinPage } from './pages/JoinPage';
import { NotFound } from './pages/NotFound';
import { Parties } from './pages/Parties';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/shared/Toast';

function App() {
  const initTheme = useThemeStore((state) => state.initTheme);
  const { session, initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initTheme();
    initialize();
  }, [initTheme, initialize]);

  // Auth durumu yükleniyorsa boş bir sayfa (veya spinner) gösterelim
  if (isLoading) {
    return <div className="min-h-screen bg-slate-100 dark:bg-slate-950" />;
  }

  // Gerçek oturum durumu
  const isAuthenticated = !!session;

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {!isAuthenticated ? (
          <>
            {/* Giriş yapmamış kullanıcılar için Açılış Sayfası ve Giriş Ekranı */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/join/:code" element={<JoinPage />} />
            {/* Bilinmeyen rotalarda (örn: /parties) giriş yapmadığı için Landing'e atar */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/join/:code" element={<JoinPage />} />
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="/parties" element={<Parties />} />
            <Route path="/party/:id" element={<PartyDetail />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
