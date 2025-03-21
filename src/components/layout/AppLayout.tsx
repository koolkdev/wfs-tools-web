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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 500,
        height: '100vh',
        maxHeight: '100vh',
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <Box
            component="img"
            src={themeMode === 'dark' ? wfsLogoDark : wfsLogoLight}
            alt="WFS Tools Logo"
            sx={{ height: 48, width: 48, mr: 0 }}
          />
          {/* Stylized text in React */}
          <Typography
            variant="h6"
            sx={{
              userSelect: 'none',
              outline: 'none',
              fontWeight: 'bold',
              background:
                themeMode === 'dark'
                  ? 'linear-gradient(90deg, #3A86FF 0%, #4EA8DE 100%)'
                  : 'linear-gradient(90deg,rgb(171, 205, 225) 0%,rgb(158, 195, 255) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mr: 1,
            }}
          >
            WFS
          </Typography>

          <Typography
            variant="h6"
            sx={{
              userSelect: 'none',
              outline: 'none',
              fontWeight: 'normal',
              color: themeMode === 'dark' ? '#4EA8DE' : 'rgb(212, 226, 235)',
              flexGrow: 1,
            }}
          >
            Explorer
          </Typography>

          <IconButton color="inherit" onClick={toggleTheme}>
            {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      {/* Content area for child routes (DirectoryBrowserPage, etc.) */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Container
          disableGutters
          maxWidth={false}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            mt: 2,
            mb: 2,
          }}
        >
          <Outlet />
        </Container>
      </Box>

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
