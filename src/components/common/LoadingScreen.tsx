import React from 'react';
import logo from '@/assets/logo.svg';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="container max-w-md mx-auto">
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
        <div className="mb-8 animate-pulse">
          <img
            src={logo}
            alt="WFS Explorer"
            className="w-full max-w-[320px] h-auto"
            style={{
              animation: 'pulse 2s infinite',
            }}
          />
        </div>

        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>

        <style>{`
          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
        `}</style>
      </div>
    </div>
  );
};
