import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorPageProps {
  title?: string;
  message?: string;
  details?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred.',
  details,
  actionLabel = 'Reload Application',
  onAction = () => window.location.reload(),
}) => {
  return (
    <div className="container max-w-md mx-auto">
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <div className="w-full bg-card border rounded-lg shadow-lg p-6 space-y-4">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />

          <h2 className="text-xl font-semibold text-destructive">{title}</h2>

          <p className="text-muted-foreground mb-2">{message}</p>

          {details && (
            <Alert variant="destructive" className="my-4">
              <AlertDescription className="font-mono text-xs break-all">{details}</AlertDescription>
            </Alert>
          )}

          <Button onClick={onAction} className="mt-2">
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
