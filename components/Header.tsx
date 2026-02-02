import React from 'react';
import { Menu, ZapOff, Activity } from 'lucide-react';
import DynamicLogo from './DynamicLogo';
import { useAppStore } from '../store/useAppStore';

const Header: React.FC = () => {
  const { setMobileMenuOpen, setSuggestionBoxOpen, systemStatus } = useAppStore();

  return (
    <header className="bg-[#0A0A0A] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Dynamic Logo Replacement */}
          <div className="flex items-center gap-3">
             <DynamicLogo />
             {/* Mobile Status Dot */}
             <div className="sm:hidden flex items-center">
                <div className={`w-2 h-2 rounded-full ${systemStatus === 'online' ? 'bg-green-500 animate-pulse' : systemStatus === 'offline' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest border-r border-gray-800 pr-6 mr-2">
            <span className="text-gray-600">Sys Status:</span>
            {systemStatus === 'checking' && <span className="text-yellow-500 animate-pulse">Ping...</span>}
            {systemStatus === 'online' && (
                <span className="text-green-500 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online
                </span>
            )}
            {systemStatus === 'offline' && (
                <span className="text-red-500 flex items-center gap-1">
                    <ZapOff className="w-3 h-3" /> Offline
                </span>
            )}
          </div>

          <a href="#" className="hidden sm:block text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">About</a>
          <button 
             onClick={() => setSuggestionBoxOpen(true)}
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