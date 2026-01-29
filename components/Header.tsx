import React from 'react';
import { Send, Menu, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, theme, toggleTheme }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-transparent dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="bg-telegram rounded-full p-2">
            <Send className="w-5 h-5 text-white transform -rotate-45 translate-x-0.5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Tele<span className="text-telegram">Scope</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <a href="#" className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-telegram dark:hover:text-telegram-light transition-colors">About</a>
          <button className="bg-telegram text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-telegram-dark transition-colors shadow-md hover:shadow-lg">
            Add Channel
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;