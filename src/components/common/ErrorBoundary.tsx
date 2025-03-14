import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="sm">
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="100vh"
            textAlign="center"
          >
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2, maxWidth: '100%', width: '100%' }}>
              <ErrorOutlineIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h5" gutterBottom color="error">
                Something went wrong
              </Typography>
              <Typography variant="body1" paragraph>
                {this.state.error?.message || 'An unexpected error occurred.'}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Technical details: {this.state.error?.toString()}
              </Typography>
              <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
                Reload Application
              </Button>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
