import React from 'react';
import { Menu } from 'lucide-react';
import DynamicLogo from './DynamicLogo';

interface HeaderProps {
  onMenuClick: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, theme, toggleTheme }) => {
  return (
    <header className="bg-[#0A0A0A] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Dynamic Logo Replacement */}
          <div className="flex items-center">
             <DynamicLogo />
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="#" className="hidden sm:block text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">About</a>
          <button 
             className="bg-telegram text-white px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-none border border-transparent hover:bg-yellow-400 hover:text-black hover:border-yellow-500 hover:shadow-[0_0_10px_rgba(250,204,21,0.5)] font-mono"
          >
            [+] suggestion box
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;