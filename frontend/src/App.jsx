import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from './components/Layout.jsx';
import { RequireSignIn } from './components/RequireSignIn.jsx';
import { SessionProvider } from './components/SessionProvider.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import { AuthCallbackPage } from './pages/AuthCallbackPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LinkStatsPage } from './pages/LinkStatsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="auth/callback" element={<AuthCallbackPage />} />
              <Route
                path="dashboard"
                element={
                  <RequireSignIn>
                    <DashboardPage />
                  </RequireSignIn>
                }
              />
              <Route
                path="links/:code"
                element={
                  <RequireSignIn>
                    <LinkStatsPage />
                  </RequireSignIn>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </SessionProvider>
  );
}
