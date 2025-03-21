import React from 'react';
import { useRouteError } from 'react-router-dom';
import ErrorPage from './ErrorPage';

const RouterErrorPage: React.FC = () => {
  const error = useRouteError() as Error;

  return (
    <ErrorPage
      message={error?.message || 'An error occurred while navigating to this page.'}
      details={error?.toString()}
    />
  );
};

export default RouterErrorPage;
