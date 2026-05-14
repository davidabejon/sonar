"use client";

import { ThemeProvider } from "./sonar/ThemeContext";
import { SearchProvider } from "./sonar/SearchContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SearchProvider>
        {children}
      </SearchProvider>
    </ThemeProvider>
  );
}
