import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_CHANNELS } from './constants';
import { FilterState, Category, Language, Channel } from './types';
import Header from './components/Header';
import Hero from './components/Hero';
import Sidebar from './components/Sidebar';
import ChannelCard from './components/ChannelCard';
import { ArrowRight, Loader2, Search as SearchIcon, ArrowUpDown } from 'lucide-react';
import { searchTelegramChannels } from './services/googleSearchService';

type SortOption = 'name' | 'members' | 'activity';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState<Channel[]>(MOCK_CHANNELS);
  const [isSearching, setIsSearching] = useState(false);
  const [usingWebResults, setUsingWebResults] = useState(false);
  const [currentCseName, setCurrentCseName] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    category: Category.ALL,
    language: Language.ALL,
    minSubscribers: 0
  });
  
  const [sortBy, setSortBy] = useState<SortOption>('members');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSearch = async (query: string, cseId?: string) => {
    setSearchQuery(query);
    
    // If query is empty, reset to mock data
    if (!query.trim()) {
      setChannels(MOCK_CHANNELS);
      setUsingWebResults(false);
      setCurrentCseName(null);
      return;
    }

    // Check for API Keys
    const hasApiKey = !!(process.env.GOOGLE_SEARCH_API_KEY || process.env.API_KEY);
    
    if (hasApiKey && query.length > 2) {
      setIsSearching(true);
      try {
        const webResults = await searchTelegramChannels(query, cseId);
        if (webResults.length > 0) {
          setChannels(webResults);
          setUsingWebResults(true);
          setCurrentCseName(cseId ? (cseId === '004805129374225513871' ? 'CSE Global' : 'CSE Extended') : 'AI Search');
          // Reset strict filters that might hide web results (since they lack metadata)
          setFilters(prev => ({ ...prev, category: Category.ALL, minSubscribers: 0 }));
        } else {
          // Fallback to local if web finds nothing
          setChannels(MOCK_CHANNELS);
          setUsingWebResults(false);
          setCurrentCseName(null);
        }
      } catch (error) {
        console.error("Search failed, falling back to local", error);
        setChannels(MOCK_CHANNELS);
        setUsingWebResults(false);
        setCurrentCseName(null);
      } finally {
        setIsSearching(false);
      }
    } else {
      // Local search only
      setChannels(MOCK_CHANNELS);
      setUsingWebResults(false);
      setCurrentCseName(null);
    }
  };

  const parseRelativeTime = (timeStr: string): number => {
    if (!timeStr || timeStr === 'Recently') return 0; // 0 represents most recent
    const parts = timeStr.toLowerCase().split(' ');
    const val = parseFloat(parts[0]);
    
    if (isNaN(val)) return 9999999; // Treat unknown formats as old
    
    const unit = parts[1] || '';
    if (unit.startsWith('min')) return val;
    if (unit.startsWith('hour')) return val * 60;
    if (unit.startsWith('day')) return val * 1440; // 24 * 60
    if (unit.startsWith('week')) return val * 10080;
    if (unit.startsWith('month')) return val * 43200;
    if (unit.startsWith('year')) return val * 525600;
    
    return 9999999;
  };

  const filteredChannels = useMemo(() => {
    // 1. Filter
    const filtered = channels.filter(channel => {
      // If using web results, the query is already applied by the search engine.
      // If local, we need to filter by string.
      const matchesSearch = usingWebResults 
        ? true 
        : (channel.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           channel.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
           channel.username.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = filters.category === Category.ALL || channel.category === filters.category;
      const matchesLanguage = filters.language === Language.ALL || channel.language === filters.language;
      const matchesSubs = channel.members >= filters.minSubscribers;

      return matchesSearch && matchesCategory && matchesLanguage && matchesSubs;
    });

    // 2. Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return b.members - a.members;
        case 'activity':
          return parseRelativeTime(a.lastActive) - parseRelativeTime(b.lastActive);
        default:
          return 0;
      }
    });
  }, [searchQuery, filters, channels, usingWebResults, sortBy]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Header 
        onMenuClick={() => setIsMobileMenuOpen(true)} 
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <Hero onSearch={handleSearch} initialQuery={searchQuery} />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <Sidebar filters={filters} setFilters={setFilters} />
            </div>
          </aside>

          {/* Mobile Sidebar (Modal) */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
              <div className="relative bg-white dark:bg-gray-800 w-80 max-w-full h-full overflow-y-auto shadow-xl flex flex-col transition-colors duration-200">
                <div className="p-4 border-b dark:border-gray-700">
                   <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h2>
                </div>
                <div className="p-4 flex-grow">
                   <Sidebar 
                      filters={filters} 
                      setFilters={setFilters} 
                      className="border-none shadow-none p-0 bg-transparent dark:bg-transparent"
                      onCloseMobile={() => setIsMobileMenuOpen(false)}
                   />
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  {usingWebResults && (
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-md">
                      <SearchIcon className="w-4 h-4 text-telegram" />
                    </div>
                  )}
                  {searchQuery ? `Results for "${searchQuery}"` : 'Top Channels'}
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({filteredChannels.length})
                  </span>
                </h2>
                {usingWebResults && (
                   <span className="text-xs text-gray-500 mt-1">
                     Found via {currentCseName || 'Web Search'}
                   </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-telegram focus:border-transparent cursor-pointer shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <option value="name">Sort by Name (A-Z)</option>
                    <option value="members">Sort by Members (High-Low)</option>
                    <option value="activity">Sort by Last Active (Newest)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-telegram animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Searching...</p>
              </div>
            ) : filteredChannels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChannels.map(channel => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700 transition-colors duration-200">
                <div className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3">
                  <ArrowRight className="h-full w-full transform rotate-45" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No channels found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {usingWebResults ? 'The web search returned no relevant Telegram channels.' : 'Try adjusting your search or filters to find what you\'re looking for.'}
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({ category: Category.ALL, language: Language.ALL, minSubscribers: 0 });
                    setChannels(MOCK_CHANNELS);
                    setUsingWebResults(false);
                  }}
                  className="mt-4 text-telegram hover:text-telegram-dark font-medium text-sm"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors duration-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} TeleScope. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 text-sm">Terms of Service</a>
              <a href="#" className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 text-sm">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
