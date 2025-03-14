import type { WfsModuleType } from 'WfsLibModule';

// Store the module promise
let modulePromise: Promise<WfsModuleType> | null = null;

// Create a function that caches the module promise and dynamically imports the WASM module
export function getWfsLibModule(): Promise<WfsModuleType> {
  if (!modulePromise) {
    // Dynamically import the WebAssembly module
    modulePromise = import('../../assets/wasm/wfslib_web.js')
      .then(module => {
        return module.default();
      })
      .catch(error => {
        console.error('Failed to load WebAssembly module:', error);
        throw error;
      });
  }

  return modulePromise;
}

// Create and export the module promise for use with the `use` hook
export const wfsLibPromise = getWfsLibModule();
