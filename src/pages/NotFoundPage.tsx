import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center text-center h-full py-10">
      <h1 className="text-6xl font-bold text-destructive mb-4">404</h1>

      <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>

      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for might have been removed or is temporarily unavailable.
      </p>

      <Button onClick={() => navigate('/')} className="mt-2">
        Go to Home
      </Button>
    </div>
  );
};

export default NotFoundPage;
