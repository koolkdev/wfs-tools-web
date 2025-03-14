import React, { createContext, useState, useContext, useMemo, useRef, use } from 'react';
import type { WfsModuleType, WfsDevice, Device } from 'WfsLibModule';
import { JSFileDevice } from './jsFileDevice.js';
import { WfsAsyncQueue } from './wfsAsyncQueue.js';
import { wfsLibPromise } from './wfsLibLoader';

interface WfsLibContextType {
  module: WfsModuleType;
  device: WfsDevice | null;
  asyncQueue: WfsAsyncQueue;
  createDevice: (
    file: File,
    encryptionType: 'plain' | 'mlc' | 'usb',
    otpFile?: File,
    seepromFile?: File,
  ) => Promise<WfsDevice>;
}

// Create a default context that will be properly initialized when the provider is used
const WfsLibContext = createContext<WfsLibContextType | null>(null);

export const WfsLibProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load the module with the use hook - this will trigger Suspense if not ready
  const module = use(wfsLibPromise);

  const [device, setDevice] = useState<WfsDevice | null>(null);
  const jsDevice = useRef<Device | null>(null);

  // Create a single async queue instance for this provider
  const asyncQueue = useMemo(() => new WfsAsyncQueue(), []);

  const createDevice = async (
    file: File,
    encryptionType: 'plain' | 'mlc' | 'usb',
    otpFile?: File,
    seepromFile?: File,
  ): Promise<WfsDevice> => {
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
      device,
      asyncQueue,
      createDevice,
    }),
    [module, device],
  );

  return <WfsLibContext.Provider value={contextValue}>{children}</WfsLibContext.Provider>;
};

export const useWfsLib = () => {
  const context = useContext(WfsLibContext);
  if (!context) {
    throw new Error('useWfsLib must be used within a WfsLibProvider');
  }
  return context;
};
