import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useWfsLib } from '../services/wfslib/WfsLibProvider';

// shadcn components
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Custom components
import { FileUploadCard } from '@/components/file-upload-card';
import { DeviceSelection, DeviceType } from '@/components/device-selection';
import { Info, Loader2 } from 'lucide-react';

const LoadWfsImagePage = () => {
  const navigate = useNavigate();
  const { createDevice } = useWfsLib();

  const [deviceType, setDeviceType] = useState<DeviceType>('mlc');
  const [wfsFile, setWfsFile] = useState<File | null>(null);
  const [otpFile, setOtpFile] = useState<File | null>(null);
  const [seepromFile, setSeepromFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDrop = useCallback(
    (setter: React.Dispatch<React.SetStateAction<File | null>>) => (files: File[]) => {
      setter(files[0] || null);
    },
    [],
  );

  const wfsDropzone = useDropzone({
    onDrop: handleDrop(setWfsFile),
    accept: { 'application/octet-stream': ['.wfs', '.img', '.bin'] },
    multiple: false,
  });

  const otpDropzone = useDropzone({
    onDrop: handleDrop(setOtpFile),
    accept: { 'application/octet-stream': ['.bin'] },
    multiple: false,
  });

  const seepromDropzone = useDropzone({
    onDrop: handleDrop(setSeepromFile),
    accept: { 'application/octet-stream': ['.bin'] },
    multiple: false,
  });

  const isLoadEnabled = () => {
    if (loading) return false;
    return (
      wfsFile &&
      (deviceType === 'plain' ||
        (deviceType === 'mlc' && otpFile) ||
        (deviceType === 'usb' && otpFile && seepromFile))
    );
  };

  const handleLoadImage = async () => {
    if (!wfsFile) return;
    setLoading(true);
    setError(null);

    try {
      await createDevice(wfsFile, deviceType, otpFile || undefined, seepromFile || undefined);
      navigate('/browse/');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An error occurred during loading.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8 max-w-md mx-auto">
      <div className="bg-card rounded-lg shadow-lg border p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary mb-2">Welcome!</h1>
          <p className="text-muted-foreground text-sm">
            Please select your device type and add the required files below.
          </p>
        </div>

        <DeviceSelection
          selectedValue={deviceType}
          onChange={value => setDeviceType(value as DeviceType)}
        />

        <div className="grid grid-cols-1 gap-4 mb-4">
          <FileUploadCard
            title="Select WFS Image"
            file={wfsFile}
            isKey={false}
            getRootProps={wfsDropzone.getRootProps}
            getInputProps={wfsDropzone.getInputProps}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <FileUploadCard
            title="Select OTP File"
            file={otpFile}
            isKey={true}
            disabled={deviceType === 'plain'}
            getRootProps={otpDropzone.getRootProps}
            getInputProps={otpDropzone.getInputProps}
          />

          <FileUploadCard
            title="Select SEEPROM File"
            file={seepromFile}
            isKey={true}
            disabled={deviceType !== 'usb'}
            getRootProps={seepromDropzone.getRootProps}
            getInputProps={seepromDropzone.getInputProps}
          />
        </div>

        <Button
          className="w-full mb-6"
          size="lg"
          disabled={!isLoadEnabled()}
          onClick={handleLoadImage}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Load Image'
          )}
        </Button>

        <Alert variant="default" className="mb-2 rounded bg-secondary/30">
          <Info className="!text-primary" />
          <AlertDescription>
            All files are processed locally in your browser - no data is uploaded to any server.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default LoadWfsImagePage;
