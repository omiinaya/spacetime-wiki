import { Route, Routes, Navigate } from 'react-router-dom';
import React from 'react';

// Route-level page components — eagerly loaded for instant navigation
import PermalinkRedirect from './pages/PermalinkRedirect';
import GoogleCallback from './pages/GoogleCallback';
import OAuthCallback from './pages/OAuthCallback';
import OidcCallback from './pages/OidcCallback';
import SamlCallback from './pages/SamlCallback';

const HomeView = React.lazy(() => import('./pages/HomeView'));
const ActivityView = React.lazy(() => import('./pages/ActivityView'));
const FavoritesView = React.lazy(() => import('./pages/FavoritesView'));
const PageViewWrapper = React.lazy(() => import('./pages/PageViewWrapper'));
const SlugView = React.lazy(() => import('./pages/SlugView'));
const LoginView = React.lazy(() => import('./pages/LoginView'));
const PageEditor = React.lazy(() =>
  import('./pages/PageEditor').then((m) => ({ default: m.PageEditor })),
);
const GraphView = React.lazy(() => import('./components/GraphView'));

export const RouteFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

/** Routes rendered inside the AppLayout (sidebar + main area) */
export function AppLayoutRoutes({ userId }: { userId: string | null }) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <HomeView />
          </React.Suspense>
        }
      />
      <Route
        path="/new"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <PageEditor userId={userId} />
          </React.Suspense>
        }
      />
      <Route
        path="/page/:id"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <PageViewWrapper userId={userId} />
          </React.Suspense>
        }
      />
      <Route
        path="/page/:id/edit"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <PageEditor userId={userId} />
          </React.Suspense>
        }
      />
      <Route
        path="/p/:slug"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <SlugView />
          </React.Suspense>
        }
      />
      <Route
        path="/activity"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <ActivityView />
          </React.Suspense>
        }
      />
      <Route
        path="/favorites"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <FavoritesView />
          </React.Suspense>
        }
      />
      <Route
        path="/graph"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <GraphView />
          </React.Suspense>
        }
      />
      <Route
        path="/permalink/:id"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <PermalinkRedirect />
          </React.Suspense>
        }
      />
      <Route
        path="/oauth/google/callback"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <GoogleCallback />
          </React.Suspense>
        }
      />
      <Route
        path="/oauth/callback"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <OAuthCallback />
          </React.Suspense>
        }
      />
      <Route
        path="/oauth/oidc/callback"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <OidcCallback />
          </React.Suspense>
        }
      />
      <Route
        path="/auth/saml/callback"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <SamlCallback />
          </React.Suspense>
        }
      />
      <Route path="/templates" element={<Navigate to="/" replace />} />
      <Route
        path="/login"
        element={
          <React.Suspense fallback={<RouteFallback />}>
            <LoginView />
          </React.Suspense>
        }
      />
    </Routes>
  );
}
