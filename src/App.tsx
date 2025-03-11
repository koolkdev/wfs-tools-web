import { ThemeProvider } from './theme/ThemeContext';
import { WfsLibProvider } from './services/wfslib/WfsLibProvider';
import { WfsLibInitializer } from './components/common/WfsLibInitializer';

import AppRouter from './router/AppRouter';
function App() {
  return (
    <WfsLibProvider>
      <ThemeProvider>
        <WfsLibInitializer />
        <AppRouter />
      </ThemeProvider>
    </WfsLibProvider>
  );
}

export default App;
