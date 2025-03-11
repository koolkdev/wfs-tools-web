import WfsLibModule from '../../../public/wasm/wfslib_web.js';
import type { WfsModuleType } from 'WfsLibModule';

export class WfsLibLoader {
  private static instance: WfsLibLoader;
  private modulePromise: Promise<WfsModuleType> | null = null;

  private constructor() {}

  static getInstance(): WfsLibLoader {
    if (!WfsLibLoader.instance) {
      WfsLibLoader.instance = new WfsLibLoader();
    }
    return WfsLibLoader.instance;
  }

  async loadModule(): Promise<WfsModuleType> {
    if (!this.modulePromise) {
      this.modulePromise = WfsLibModule();
    }
    return this.modulePromise;
  }
}
