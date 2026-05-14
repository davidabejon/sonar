"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useThemeClient } from "./ThemeContext";
import { useSearch } from "./SearchContext";
import { getTheme, getGlobalCSS } from "./theme";

// Icons
const Icon = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export default function SonarLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode } = useThemeClient();
  const { query: searchQuery, setQuery: setSearchQuery } = useSearch();

  const [username, setUsername] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const initial = username && username.length ? username[0].toUpperCase() : "A";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username ?? null);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const COLORS = getTheme(isDarkMode);
  const css = getGlobalCSS(COLORS, isDarkMode);

  const navItems = [
    { path: "/sonar/home", label: "Inicio", Icon: Icon.Home },
    { path: "/sonar/search", label: "Buscar", Icon: Icon.Search },
    { path: "/sonar/profile", label: "Perfil", Icon: Icon.User },
    { path: "/sonar/settings", label: "Ajustes", Icon: Icon.Settings },
  ];

  const isDetailPage = pathname.includes("/sonar/detail");
  const currentNav = navItems.find(item => pathname.startsWith(item.path))?.path;

  const handleSearchFocus = () => {
    if (!pathname.includes("/sonar/search")) {
      router.push("/sonar/search");
    }
  };
  const handleProfileClick = () => router.push("/sonar/profile");
  const handleBackClick = () => {
    // Prefer navigating back in history so user returns to the previous screen.
    // Falls back to /sonar/search if history stack is not available.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/sonar/search");
    }
  };

  return (
    <>
      {isMounted && <style>{css}</style>}
      <div className="phone">
        {/* Top bar */}
        {isDetailPage ? (
          <div className="top-bar" style={{ justifyContent: "space-between" }}>
            <button onClick={handleBackClick} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.accent, display: "flex", alignItems: "center", gap: 4, fontSize: 15, padding: 0 }}>
              <span style={{ width: 20, height: 20 }}><Icon.ChevronLeft /></span> Volver
            </button>
            <button className="avatar-btn" onClick={handleProfileClick}>{initial}</button>
          </div>
        ) : (
          <div className="top-bar">
            <div className="search-bar" onClick={handleSearchFocus}>
              <div className="search-icon">
                <Icon.Search />
              </div>
              <input
                placeholder="Buscar canciones, artistas…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textTertiary, padding: 0, display: "flex", width: 18, height: 18 }}>
                  <Icon.X />
                </button>
              )}
            </div>
            <button className="avatar-btn" onClick={handleProfileClick}>{initial}</button>
          </div>
        )}

        {/* Screen content */}
        <div className="screen">{children}</div>

        {/* Bottom nav */}
        <div className="bottom-nav">
          {navItems.map(({ path, label, Icon: NavIcon }) => (
            <div
              key={path}
              className={`nav-item ${currentNav === path ? "active" : ""}`}
              onClick={() => router.push(path)}
            >
              <NavIcon />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
