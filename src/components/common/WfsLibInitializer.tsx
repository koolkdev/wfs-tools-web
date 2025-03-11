import React from 'react';
import { Backdrop, CircularProgress, Typography, Box, Container } from '@mui/material';
import { useWfsLib } from '../../services/wfslib/WfsLibProvider';

export const WfsLibInitializer: React.FC = () => {
  const { loading } = useWfsLib();

  return (
    <Backdrop
      open={loading}
      sx={{
        zIndex: theme => theme.zIndex.drawer + 1,
        backgroundColor: 'background.default',
        color: 'primary.main',
        flexDirection: 'column',
      }}
    >
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100vh"
        >
          <CircularProgress size={80} thickness={4} />
          <Typography
            variant="h5"
            sx={{
              mt: 3,
              textAlign: 'center',
              color: 'text.secondary',
            }}
          >
            Loading WFS Exploration Tools
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 2,
              textAlign: 'center',
              color: 'text.disabled',
            }}
          >
            Initializing WebAssembly module...
          </Typography>
        </Box>
      </Container>
    </Backdrop>
  );
};
