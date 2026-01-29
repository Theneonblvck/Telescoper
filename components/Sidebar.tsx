import React from 'react';
import { FilterState, Category, Language } from '../types';
import { Filter, X } from 'lucide-react';

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

  const formatSubscribers = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-gray-800 dark:text-white font-bold text-lg">
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider mb-3">Category</h3>
        <div className="space-y-2">
          {Object.values(Category).map((cat) => (
            <label key={cat} className="flex items-center group cursor-pointer">
              <input
                type="radio"
                name="category"
                checked={filters.category === cat}
                onChange={() => handleCategoryChange(cat)}
                className="w-4 h-4 text-telegram border-gray-300 dark:border-gray-600 focus:ring-telegram bg-gray-50 dark:bg-gray-700"
              />
              <span className={`ml-3 text-sm group-hover:text-telegram dark:group-hover:text-telegram-light transition-colors ${filters.category === cat ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                {cat}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider mb-3">Language</h3>
        <select
          value={filters.language}
          onChange={handleLanguageChange}
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg focus:ring-telegram focus:border-telegram block p-2.5 transition-colors"
        >
          {Object.values(Language).map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      {/* Subscribers Range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider mb-3">
          Min Subscribers
        </h3>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>0</span>
          <span>{formatSubscribers(filters.minSubscribers)}</span>
          <span>1M+</span>
        </div>
        <input
          type="range"
          min="0"
          max="1000000"
          step="10000"
          value={filters.minSubscribers}
          onChange={handleSubscriberChange}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-telegram"
        />
      </div>
    </div>
  );
};

export default Sidebar;