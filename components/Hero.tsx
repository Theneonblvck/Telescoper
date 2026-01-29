import React, { useState, useEffect } from 'react';
import { Search, Sparkles, X, Globe, Terminal, Cpu, Download } from 'lucide-react';
import { getSmartSuggestions } from '../services/geminiService';
import GlitchText from './GlitchText';

interface HeroProps {
  onSearch: (query: string, engine?: string) => void;
  initialQuery?: string;
}

const ENGINE_OPTIONS = [
  { id: 'ai', name: 'AI Search', icon: Sparkles, cseId: undefined },
  { id: 'cse1', name: 'Global', icon: Globe, cseId: '004805129374225513871' },
  { id: 'cse2', name: 'Extended', icon: Cpu, cseId: '006368593537057042503' },
];

const DORK_OPERATORS = [
  { label: 'Exact Match', syntax: '"phrase"', desc: 'Find exact phrase' },
  { label: 'Exclude', syntax: '-word', desc: 'Exclude a word' },
  { label: 'Title Only', syntax: 'intitle:crypto', desc: 'Search in channel name' },
  { label: 'Language', syntax: 'lang:es', desc: 'Filter by language' },
  { label: 'Category', syntax: 'cat:tech', desc: 'Focus on category' },
  { label: 'Site', syntax: 'site:t.me', desc: 'Restrict to domain' },
];

const Hero: React.FC<HeroProps> = ({ onSearch, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedEngine, setSelectedEngine] = useState(ENGINE_OPTIONS[0]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDorks, setShowDorks] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Debounce AI suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (selectedEngine.id === 'ai' && query.length > 2) {
        setLoadingSuggestions(true);
        const tags = await getSmartSuggestions(query);
        setSuggestions(tags);
        setLoadingSuggestions(false);
      } else {
        setSuggestions([]);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [query, selectedEngine]);

  // Reset active suggestion when suggestions change
  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [suggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, selectedEngine.cseId);
  };

  const handleSuggestionClick = (tag: string) => {
    setQuery(tag);
    onSearch(tag, selectedEngine.cseId);
    setActiveSuggestionIndex(-1);
  };

  const insertDork = (syntax: string) => {
    setQuery(prev => prev ? `${prev} ${syntax} ` : `${syntax} `);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('', selectedEngine.cseId);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Move into list or next
      setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Move up or back to input
      setActiveSuggestionIndex(prev => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'ArrowRight') {
      if (activeSuggestionIndex >= 0) {
        e.preventDefault();
        setActiveSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      }
    } else if (e.key === 'ArrowLeft') {
      if (activeSuggestionIndex >= 0) {
        e.preventDefault();
        setActiveSuggestionIndex(prev => Math.max(prev - 1, -1));
      }
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex !== -1) {
        e.preventDefault();
        handleSuggestionClick(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setActiveSuggestionIndex(-1);
    }
  };

  return (
    <div className="relative bg-[#050505] border-b border-gray-800 py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-900/10 to-transparent pointer-events-none"></div>
      
      <div className="relative max-w-5xl mx-auto text-center z-10">
        <div className="flex flex-col items-center justify-center mb-8">
          
          <div className="relative flex items-center justify-center gap-3">
            <div className="relative">
               {/* Increased size to text-5xl to act as a proper header, aligned with GlitchText */}
               <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none relative z-10">
                 Discover
               </h2>
               <div className="absolute -top-4 -right-8 w-24 h-12 bg-gradient-to-r from-telegram to-yellow-400 blur-2xl opacity-20 pointer-events-none"></div>
            </div>
            
            <div className="mt-1">
               <GlitchText 
                 text="SIGNALS" 
                 width={220} 
                 height={60} 
                 font='800 48px "JetBrains Mono", monospace'
                 baseColor="#229ED9"
               />
            </div>
          </div>

          <p className="mt-6 text-gray-500 max-w-2xl mx-auto text-sm font-mono tracking-wide uppercase">
            Advanced telemetry for the Telegram network. Locate channels via AI-assisted queries or direct dorks.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
          <div className="flex flex-col gap-0">
            {/* Search Input */}
            <div className="relative flex items-center group mb-8">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-600 group-focus-within:text-white transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-14 pr-16 py-5 border border-gray-800 bg-[#0A0A0A] text-white placeholder-gray-700 focus:outline-none focus:border-telegram focus:ring-1 focus:ring-telegram transition-all duration-200 text-xl font-mono rounded-none tracking-tight uppercase"
                placeholder="Input Query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-20 pr-3 flex items-center cursor-pointer text-gray-600 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  type="submit"
                  className="h-full bg-telegram text-white px-6 transition-all duration-200 border-l border-gray-800 rounded-none hover:bg-yellow-400 hover:text-black"
                >
                  <Search className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              
              {/* Engine Selectors */}
              <div className="flex gap-2">
                {ENGINE_OPTIONS.map((engine) => (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => {
                      setSelectedEngine(engine);
                      if (query) onSearch(query, engine.cseId);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 rounded-none border ${
                      selectedEngine.id === engine.id
                        ? 'bg-telegram border-telegram text-white shadow-[0_0_15px_rgba(34,158,217,0.3)] hover:bg-yellow-400 hover:border-yellow-400 hover:text-black'
                        : 'bg-transparent border-gray-800 text-gray-500 hover:border-yellow-400 hover:bg-yellow-400 hover:text-black'
                    }`}
                  >
                    <engine.icon className="w-3 h-3" />
                    {engine.name}
                  </button>
                ))}
              </div>

              {/* Right Controls Group */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                {/* Advanced Toggle */}
                <button
                  type="button"
                  onClick={() => { setShowDorks(!showDorks); setShowExport(false); }}
                  className={`flex-1 sm:flex-none justify-center items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 px-4 py-2 border rounded-none whitespace-nowrap ${
                      showDorks 
                      ? 'border-telegram text-telegram bg-telegram/5 hover:bg-yellow-400 hover:border-yellow-400 hover:text-black' 
                      : 'border-telegram/30 text-telegram hover:bg-yellow-400 hover:border-yellow-400 hover:text-black' 
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  Advanced Syntax
                </button>

                {/* Export Toggle */}
                <button
                  type="button"
                  onClick={() => { setShowExport(!showExport); setShowDorks(false); }}
                  className={`flex-1 sm:flex-none justify-center items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 px-4 py-2 border rounded-none whitespace-nowrap ${
                      showExport
                      ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10' 
                      : 'border-telegram/30 text-telegram hover:bg-yellow-400 hover:border-yellow-400 hover:text-black' 
                  }`}
                >
                  <span className="font-mono text-xs font-black">{">_"}</span>
                  EXPORT RESULTS
                </button>
              </div>
            </div>

            {/* Advanced Syntax Panel */}
            {showDorks && (
              <div className="mt-6 border border-gray-800 bg-[#0A0A0A] p-6 text-left animate-in fade-in slide-in-from-top-2 duration-300">
                <h4 className="text-[10px] font-black text-telegram uppercase tracking-widest mb-4 border-b border-gray-800 pb-2 inline-block">
                  Query Operators
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {DORK_OPERATORS.map((op, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertDork(op.syntax)}
                      className="flex flex-col items-start p-3 border border-gray-800 bg-[#050505] hover:border-yellow-400 hover:bg-yellow-400/10 hover:translate-x-1 transition-all text-left group"
                    >
                      <code className="text-xs font-mono text-yellow-400 font-bold mb-2 bg-yellow-400/10 px-1 py-0.5">
                        {op.syntax}
                      </code>
                      <span className="text-[10px] text-gray-600 group-hover:text-gray-300 uppercase tracking-widest font-bold">
                        {op.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Export Panel */}
            {showExport && (
              <div className="mt-6 border border-gray-800 bg-[#0A0A0A] p-6 text-left animate-in fade-in slide-in-from-top-2 duration-300">
                <h4 className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-4 border-b border-gray-800 pb-2 inline-block">
                  Export Configuration
                </h4>
                
                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-6 font-mono text-xs">
                    
                    <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-bold uppercase whitespace-nowrap">Format:</span>
                        <div className="flex gap-1">
                            {['.TXT', '.CSV', '.JSON'].map(fmt => (
                                 <button key={fmt} className="px-3 py-1.5 border border-gray-800 bg-[#050505] text-gray-400 hover:text-yellow-400 hover:border-yellow-400 transition-all font-bold">
                                    {fmt}
                                 </button>
                            ))}
                        </div>
                    </div>

                    <div className="hidden xl:block w-px h-8 bg-gray-800"></div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-gray-500 font-bold uppercase whitespace-nowrap">Scope:</span>
                        <div className="flex flex-wrap gap-2">
                            <button className="px-3 py-1.5 border border-yellow-400 bg-yellow-400/10 text-yellow-400 font-bold">
                                FULL RESULTS
                            </button>
                            <div className="flex items-center gap-2 pl-2">
                                <span className="text-gray-600 whitespace-nowrap">RANGE #[</span>
                                <input type="text" className="w-8 bg-[#050505] border-b border-gray-700 text-center text-white focus:border-yellow-400 focus:outline-none" placeholder="1" />
                                <span className="text-gray-600 whitespace-nowrap">] TO #[</span>
                                <input type="text" className="w-8 bg-[#050505] border-b border-gray-700 text-center text-white focus:border-yellow-400 focus:outline-none" placeholder="100" />
                                <span className="text-gray-600">]</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="xl:ml-auto w-full xl:w-auto">
                        <button className="w-full xl:w-auto px-6 py-2 bg-yellow-400 text-black font-bold hover:bg-white transition-colors uppercase tracking-widest flex justify-center items-center gap-2">
                            <Download className="w-4 h-4" /> Execute
                        </button>
                    </div>

                </div>
              </div>
            )}
          </div>
        </form>

        {/* AI Suggestions */}
        {selectedEngine.id === 'ai' && query.length > 2 && (
          <div className="mt-8 min-h-[30px] flex justify-center">
            {loadingSuggestions ? (
              <div className="flex items-center gap-2 text-telegram text-xs font-mono">
                <span className="animate-pulse">ANALYZING SIGNALS...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mt-1.5 mr-2">Signals:</span>
                {suggestions.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button" // Ensure it doesn't submit form on click if not handled
                    onClick={() => handleSuggestionClick(tag)}
                    className={`px-3 py-1.5 text-[10px] font-mono border transition-all uppercase cursor-pointer ${
                      idx === activeSuggestionIndex 
                        ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400 ring-1 ring-yellow-400' 
                        : 'bg-[#111] text-gray-400 border-gray-800 hover:border-yellow-400 hover:text-yellow-400'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default Hero;