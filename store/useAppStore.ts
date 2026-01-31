import { create } from 'zustand';
import { Channel, FilterState, Category, Language, ChannelStatus } from '../types';
import { MOCK_CHANNELS } from '../constants';
import { searchTelegramChannels } from '../services/googleSearchService';

interface AppState {
  // State
  searchQuery: string;
  channels: Channel[];
  isSearching: boolean;
  usingWebResults: boolean;
  currentCseName: string | null;
  filters: FilterState;
  sortBy: 'name' | 'members' | 'activity';
  theme: 'light' | 'dark';
  isMobileMenuOpen: boolean;
  isSuggestionBoxOpen: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  updateFilters: (update: Partial<FilterState>) => void;
  setSortBy: (sortBy: 'name' | 'members' | 'activity') => void;
  toggleTheme: () => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  searchQuery: '',
  channels: MOCK_CHANNELS,
  isSearching: false,
  usingWebResults: false,
  currentCseName: null,
  filters: DEFAULT_FILTERS,
  sortBy: 'members',
  theme: 'dark',
  isMobileMenuOpen: false,
  isSuggestionBoxOpen: false,

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  updateFilters: (update) => 
    set((state) => ({ filters: { ...state.filters, ...update } })),

  setSortBy: (sortBy) => set({ sortBy }),

  toggleTheme: () => 
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),

  setSuggestionBoxOpen: (isOpen) => set({ isSuggestionBoxOpen: isOpen }),

  performSearch: async (query: string, cseId?: string) => {
    set({ searchQuery: query });

    // Reset to mock if empty
    if (!query.trim()) {
      set({
        channels: MOCK_CHANNELS,
        usingWebResults: false,
        currentCseName: null,
      });
      return;
    }

    if (query.length > 2) {
      set({ isSearching: true });
      try {
        // Always attempt to fetch from backend. The backend handles API keys.
        const webResults = await searchTelegramChannels(query, cseId);
        
        // Use results if found, otherwise empty array (which triggers No Results UI)
        set((state) => ({
          channels: webResults,
          usingWebResults: true,
          currentCseName: cseId ? (cseId === '004805129374225513871' ? 'CSE Global' : 'CSE Extended') : 'AI Search',
          // Reset strict filters so users can see results
          filters: { ...state.filters, category: Category.ALL, minSubscribers: 0 }
        }));
      } catch (error) {
        console.error("Search flow error:", error);
        set({
          channels: [],
          usingWebResults: true,
          currentCseName: null,
        });
      } finally {
        set({ isSearching: false });
      }
    } else {
      // Short query? Fallback to local
      set({
        channels: MOCK_CHANNELS,
        usingWebResults: false,
        currentCseName: null,
      });
    }
  },

  resetState: () => set({
    searchQuery: '',
    filters: DEFAULT_FILTERS,
    channels: MOCK_CHANNELS,
    usingWebResults: false,
    currentCseName: null,
  }),
}));