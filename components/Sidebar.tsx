import React from 'react';
import { FilterState, Category, Language } from '../types';
import { Filter, X, ChevronRight, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  className?: string;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ filters, setFilters, className = '', onCloseMobile }) => {
  const handleCategoryChange = (category: Category) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, language: e.target.value as Language }));
  };

  const handleSubscriberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, minSubscribers: parseInt(e.target.value, 10) }));
  };

  const toggleActiveOnly = () => {
    setFilters(prev => ({ ...prev, onlyActive: !prev.onlyActive }));
  };

  const formatSubscribers = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  };

  return (
    <div className={`bg-[#0A0A0A] border border-gray-800 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-widest">
          <Filter className="w-4 h-4 text-telegram" />
          <span>Parameters</span>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="lg:hidden text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Active Filter */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Signal Integrity</h3>
        <button 
            onClick={toggleActiveOnly}
            className={`w-full flex items-center justify-between p-3 border transition-all duration-200 group ${
                filters.onlyActive 
                ? 'bg-telegram/10 border-telegram text-white' 
                : 'bg-[#050505] border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
        >
            <div className="flex items-center gap-2 text-sm font-bold uppercase">
                <ShieldCheck className={`w-4 h-4 ${filters.onlyActive ? 'text-telegram' : 'text-gray-600'}`} />
                <span>Active Only</span>
            </div>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${filters.onlyActive ? 'bg-telegram' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 left-1 w-2 h-2 rounded-full bg-white transition-transform ${filters.onlyActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
        </button>
      </div>

      {/* Categories */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Sector</h3>
        <div className="space-y-1">
          {Object.values(Category).map((cat) => (
            <label key={cat} className="flex items-center group cursor-pointer py-1">
              <div className={`w-4 h-4 border flex items-center justify-center mr-3 transition-colors duration-200 ${
                  filters.category === cat 
                    ? 'border-yellow-400 bg-yellow-400' 
                    : 'border-gray-700 group-hover:border-yellow-400'
                }`}
              >
                {filters.category === cat && <div className="w-1.5 h-1.5 bg-black"></div>}
              </div>
              <input
                type="radio"
                name="category"
                checked={filters.category === cat}
                onChange={() => handleCategoryChange(cat)}
                className="hidden"
              />
              <span className={`text-sm tracking-wide uppercase transition-colors duration-200 ${
                  filters.category === cat 
                    ? 'text-yellow-400 font-bold' 
                    : 'text-gray-400 group-hover:text-yellow-200'
                }`}
              >
                {cat}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="mb-10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Region / Lang</h3>
        <div className="relative group">
          <select
            value={filters.language}
            onChange={handleLanguageChange}
            className="w-full bg-[#050505] border border-gray-700 text-gray-300 text-sm focus:border-yellow-400 focus:ring-0 focus:text-white block p-3 appearance-none rounded-none uppercase tracking-wide cursor-pointer transition-colors group-hover:border-gray-500"
          >
            {Object.values(Language).map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 group-hover:text-yellow-400 transition-colors">
            <ChevronRight className="w-4 h-4 rotate-90" />
          </div>
        </div>
      </div>

      {/* Subscribers Range */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
          Min Signal Strength
        </h3>
        <div className="flex justify-between text-[10px] text-gray-500 font-mono mb-2 uppercase">
          <span>0</span>
          <span className="text-yellow-400 font-bold">{formatSubscribers(filters.minSubscribers)}</span>
          <span>1M+</span>
        </div>
        <input
          type="range"
          min="0"
          max="1000000"
          step="10000"
          value={filters.minSubscribers}
          onChange={handleSubscriberChange}
          className="w-full h-1 bg-gray-800 rounded-none appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
        />
      </div>
    </div>
  );
};

export default Sidebar;