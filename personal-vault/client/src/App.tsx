import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VaultPage } from './pages/VaultPage';
import { LockScreen } from './components/LockScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, encryptionKey, user } = useAuthStore();

  // Not logged in at all
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but locked (no encryption key)
  if (!isAuthenticated || !encryptionKey) {
    return <LockScreen />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, encryptionKey } = useAuthStore();

  if (isAuthenticated && encryptionKey) {
    return <Navigate to="/vault" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-vault-darker">
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/vault"
            element={
              <ProtectedRoute>
                <VaultPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/vault" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
