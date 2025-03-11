import type { WfsModuleType } from 'WfsLibModule';

declare const WfsLibModule: () => Promise<WfsModuleType>;

export default WfsLibModule; 