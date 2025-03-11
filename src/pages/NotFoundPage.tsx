import React from 'react';
import { Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      sx={{ height: '100%', py: 4 }}
    >
      <Typography variant="h1" color="error" gutterBottom>
        404
      </Typography>

      <Typography variant="h5" gutterBottom>
        Page Not Found
      </Typography>

      <Typography variant="body1" paragraph>
        The page you are looking for might have been removed or is temporarily unavailable.
      </Typography>

      <Button variant="contained" color="primary" onClick={() => navigate('/')} sx={{ mt: 2 }}>
        Go to Home
      </Button>
    </Box>
  );
};

export default NotFoundPage;
