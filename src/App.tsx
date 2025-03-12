import { lazy, Suspense } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { WfsLibProvider } from './services/wfslib/WfsLibProvider';
import { WfsLibInitializer } from './components/common/WfsLibInitializer';
import { Box, CircularProgress } from '@mui/material';

const LazyAppRouter = lazy(() => import('./router/AppRouter'));

const AppLoadingFallback = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100vh"
  >
    <CircularProgress size={60} />
  </Box>
);

function App() {
  return (
    <WfsLibProvider>
      <ThemeProvider>
        <WfsLibInitializer />
        <Suspense fallback={<AppLoadingFallback />}>
          <LazyAppRouter />
        </Suspense>
      </ThemeProvider>
    </WfsLibProvider>
  );
}

export default App;
