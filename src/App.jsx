import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SiteLayout from './components/site/SiteLayout.jsx';
import { Home, About, Calendar, Courses, Gallery, Process } from './pages/site/SitePages.jsx';
import Login from './pages/Login.jsx';
import Portal from './pages/Portal.jsx';
import Workspace from './pages/Workspace.jsx';
import AdminConsole from './pages/AdminConsole.jsx';
import Completers from './pages/Completers.jsx';
import Verify from './pages/Verify.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';

const LiveChat = lazy(() => import('./pages/LiveChat.jsx'));
const Exams = lazy(() => import('./pages/Exams.jsx'));
const ExamPortal = lazy(() => import('./pages/ExamPortal.jsx'));
const TakeExam = lazy(() => import('./pages/TakeExam.jsx'));
const FormPage = lazy(() => import('./pages/FormPage.jsx'));

const Loading = () => <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#00264d' }}>Loading…</div>;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/process" element={<Process />} />
            </Route>
            <Route path="/apply" element={<FormPage />} />
            <Route path="/f/:slug" element={<FormPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/exam-portal" element={<ExamPortal />} />
            <Route path="/exam-portal/attempt/:attemptId" element={<TakeExam />} />
            <Route path="/workspace" element={<RequireAuth><Workspace /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminConsole /></RequireAdmin></RequireAuth>} />
            <Route path="/completers" element={<RequireAuth><Completers /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><LiveChat /></RequireAuth>} />
            <Route path="/exams" element={<RequireAuth><Exams /></RequireAuth>} />
            <Route path="/portal/*" element={<RequireAuth><Portal /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
