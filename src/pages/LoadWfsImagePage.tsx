import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  Alert,
  Snackbar,
  ButtonGroup,
  useTheme,
  CircularProgress,
  CardContent,
  Card,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDropzone } from 'react-dropzone';
import { useWfsLib } from '../services/wfslib/WfsLibProvider';
import { useNavigate } from 'react-router-dom';

const DropzoneCard = ({
  title,
  file,
  getRootProps,
  getInputProps,
}: {
  title: string;
  file: File | null;
  getRootProps: any;
  getInputProps: any;
}) => {
  const theme = useTheme();

  return (
    <Card
      {...getRootProps()}
      sx={{
        border: `2px dashed ${file ? theme.palette.success.main : theme.palette.primary.main}`,
        cursor: 'pointer',
        '&:hover': { backgroundColor: theme.palette.action.hover },
      }}
    >
      <CardContent sx={{ textAlign: 'center' }}>
        <input {...getInputProps()} />
        <CloudUploadIcon fontSize="large" color="action" />
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          {file ? file.name : title}
        </Typography>
      </CardContent>
    </Card>
  );
};

const LoadWfsImagePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { createDevice, loading: moduleLoading } = useWfsLib();

  const [encryptionType, setEncryptionType] = useState<'plain' | 'mlc' | 'usb'>('plain');
  const [wfsFileHandle, setWfsFileHandle] = useState<File | null>(null);
  const [otpFileHandle, setOtpFileHandle] = useState<File | null>(null);
  const [seepromFileHandle, setSeepromFileHandle] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onDropWfsFile = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setWfsFileHandle(acceptedFiles[0]);
  }, []);

  const onDropOtpFile = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setOtpFileHandle(acceptedFiles[0]);
  }, []);

  const onDropSeepromFile = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setSeepromFileHandle(acceptedFiles[0]);
  }, []);

  const { getRootProps: getWfsRootProps, getInputProps: getWfsInputProps } = useDropzone({
    onDrop: onDropWfsFile,
    accept: { 'application/octet-stream': ['.wfs', '.img', '.bin'] },
    multiple: false,
  });

  const { getRootProps: getOtpRootProps, getInputProps: getOtpInputProps } = useDropzone({
    onDrop: onDropOtpFile,
    accept: { 'application/octet-stream': ['.bin'] },
    multiple: false,
  });

  const { getRootProps: getSeepromRootProps, getInputProps: getSeepromInputProps } = useDropzone({
    onDrop: onDropSeepromFile,
    accept: { 'application/octet-stream': ['.bin'] },
    multiple: false,
  });

  const isLoadButtonEnabled = () => {
    if (moduleLoading || isLoading) return false;
    switch (encryptionType) {
      case 'plain':
        return !!wfsFileHandle;
      case 'mlc':
        return !!wfsFileHandle && !!otpFileHandle;
      case 'usb':
        return !!wfsFileHandle && !!otpFileHandle && !!seepromFileHandle;
    }
  };

  const handleLoadImage = async () => {
    if (!wfsFileHandle) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await createDevice(
        wfsFileHandle,
        encryptionType,
        otpFileHandle || undefined,
        seepromFileHandle || undefined,
      );
      navigate('/browse/');
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'An unknown error occurred while loading the WFS image';
      setErrorMessage(errorMsg);
    }

    setIsLoading(false);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Load WFS Image
        </Typography>

        {/* Encryption Type Selection */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <ButtonGroup
            variant="outlined"
            aria-label="encryption type selection"
            color="primary"
            fullWidth
          >
            <Button
              onClick={() => setEncryptionType('plain')}
              variant={encryptionType === 'plain' ? 'contained' : 'outlined'}
            >
              Plain
            </Button>
            <Button
              onClick={() => setEncryptionType('mlc')}
              variant={encryptionType === 'mlc' ? 'contained' : 'outlined'}
            >
              MLC
            </Button>
            <Button
              onClick={() => setEncryptionType('usb')}
              variant={encryptionType === 'usb' ? 'contained' : 'outlined'}
            >
              USB
            </Button>
          </ButtonGroup>
        </Box>

        <Grid container spacing={2}>
          {/* WFS Image Dropzone */}
          <Grid item xs={12}>
            <DropzoneCard
              title="WFS Image"
              file={wfsFileHandle}
              getRootProps={getWfsRootProps}
              getInputProps={getWfsInputProps}
            />
          </Grid>

          {/* Conditional Key File Inputs */}
          {(encryptionType === 'mlc' || encryptionType === 'usb') && (
            <Grid item xs={encryptionType === 'usb' ? 6 : 12}>
              <DropzoneCard
                title="OTP File"
                file={otpFileHandle}
                getRootProps={getOtpRootProps}
                getInputProps={getOtpInputProps}
              />
            </Grid>
          )}

          {encryptionType === 'usb' && (
            <Grid item xs={6}>
              <DropzoneCard
                title="SEEPROM File"
                file={seepromFileHandle}
                getRootProps={getSeepromRootProps}
                getInputProps={getSeepromInputProps}
              />
            </Grid>
          )}

          {/* Load Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              disabled={!isLoadButtonEnabled()}
              fullWidth
              onClick={handleLoadImage}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Loading...' : 'Load WFS Image'}
            </Button>
          </Grid>
        </Grid>

        {/* Information Alert */}
        <Box mt={2}>
          <Alert severity="info">
            Select your WFS image file and provide additional key files based on the encryption
            type.
          </Alert>
        </Box>
      </Paper>

      {/* Error Snackbar */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LoadWfsImagePage;
