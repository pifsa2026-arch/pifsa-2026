import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Portal from './pages/Portal.jsx';
import Workspace from './pages/Workspace.jsx';
import AdminConsole from './pages/AdminConsole.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/workspace" element={<RequireAuth><Workspace /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminConsole /></RequireAdmin></RequireAuth>} />
          <Route
            path="/portal/*"
            element={
              <RequireAuth>
                <Portal />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
