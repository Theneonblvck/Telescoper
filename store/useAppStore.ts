import { create } from 'zustand';
import { Channel, FilterState, Category, Language } from '../types';
import { MOCK_CHANNELS } from '../constants';
import { performNeuralSearch, performIndexSearch } from '../services/googleSearchService';

interface AppState {
  searchQuery: string;
  channels: Channel[];
  isSearching: boolean;
  searchMode: 'ai' | 'index' | 'local';
  usingWebResults: boolean;
  currentCseName: string | null;
  error: string | null;
  systemStatus: 'checking' | 'online' | 'offline';
  filters: FilterState;
  sortBy: 'name' | 'members' | 'activity';
  theme: 'light' | 'dark';
  isMobileMenuOpen: boolean;
  isSuggestionBoxOpen: boolean;

  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
  checkSystemStatus: () => Promise<void>;
  updateFilters: (update: Partial<FilterState>) => void;
  setSortBy: (sortBy: 'name' | 'members' | 'activity') => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  setSuggestionBoxOpen: (isOpen: boolean) => void;
  performSearch: (query: string, cseId?: string) => Promise<void>;
  resetState: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  category: Category.ALL,
  language: Language.ALL,
  minSubscribers: 0,
  onlyActive: true,
};

export const useAppStore = create<AppState>((set) => ({
  searchQuery: '',
  channels: MOCK_CHANNELS,
  isSearching: false,
  searchMode: 'local',
  usingWebResults: false,
  currentCseName: null,
  error: null,
  systemStatus: 'checking',
  filters: DEFAULT_FILTERS,
  sortBy: 'members',
  theme: 'dark',
  isMobileMenuOpen: false,
  isSuggestionBoxOpen: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setError: (error) => set({ error }),
  
  checkSystemStatus: async () => {
    try {
      const res = await fetch('/api/health');
      set({ systemStatus: res.ok ? 'online' : 'offline' });
    } catch {
      set({ systemStatus: 'offline' });
    }
  },

  updateFilters: (update) => set((state) => ({ filters: { ...state.filters, ...update } })),
  setSortBy: (sortBy) => set({ sortBy }),
  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
  setSuggestionBoxOpen: (isOpen) => set({ isSuggestionBoxOpen: isOpen }),

  performSearch: async (query: string, cseId?: string) => {
    set({ searchQuery: query, error: null });

    if (!query.trim() || query.length < 3) {
      set({
        channels: MOCK_CHANNELS,
        usingWebResults: false,
        searchMode: 'local',
        currentCseName: null
      });
      return;
    }

    set({ isSearching: true });
    
    try {
      let results: Channel[] = [];
      let mode: 'ai' | 'index' = 'ai';

      if (cseId) {
        mode = 'index';
        results = await performIndexSearch(query, cseId);
        set({ currentCseName: cseId === '004805129374225513871' ? 'Global Index' : 'Extended Index' });
      } else {
        mode = 'ai';
        results = await performNeuralSearch(query);
        set({ currentCseName: 'Neural Net' });
      }

      set({
        channels: results,
        usingWebResults: true,
        searchMode: mode,
        filters: { ...DEFAULT_FILTERS, minSubscribers: 0 } // Reset filters to show results
      });

    } catch (error: any) {
      console.error(error);
      set({ 
        channels: [],
        usingWebResults: true, 
        error: "Signal interrupted. No telemetry received." 
      });
    } finally {
      set({ isSearching: false });
    }
  },

  resetState: () => set({
    searchQuery: '',
    filters: DEFAULT_FILTERS,
    channels: MOCK_CHANNELS,
    usingWebResults: false,
    searchMode: 'local',
    currentCseName: null,
    error: null,
  }),
}));
