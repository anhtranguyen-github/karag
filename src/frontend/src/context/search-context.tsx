'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GlobalSearch } from '@/components/global-search';

interface SearchContextType {
    openSearch: () => void;
    closeSearch: () => void;
    toggleSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const openSearch = useCallback(() => setIsOpen(true), []);
    const closeSearch = useCallback(() => setIsOpen(false), []);
    const toggleSearch = useCallback(() => setIsOpen(prev => !prev), []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearch();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSearch]);

    return (
        <SearchContext.Provider value={{ openSearch, closeSearch, toggleSearch }}>
            {children}
            <GlobalSearch isOpen={isOpen} onClose={closeSearch} />
        </SearchContext.Provider>
    );
}

export function useGlobalSearch() {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useGlobalSearch must be used within a SearchProvider');
    }
    return context;
}
