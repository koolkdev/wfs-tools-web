import React, { createContext, useState, useContext, useEffect, useMemo, useRef } from 'react';
import type { WfsModuleType, WfsDevice, Device } from 'WfsLibModule';
import { JSFileDevice } from './jsFileDevice.js';
import { WfsAsyncQueue } from './wfsAsyncQueue.js';

interface WfsLibContextType {
  module: WfsModuleType | null;
  loading: boolean;
  device: WfsDevice | null;
  asyncQueue: WfsAsyncQueue;
  createDevice: (
    file: File,
    encryptionType: 'plain' | 'mlc' | 'usb',
    otpFile?: File,
    seepromFile?: File,
  ) => Promise<WfsDevice>;
}

const WfsLibContext = createContext<WfsLibContextType>({
  module: null,
  loading: true,
  device: null,
  asyncQueue: new WfsAsyncQueue(), // Provide a default instance
  createDevice: async () => {
    throw new Error('WfsLib not initialized');
  },
});

export const WfsLibProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [module, setModule] = useState<WfsModuleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<WfsDevice | null>(null);
  const jsDevice = useRef<Device | null>(null);

  // Create a single async queue instance for this provider
  const asyncQueue = useMemo(() => new WfsAsyncQueue(), []);

  useEffect(() => {
    const loadModule = async () => {
      const WfsLibModule = (await import('../../assets/wasm/wfslib_web.js')).default;
      return await WfsLibModule();
    };
    loadModule()
      .then(setModule)
      .finally(() => setLoading(false));
  }, []);

  const createDevice = async (
    file: File,
    encryptionType: 'plain' | 'mlc' | 'usb',
    otpFile?: File,
    seepromFile?: File,
  ): Promise<WfsDevice> => {
    if (!module) {
      throw new Error('WfsLib module not loaded');
    }

    return asyncQueue.execute(async () => {
      // Create JS file device, and keep a ref
      jsDevice.current = module.Device.implement(new JSFileDevice(file, 9, true));

      let key: Uint8Array | undefined;

      // Generate key based on encryption type
      if (encryptionType === 'mlc') {
        if (!otpFile) throw new Error('OTP file required for MLC encryption');
        const otpData = new Uint8Array(await otpFile.arrayBuffer());
        key = module.getMLCKeyFromOTP(otpData);
      } else if (encryptionType === 'usb') {
        if (!otpFile || !seepromFile)
          throw new Error('OTP and SEEPROM files required for USB encryption');
        const otpData = new Uint8Array(await otpFile.arrayBuffer());
        const seepromData = new Uint8Array(await seepromFile.arrayBuffer());
        key = module.getUSBKey(otpData, seepromData);
      }

      // Open WFS device
      const wfsDevice = await module.WfsDevice.Open(jsDevice.current, key || new Uint8Array());

      // Set the device in context
      setDevice(wfsDevice);

      return wfsDevice;
    });
  };

  const contextValue = useMemo(
    () => ({
      module,
      loading,
      device,
      asyncQueue,
      jsDevice,
      createDevice,
    }),
    [module, loading, device, asyncQueue, jsDevice],
  );

  return <WfsLibContext.Provider value={contextValue}>{children}</WfsLibContext.Provider>;
};

export const useWfsLib = () => useContext(WfsLibContext);
