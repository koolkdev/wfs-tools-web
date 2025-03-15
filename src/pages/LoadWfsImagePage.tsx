import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import InsertDriveFile from '@mui/icons-material/InsertDriveFile';
import VpnKey from '@mui/icons-material/VpnKey';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import DeviceSelection, { DeviceType } from '../components/common/DeviceSelection';

import { useDropzone } from 'react-dropzone';
import { useWfsLib } from '../services/wfslib/WfsLibProvider';
import { useNavigate } from 'react-router-dom';
const FileUploadCard = ({
  title,
  file,
  isKey,
  getRootProps,
  getInputProps,
}: {
  title: string;
  file: File | null;
  isKey: boolean;
  getRootProps: any;
  getInputProps: any;
}) => {
  return (
    <Card
      variant="outlined"
      sx={{
        borderStyle: 'dashed',
        borderColor: file ? 'success.main' : 'primary.main', // Green when file is set
        backgroundColor: 'background.paper', // Light green when set
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
      }}
    >
      <CardActionArea {...getRootProps()} sx={{ p: 2 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <input {...getInputProps()} />

          {/* Show different icon based on file state */}
          {file ? (
            <CheckCircleIcon fontSize="large" color="success" />
          ) : isKey ? (
            <VpnKey fontSize="large" color="primary" />
          ) : (
            <InsertDriveFile fontSize="large" color="primary" />
          )}

          <Typography
            variant="subtitle1"
            sx={{
              mt: 2,
              fontWeight: file ? 'bold' : 'normal',
              color: file ? 'success.dark' : 'text.primary',
            }}
          >
            {file ? `✔ ${file.name}` : title}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

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
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Typography
        variant="h4"
        gutterBottom
        align="center"
        sx={{
          color: 'primary.main',
          fontWeight: 'bold',
          letterSpacing: 1,
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
          mb: 3,
        }}
      >
        Welcome!
      </Typography>

      <DeviceSelection
        selectedValue={deviceType}
        onChange={value => setDeviceType(value as 'plain' | 'mlc' | 'usb')}
      />

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FileUploadCard
            title="Select WFS Image"
            file={wfsFile}
            isKey={false}
            getRootProps={wfsDropzone.getRootProps}
            getInputProps={wfsDropzone.getInputProps}
          />
        </Grid>

        {(deviceType === 'mlc' || deviceType === 'usb') && (
          <Grid item xs={deviceType === 'usb' ? 6 : 12}>
            <FileUploadCard
              title="Select OTP File"
              file={otpFile}
              isKey={true}
              getRootProps={otpDropzone.getRootProps}
              getInputProps={otpDropzone.getInputProps}
            />
          </Grid>
        )}

        {deviceType === 'usb' && (
          <Grid item xs={6}>
            <FileUploadCard
              title="Select SEEPROM File"
              file={seepromFile}
              isKey={true}
              getRootProps={seepromDropzone.getRootProps}
              getInputProps={seepromDropzone.getInputProps}
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={!isLoadEnabled()}
            onClick={handleLoadImage}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? 'Loading...' : 'Load Image'}
          </Button>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Alert severity="info">
          All files are processed locally in your browser - no data is uploaded to any server.{' '}
        </Alert>
      </Box>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LoadWfsImagePage;
