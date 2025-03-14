import React from 'react';
import { CircularProgress, Box, Container } from '@mui/material';
import logo from '../../assets/logo.svg';

export const LoadingScreen: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundColor: theme => theme.palette.background.default,
          zIndex: theme => theme.zIndex.drawer + 1,
        }}
      >
        <Box mb={4}>
          <img
            src={logo}
            alt="WFS Explorer"
            loading="lazy"
            style={{
              maxWidth: '100%',
              width: '500px',
              height: 'auto',
              animation: 'pulse 2s infinite',
            }}
          />
        </Box>

        <CircularProgress size={70} thickness={3.5} />
      </Box>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </Container>
  );
};
