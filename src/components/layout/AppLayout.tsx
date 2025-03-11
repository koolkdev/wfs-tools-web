import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, IconButton } from '@mui/material';
import { Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeContext';
import wfsLogoLight from '../../assets/wfs-logo-light.svg'; // Light theme logo
import wfsLogoDark from '../../assets/wfs-logo-dark.svg'; // Dark theme logo

const AppLayout: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: '100vw' }}>
      <AppBar position="static">
        <Toolbar>
          <Box
            component="img"
            src={themeMode === 'dark' ? wfsLogoDark : wfsLogoLight}
            alt="WFS Tools Logo"
            sx={{ height: 48, width: 96, mr: 2 }}
          />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WFS Tools
          </Typography>
          <IconButton color="inherit" onClick={toggleTheme}>
            {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ flexGrow: 1, mt: 4, mb: 4 }}>
        <Outlet /> {/* This is where child routes will be rendered */}
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} WFS Tools
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default AppLayout;
