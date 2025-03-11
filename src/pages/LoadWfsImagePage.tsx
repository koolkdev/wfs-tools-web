import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Alert,
  Snackbar,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Card,
  CardActionArea,
  CardContent,
  Paper,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { useDropzone } from 'react-dropzone';
import { useWfsLib } from '../services/wfslib/WfsLibProvider';
import { useNavigate } from 'react-router-dom';
const FileUploadCard = ({
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
          ) : (
            <CloudUploadIcon fontSize="large" color="primary" />
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
  const { createDevice, loading: moduleLoading } = useWfsLib();

  const [encryptionType, setEncryptionType] = useState<'plain' | 'mlc' | 'usb'>('plain');
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
  });

  const otpDropzone = useDropzone({
    onDrop: handleDrop(setOtpFile),
    accept: { 'application/octet-stream': ['.bin'] },
  });

  const seepromDropzone = useDropzone({
    onDrop: handleDrop(setSeepromFile),
    accept: { 'application/octet-stream': ['.bin'] },
  });

  const isLoadEnabled = () => {
    if (moduleLoading || loading) return false;
    return (
      wfsFile &&
      (encryptionType === 'plain' ||
        (encryptionType === 'mlc' && otpFile) ||
        (encryptionType === 'usb' && otpFile && seepromFile))
    );
  };

  const handleLoadImage = async () => {
    setLoading(true);
    setError(null);
    try {
      await createDevice(wfsFile!, encryptionType, otpFile || undefined, seepromFile || undefined);
      navigate('/browse/');
    } catch (e) {
      setError(e.message || 'An error occurred during loading.');
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
        Load WFS Image
      </Typography>

      <ToggleButtonGroup
        color="primary"
        fullWidth
        value={encryptionType}
        exclusive
        onChange={(e, val) => val && setEncryptionType(val)}
        sx={{ mb: 3 }}
      >
        <ToggleButton value="plain">Plain</ToggleButton>
        <ToggleButton value="mlc">MLC</ToggleButton>
        <ToggleButton value="usb">USB</ToggleButton>
      </ToggleButtonGroup>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FileUploadCard
            title="Select WFS Image"
            file={wfsFile}
            getRootProps={wfsDropzone.getRootProps}
            getInputProps={wfsDropzone.getInputProps}
          />
        </Grid>

        {(encryptionType === 'mlc' || encryptionType === 'usb') && (
          <Grid item xs={encryptionType === 'usb' ? 6 : 12}>
            <FileUploadCard
              title="Select OTP File"
              file={otpFile}
              getRootProps={otpDropzone.getRootProps}
              getInputProps={otpDropzone.getInputProps}
            />
          </Grid>
        )}

        {encryptionType === 'usb' && (
          <Grid item xs={6}>
            <FileUploadCard
              title="Select SEEPROM File"
              file={seepromFile}
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
        <Alert severity="info">Provide additional key files based on your encryption type.</Alert>
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
