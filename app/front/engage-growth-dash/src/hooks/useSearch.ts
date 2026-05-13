import { create } from 'zustand';

interface SearchStore {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const useSearch = create<SearchStore>((set) => ({
  searchTerm: '', 
  setSearchTerm: (term) => set({ searchTerm: term }),
}));