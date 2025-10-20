import React from 'react';
import { AGComplexLogo, MenuIcon } from './Icons';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden mr-3 p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
              aria-label="Open sidebar"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <AGComplexLogo className="h-8 w-8 mr-3" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            <span className="bg-gradient-to-r from-green-400 to-emerald-600 text-transparent bg-clip-text">
                Zdjęcia AG-Complex
            </span>
            </h1>
        </div>
        <p className="hidden sm:block text-sm text-gray-400">Your Intelligent Photo Companion</p>
      </div>
    </header>
  );
};

export default Header;