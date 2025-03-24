import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '@/components/theme-provider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import wfsLogoLight from '@/assets/wfs-logo-light.svg';
import wfsLogoDark from '@/assets/wfs-logo-dark.svg';

const AppLayout: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col min-h-[500px] h-screen max-h-screen">
      {/* Header */}
      <header className="bg-slate-200 dark:bg-slate-900 px-4 py-2 shadow-sm">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center">
            <img
              src={isDark ? wfsLogoDark : wfsLogoLight}
              alt="WFS Tools Logo"
              className="h-12 w-12"
            />
            <div className="flex items-baseline">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent select-none">
                WFS
              </h1>
              <span className="text-xl ml-1 text-blue-400 font-normal select-none">Explorer</span>
            </div>
          </div>

          <div className="flex items-center">
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-h-0 p-4">
        <div className="container h-full px-0 mx-auto flex flex-col">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center border-t border-border">
        <div className="w-full flex justify-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} WFS Tools</p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
