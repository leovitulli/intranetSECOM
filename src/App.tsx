import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import News from './pages/News';
import Agenda from './pages/Agenda';
import Suggestions from './pages/Suggestions';
import CalendarPage from './pages/CalendarPage';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import SendNotification from './pages/SendNotification';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <NotificationProvider>
      <DataProvider>
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
      </DataProvider>
    </NotificationProvider>
  );
}

import ErrorBoundary from './components/ErrorBoundary';

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
