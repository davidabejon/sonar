"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SearchContextType {
  query: string;
  setQuery: (query: string) => void;
  // Ratings page state
  ratingsSearch: string;
  setRatingsSearch: (query: string) => void;
  ratingsFilterType: string;
  setRatingsFilterType: (type: string) => void;
  ratingsSortBy: string;
  setRatingsSortBy: (sort: string) => void;
  ratingsPage: number;
  setRatingsPage: (page: number) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [ratingsSearch, setRatingsSearch] = useState("");
  const [ratingsFilterType, setRatingsFilterType] = useState("");
  const [ratingsSortBy, setRatingsSortBy] = useState("createdAt");
  const [ratingsPage, setRatingsPage] = useState(1);

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        ratingsSearch,
        setRatingsSearch,
        ratingsFilterType,
        setRatingsFilterType,
        ratingsSortBy,
        setRatingsSortBy,
        ratingsPage,
        setRatingsPage,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
