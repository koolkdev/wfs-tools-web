import { useState, useEffect } from 'react';
import { WfsLibLoader } from '../services/wfslib/loader';
import type { WfsModuleType } from 'WfsLibModule';

export function useWfsLib() {
  const [module, setModule] = useState<WfsModuleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loader = WfsLibLoader.getInstance();

    loader
      .loadModule()
      .then(setModule)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { module, loading, error };
}
