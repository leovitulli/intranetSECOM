import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const News = lazy(() => import('./pages/News'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Suggestions = lazy(() => import('./pages/Suggestions'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ReportsPremium = lazy(() => import('./pages/ReportsPremium'));
const ProfileV2 = lazy(() => import('./pages/ProfileV2'));
const SendNotification = lazy(() => import('./pages/SendNotification'));
const Cronograma = lazy(() => import('./pages/Cronograma'));
const Radar = lazy(() => import('./pages/Radar'));
const RadarNoticias = lazy(() => import('./pages/RadarNoticias'));
const InstagramInsights = lazy(() => import('./pages/InstagramInsights'));
const DashboardV3 = lazy(() => import('./pages/DashboardV3'));
const AgendaV3 = lazy(() => import('./pages/AgendaV3'));
const NewsV3 = lazy(() => import('./pages/NewsV3'));
const CronogramaV3 = lazy(() => import('./pages/CronogramaV3'));



function AppRoutes() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
      return <LoadingScreen />
  }

  return (
    <NotificationProvider>
      <DataProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route element={user ? <Layout /> : <Navigate to="/login" />}>
              <Route index element={<DashboardV3 />} />
              <Route path="dashboard" element={<DashboardV3 />} />
              <Route path="agenda" element={<AgendaV3 />} />
              <Route path="calendario" element={<CalendarPage />} />
              <Route path="sugestoes" element={<Suggestions />} />
              <Route path="relatorios" element={user && (user.role === 'admin' || user.role === 'desenvolvedor') ? <ReportsPremium /> : <Navigate to="/" />} />
              <Route path="noticias" element={<NewsV3 />} />
              <Route path="perfil" element={<ProfileV2 />} />
              <Route path="notificacoes" element={<SendNotification />} />
              <Route path="cronograma" element={<CronogramaV3 />} />
              <Route path="radar-secom" element={<Radar />} />
              <Route path="radar-noticias" element={<RadarNoticias />} />
              {/* Página oculta (apenas para admin/desenvolvedor) */}
              <Route path="instagram-insights" element={user && (user.role === 'admin' || user.role === 'desenvolvedor') ? <InstagramInsights /> : <Navigate to="/" />} />
              <Route path="dashboard-v3" element={user && (user.role === 'admin' || user.role === 'desenvolvedor') ? <DashboardV3 /> : <Navigate to="/" />} />
              <Route path="agenda-v3" element={user && (user.role === 'admin' || user.role === 'desenvolvedor') ? <AgendaV3 /> : <Navigate to="/" />} />
              <Route path="noticias-v3" element={user && (user.role === 'admin' || user.role === 'desenvolvedor') ? <NewsV3 /> : <Navigate to="/" />} />
              <Route path="cronograma-v3" element={user && (user.role === 'admin' || user.role === 'desenvolvedor') ? <CronogramaV3 /> : <Navigate to="/" />} />
            </Route>
          </Routes>
        </Suspense>
      </DataProvider>
    </NotificationProvider>
  );
}


function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
