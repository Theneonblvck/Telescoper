import React, { useMemo, useEffect } from 'react';
import { Category, Language, ChannelStatus } from './types';
import Header from './components/Header';
import Hero from './components/Hero';
import Sidebar from './components/Sidebar';
import ChannelCard from './components/ChannelCard';
import SuggestionBox from './components/SuggestionBox';
import ThinkingTerminal from './components/ThinkingTerminal';
import Toast from './components/Toast';
import { ArrowRight, Loader2, Search as SearchIcon, ArrowUpDown, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAppStore } from './store/useAppStore';

function App() {
  const { 
    searchQuery, 
    channels, 
    filters, 
    sortBy, 
    isSearching,
    searchMode, 
    usingWebResults, 
    currentCseName,
    theme,
    isMobileMenuOpen,
    isSuggestionBoxOpen,
    setMobileMenuOpen,
    setSuggestionBoxOpen,
    setSortBy,
    resetState,
    checkSystemStatus // Added
  } = useAppStore();

  // Initial Health Check
  useEffect(() => {
    checkSystemStatus();
  }, [checkSystemStatus]);

  // Apply theme class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // View Logic: Parse Relative Time
  const parseRelativeTime = (timeStr: string): number => {
    if (!timeStr || timeStr === 'Recently') return 0; // 0 represents most recent
    const parts = timeStr.toLowerCase().split(' ');
    const val = parseFloat(parts[0]);
    
    if (isNaN(val)) return 9999999; 
    
    const unit = parts[1] || '';
    if (unit.startsWith('min')) return val;
    if (unit.startsWith('hour')) return val * 60;
    if (unit.startsWith('day')) return val * 1440;
    if (unit.startsWith('week')) return val * 10080;
    if (unit.startsWith('month')) return val * 43200;
    if (unit.startsWith('year')) return val * 525600;
    
    return 9999999;
  };

  // View Logic: Filtering & Sorting
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
      
      // Status filter
      const matchesStatus = filters.onlyActive ? channel.status === ChannelStatus.ACTIVE : true;

      return matchesSearch && matchesCategory && matchesLanguage && matchesSubs && matchesStatus;
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

  const hasResultsButFiltered = channels.length > 0 && filteredChannels.length === 0;

  return (
    <div className="min-h-screen flex flex-col font-mono bg-[#050505] text-gray-100 selection:bg-yellow-400 selection:text-black">
      <Header />
      
      <Hero />

      {isSuggestionBoxOpen && <SuggestionBox />}
      <Toast />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28">
              <Sidebar />
            </div>
          </aside>

          {/* Mobile Sidebar (Modal) */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
              ></div>
              <div className="relative bg-[#0A0A0A] border-r border-gray-800 w-80 max-w-full h-full overflow-y-auto flex flex-col">
                <div className="p-4 border-b border-gray-800">
                   <h2 className="text-xl font-bold text-white uppercase tracking-wider">Filters</h2>
                </div>
                <div className="p-4 flex-grow">
                   <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
                  {usingWebResults && (
                    <div className="bg-telegram/20 p-1 border border-telegram/50">
                      <SearchIcon className="w-4 h-4 text-telegram" />
                    </div>
                  )}
                  {searchQuery ? `Results: "${searchQuery}"` : 'Top Channels'}
                  <span className="text-sm font-normal text-gray-500 font-mono">
                    [{filteredChannels.length}]
                  </span>
                </h2>
                {usingWebResults && (
                   <span className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">
                     Source: {currentCseName || 'Web Search'}
                   </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    disabled={isSearching}
                    className={`appearance-none bg-[#0A0A0A] border border-gray-800 text-gray-300 py-2 pl-4 pr-10 rounded-none text-sm focus:outline-none focus:border-telegram focus:ring-1 focus:ring-telegram transition-colors uppercase tracking-wider font-bold ${isSearching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-600'}`}
                  >
                    <option value="name">Sort: Name (A-Z)</option>
                    <option value="members">Sort: Members</option>
                    <option value="activity">Sort: Active</option>
                  </select>
                  <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 ${isSearching ? 'text-gray-600' : 'text-telegram'}`}>
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {isSearching ? (
              searchMode === 'ai' ? (
                <ThinkingTerminal />
              ) : (
                <div className="flex flex-col items-center justify-center py-32 border border-gray-800 border-dashed bg-[#0A0A0A]">
                  <Loader2 className="w-12 h-12 text-telegram animate-spin mb-4" />
                  <p className="text-gray-400 font-mono uppercase tracking-widest animate-pulse">Scanning Web Index...</p>
                </div>
              )
            ) : filteredChannels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChannels.map(channel => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 px-4 text-center bg-[#0A0A0A] border border-gray-800 border-dashed relative overflow-hidden animate-in fade-in duration-500">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className={`p-6 rounded-full mb-6 border-2 ${hasResultsButFiltered ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      {hasResultsButFiltered ? (
                          <AlertTriangle className="w-12 h-12 text-yellow-500 animate-pulse" />
                      ) : (
                          <SearchIcon className="w-12 h-12 text-red-500/80" />
                      )}
                    </div>
                    
                    <h3 className={`text-3xl font-black uppercase tracking-tighter mb-4 ${hasResultsButFiltered ? 'text-yellow-500' : 'text-gray-200'}`}>
                        {hasResultsButFiltered ? "Results Hidden" : "Signal Lost"}
                    </h3>
                    
                    <p className="text-gray-500 max-w-lg font-mono text-sm leading-relaxed mb-10">
                      {hasResultsButFiltered
                        ? 'Intelligence was gathered but is masked by your current filters. Adjust parameters (Active Only, Subscribers) to reveal.'
                        : usingWebResults 
                            ? `The web index yielded no public channels for "${searchQuery}". The signal is weak or non-existent.` 
                            : 'No channels match your current criteria. Initiate a new search sequence or reset parameters.'}
                    </p>
                    
                    <button 
                      onClick={resetState}
                      className="group relative px-8 py-4 bg-telegram text-white font-bold uppercase tracking-widest text-xs hover:bg-yellow-400 hover:text-black transition-all border border-transparent shadow-[0_0_20px_rgba(34,158,217,0.3)] hover:shadow-[0_0_20px_rgba(250,204,21,0.5)]"
                    >
                      <span className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        Re-calibrate Sensors
                      </span>
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-[#050505] border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-xs uppercase tracking-widest font-mono">
              SYSTEM STATUS: ONLINE | &copy; {new Date().getFullYear()} TELESCOPE
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-600 hover:text-telegram text-xs uppercase tracking-widest transition-colors">Privacy</a>
              <a href="#" className="text-gray-600 hover:text-telegram text-xs uppercase tracking-widest transition-colors">Terms</a>
              <a href="#" className="text-gray-600 hover:text-telegram text-xs uppercase tracking-widest transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;