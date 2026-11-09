import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { JoinPage } from './pages/JoinPage';
import { ListPage } from './pages/ListPage';
import { ListsPage } from './pages/ListsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { SyncProvider } from './providers/SyncProvider';
import { ToastProvider } from './providers/ToastProvider';
import { SetupNotice } from './components/SetupNotice';
import { SplashScreen } from './components/SplashScreen';

function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <SplashScreen label="Sjekker innlogging …" />;
  if (status === 'unconfigured') return <SetupNotice />;
  if (status === 'signed-out') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/logg-inn?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/logg-inn" element={<AuthPage />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<ListsPage />} />
        <Route path="/lister/:listId" element={<ListPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SyncProvider>
            <AppRoutes />
          </SyncProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
