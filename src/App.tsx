import { lazy, Suspense } from 'react';
import { ThemeProvider } from './components/theme-provider';
import { WfsLibProvider } from './services/wfslib/WfsLibProvider';
import { LoadingScreen } from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';

const AppRouter = lazy(() => import('./router/AppRouter'));

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="wfs-tools-theme">
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <WfsLibProvider>
            <AppRouter />
          </WfsLibProvider>
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
