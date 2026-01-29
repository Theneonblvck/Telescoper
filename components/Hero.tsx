import React, { useState, useEffect } from 'react';
import { Search, Sparkles, X, Globe, Cpu } from 'lucide-react';
import { getSmartSuggestions } from '../services/geminiService';

interface HeroProps {
  onSearch: (query: string, engine?: string) => void;
  initialQuery?: string;
}

const ENGINE_OPTIONS = [
  { id: 'ai', name: 'AI Smart Search', icon: Sparkles, cseId: undefined },
  { id: 'cse1', name: 'CSE: Global Search', icon: Globe, cseId: '004805129374225513871' },
  { id: 'cse2', name: 'CSE: Extended', icon: Globe, cseId: '006368593537057042503' },
];

const Hero: React.FC<HeroProps> = ({ onSearch, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedEngine, setSelectedEngine] = useState(ENGINE_OPTIONS[0]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Debounce AI suggestions - only if using AI engine or just generic suggestions
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

  const clearSearch = () => {
    setQuery('');
    onSearch('', selectedEngine.cseId);
    setSuggestions([]);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl mb-4">
          Discover the Best of Telegram
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Find public channels by interest, language, or popularity.
        </p>
        
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div className="flex flex-col gap-4">
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-12 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-full leading-5 bg-gray-50 dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-telegram dark:focus:border-telegram transition-all duration-300 shadow-sm text-lg"
                placeholder={`Search using ${selectedEngine.name}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-20 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button
                  type="submit"
                  className="bg-telegram text-white p-2.5 rounded-full hover:bg-telegram-dark transition-colors shadow-md"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Engine Selection */}
            <div className="flex justify-center flex-wrap gap-2">
              {ENGINE_OPTIONS.map((engine) => (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => {
                    setSelectedEngine(engine);
                    // Optional: Auto search when switching engines if query exists
                    if (query) onSearch(query, engine.cseId);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    selectedEngine.id === engine.id
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-telegram dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <engine.icon className="w-3.5 h-3.5" />
                  {engine.name}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* AI Suggestions Display */}
        {selectedEngine.id === 'ai' && query.length > 2 && (
          <div className="mt-6 min-h-[40px]">
            {loadingSuggestions ? (
              <div className="flex justify-center items-center gap-2 text-gray-400 text-sm">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span>Thinking...</span>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2 animate-fadeIn">
                <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mt-1.5 mr-2">Related:</span>
                {suggestions.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(tag)}
                    className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full text-sm hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-300 transition-colors"
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
