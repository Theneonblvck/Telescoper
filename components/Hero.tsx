import React, { useState, useEffect } from 'react';
import { Search, Sparkles, X, Globe, Terminal, Plus, Cpu } from 'lucide-react';
import { getSmartSuggestions } from '../services/geminiService';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, selectedEngine.cseId);
  };

  const handleSuggestionClick = (tag: string) => {
    setQuery(tag);
    onSearch(tag, selectedEngine.cseId);
  };

  const insertDork = (syntax: string) => {
    setQuery(prev => prev ? `${prev} ${syntax} ` : `${syntax} `);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('', selectedEngine.cseId);
    setSuggestions([]);
  };

  return (
    <div className="relative bg-[#080808] border-b border-gray-800 py-16 px-4 sm:px-6 lg:px-8">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      <div className="relative max-w-4xl mx-auto text-center z-10">
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 uppercase tracking-tighter leading-tight">
          Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-telegram to-yellow-400">Signals</span>
        </h2>
        <p className="text-gray-400 mb-10 max-w-2xl mx-auto text-sm font-mono tracking-wide">
          Advanced telemetry for the Telegram network. Locate channels via AI-assisted queries or direct dorks.
        </p>
        
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div className="flex flex-col gap-6">
            <div className="relative flex items-center group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500 group-focus-within:text-telegram transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-14 py-4 border-2 border-gray-800 bg-[#0A0A0A] text-white placeholder-gray-600 focus:outline-none focus:border-telegram focus:ring-0 focus:bg-black transition-all duration-200 text-lg font-mono rounded-none"
                placeholder={`INPUT QUERY...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-16 pr-3 flex items-center cursor-pointer text-gray-600 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <div className="absolute inset-y-0 right-0 flex items-center">
                <button
                  type="submit"
                  className="h-full bg-telegram hover:bg-yellow-400 text-white hover:text-black px-5 transition-colors border-l border-gray-800 rounded-none"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Engine Selection & Advanced Tools */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-800 pt-4">
              <div className="flex justify-center flex-wrap gap-0 bg-[#0A0A0A] border border-gray-800 p-1">
                {ENGINE_OPTIONS.map((engine) => (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => {
                      setSelectedEngine(engine);
                      if (query) onSearch(query, engine.cseId);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-none ${
                      selectedEngine.id === engine.id
                        ? 'bg-telegram text-white'
                        : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                    }`}
                  >
                    <engine.icon className="w-3.5 h-3.5" />
                    {engine.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowDorks(!showDorks)}
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors px-3 py-2 border ${showDorks ? 'border-telegram text-telegram bg-telegram/10' : 'border-gray-800 text-gray-500 hover:text-white hover:border-gray-600'}`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Advanced Syntax
              </button>
            </div>

            {/* Dork Cheat Sheet */}
            {showDorks && (
              <div className="bg-[#0A0A0A] border border-gray-700 p-4 text-left animate-in fade-in slide-in-from-top-2 duration-200">
                <h4 className="text-[10px] font-bold text-telegram uppercase tracking-widest mb-3 border-b border-gray-800 pb-2">
                  Query Operators
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {DORK_OPERATORS.map((op, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertDork(op.syntax)}
                      className="flex flex-col items-start p-2 hover:bg-white/5 border border-transparent hover:border-gray-700 transition-all text-left group"
                    >
                      <code className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 mb-1 w-full block">
                        {op.syntax}
                      </code>
                      <span className="text-[10px] text-gray-500 group-hover:text-gray-300 uppercase tracking-wide">
                        {op.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* AI Suggestions Display */}
        {selectedEngine.id === 'ai' && query.length > 2 && (
          <div className="mt-8 min-h-[30px]">
            {loadingSuggestions ? (
              <div className="flex justify-center items-center gap-2 text-telegram text-xs font-mono">
                <span className="animate-pulse">PROCESSING TELEMETRY...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <span className="text-xs text-gray-600 uppercase tracking-widest font-bold mt-1.5 mr-2">Signals:</span>
                {suggestions.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(tag)}
                    className="px-3 py-1 bg-[#111] text-gray-300 border border-gray-700 text-xs font-mono hover:border-telegram hover:text-telegram transition-all"
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