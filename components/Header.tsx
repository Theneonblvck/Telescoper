import React from 'react';
import { Send, Menu, Sun, Moon } from 'lucide-react';

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
          
          <div className="flex items-center gap-3 group cursor-default">
            <div className="bg-telegram p-2 group-hover:bg-yellow-400 transition-colors duration-300">
              <Send className="w-5 h-5 text-white group-hover:text-black transform -rotate-45 translate-x-0.5 transition-colors duration-300" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">
              Tele<span className="text-telegram group-hover:text-yellow-400 transition-colors">Scope</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="#" className="hidden sm:block text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">About</a>
          <button 
             className="bg-telegram hover:bg-yellow-400 text-white hover:text-black px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-none border border-transparent hover:border-yellow-500"
          >
            Add Channel
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;