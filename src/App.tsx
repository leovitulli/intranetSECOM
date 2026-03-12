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
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const SendNotification = lazy(() => import('./pages/SendNotification'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <NotificationProvider>
      <DataProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="calendario" element={<CalendarPage />} />
              <Route path="sugestoes" element={<Suggestions />} />
              <Route path="relatorios" element={<Reports />} />
              <Route path="noticias" element={<News />} />
              <Route path="perfil" element={<Profile />} />
              <Route path="notificacoes" element={<SendNotification />} />
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
