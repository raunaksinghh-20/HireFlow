import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import useAuthStore from './store/authStore';

// Public
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Shared
import ProfilePage from './pages/ProfilePage';
import TranscriptPage from './pages/TranscriptPage';
import EvaluationPage from './pages/EvaluationPage';

// Recruiter / HR pages
import RecruiterDashboard from './pages/DashboardPage';
import RecruiterJobsPage from './pages/JobsPage';
import RecruiterJobDetailPage from './pages/JobDetailPage';
import RecruiterCandidatesPage from './pages/CandidatesPage';
import RecruiterEvaluationPage from './pages/EvaluationPage';
import RecruiterTranscriptPage from './pages/TranscriptPage';
import InterviewPage from './pages/InterviewPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Candidate pages
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import JobBrowsePage from './pages/candidate/JobBrowsePage';
import MyInterviewsPage from './pages/candidate/MyInterviewsPage';
import CandidateAnalyticsPage from './pages/candidate/CandidateAnalyticsPage';
import InterviewLanding from './pages/candidate/InterviewLanding';
import InterviewRoom from './pages/candidate/InterviewRoom';
import InterviewDone from './pages/candidate/InterviewDone';

function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-hairline py-6">
        <div className="w-full px-6 lg:px-12 flex items-center justify-between">
          <span className="text-micro text-muted">© 2026 HireFlow AI</span>
          <span className="text-micro text-muted">AI-Powered Recruitment</span>
        </div>
      </footer>
    </div>
  );
}

/** Smart default redirect based on user role */
function DefaultRedirect() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user?.role || 'candidate';
  if (role === 'candidate') return <Navigate to="/candidate/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#17171c',
            color: '#ffffff',
            border: '1px solid #d9d9dd',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error: { iconTheme: { primary: '#b30000', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* ─── Shared ─────────────────────────────── */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/transcript/:interviewId" element={<TranscriptPage />} />
          <Route path="/evaluation" element={<EvaluationPage />} />

          {/* ─── Recruiter / HR routes ───────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'hr']}>
                <RecruiterDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'hr']}>
                <RecruiterJobsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:jobId"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'hr']}>
                <RecruiterJobDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'hr']}>
                <RecruiterCandidatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interviews"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'hr']}>
                <InterviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'hr']}>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'hr']}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* ─── Candidate routes ────────────────────── */}
          <Route
            path="/candidate/dashboard"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/jobs"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <JobBrowsePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/interviews"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <MyInterviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/analytics"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/interviews/landing"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <InterviewLanding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/interviews/room"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <InterviewRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/interviews/done"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <InterviewDone />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Default redirect based on role */}
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
