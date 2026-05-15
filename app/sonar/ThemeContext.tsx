"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true); // Always start with dark mode (server default)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // After hydration, read from localStorage
    try {
      const saved = localStorage.getItem("sonar-dark-mode");
      if (saved !== null) {
        setIsDarkMode(saved === "true");
      }
    } catch {
      // localStorage not available
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem("sonar-dark-mode", String(newValue));
      } catch {
        // localStorage not available
      }
      return newValue;
    });
  };

  // Return a default context while mounting to prevent hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ isDarkMode: true, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function useThemeClient() {
  const context = useContext(ThemeContext);
  
  if (!context) {
    return { isDarkMode: true, toggleTheme: () => {} };
  }
  
  return context;
}
