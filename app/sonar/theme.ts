export const darkTheme = {
  bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)",
  bgSolid: "#1a1a2e",
  accent: "#A78BFA",
  accentGlow: "rgba(167,139,250,0.35)",
  text: "rgba(255,255,255,0.95)",
  textSecondary: "rgba(255,255,255,0.55)",
  textTertiary: "rgba(255,255,255,0.35)",
  surface: "rgba(255,255,255,0.14)", // Increased opacity to compensate for no blur
  surfaceHover: "rgba(255,255,255,0.22)", // Increased opacity
  glass: "rgba(255,255,255,0.14)",
  glassBorder: "rgba(255,255,255,0.22)",
  cardShadow: "0 2px 20px rgba(0,0,0,0.12), inset 0 0.5px 0 rgba(255,255,255,0.30)",
  cardShadowHover: "0 8px 32px rgba(0,0,0,0.20), inset 0 0.5px 0 rgba(255,255,255,0.40)",
};

export const lightTheme = {
  bg: "linear-gradient(135deg, #e0e4f8 0%, #d4e4f7 40%, #c5d8f5 70%, #d5c5ee 100%)",
  bgSolid: "#e0e4f8",
  accent: "#7C3AED",
  accentGlow: "rgba(124,58,237,0.20)",
  text: "rgba(20,10,50,0.90)",
  textSecondary: "rgba(60,40,100,0.65)",
  textTertiary: "rgba(60,40,100,0.45)",
  surface: "rgba(255,255,255,0.68)", // Increased opacity
  surfaceHover: "rgba(255,255,255,0.82)", // Increased opacity
  glass: "rgba(255,255,255,0.68)",
  glassBorder: "rgba(255,255,255,0.70)",
  cardShadow: "0 2px 16px rgba(80,60,160,0.10), inset 0 0.5px 0 rgba(255,255,255,0.80)",
  cardShadowHover: "0 8px 28px rgba(80,60,160,0.18), inset 0 0.5px 0 rgba(255,255,255,0.90)",
};

export const getTheme = (isDark: boolean) => isDark ? darkTheme : lightTheme;

export const getGlobalCSS = (colors: typeof darkTheme, isDark: boolean) => `
  @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100vh; }
  body { 
    background: ${colors.bg}; 
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif; 
    color: ${colors.text};
    transition: background 0.4s, color 0.3s;
  }

  .phone {
    width: 100%;
    height: 100vh;
    background: ${colors.bg};
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    transition: background 0.4s;
  }

  /* Ambient blob layer — mirrors FloatingCard blobs */
  .phone::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background: ${isDark
      ? `radial-gradient(ellipse 60% 50% at 20% 25%, rgba(120,80,255,0.30) 0%, transparent 65%),
         radial-gradient(ellipse 50% 55% at 82% 70%, rgba(255,100,150,0.20) 0%, transparent 65%),
         radial-gradient(ellipse 40% 40% at 62% 12%, rgba(0,200,255,0.15) 0%, transparent 55%)`
      : `radial-gradient(ellipse 60% 50% at 20% 25%, rgba(140,100,255,0.18) 0%, transparent 65%),
         radial-gradient(ellipse 50% 55% at 82% 70%, rgba(255,110,160,0.12) 0%, transparent 65%),
         radial-gradient(ellipse 40% 40% at 62% 12%, rgba(0,150,255,0.10) 0%, transparent 55%)`};
  }

  .screen { position: relative; z-index: 1; width: 100%; flex: 1; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; display: flex; flex-direction: column; }
  .screen::-webkit-scrollbar { display: none; }

  .top-bar {
    position: relative; z-index: 50;
    display: flex; align-items: center; gap: 12px;
    padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 14px;
    background: ${isDark ? 'rgba(26,26,46,0.85)' : 'rgba(224,228,248,0.85)'};
    border-bottom: 0.5px solid ${colors.glassBorder};
    box-shadow: ${isDark ? '0 1px 0 rgba(255,255,255,0.06)' : '0 1px 0 rgba(255,255,255,0.60)'};
    flex-shrink: 0;
    transition: background 0.4s, border-color 0.3s;
  }

  .search-bar {
    flex: 1; height: 40px;
    background: ${colors.surface};
    border: 0.5px solid ${colors.glassBorder};
    border-radius: 20px;
    display: flex; align-items: center; gap: 10px;
    padding: 0 16px;
    cursor: pointer;
    box-shadow: ${colors.cardShadow};
    transition: all 0.25s cubic-bezier(.34,1.56,.64,1);
  }
  .search-bar:hover { 
    background: ${colors.surfaceHover};
    box-shadow: ${colors.cardShadowHover};
    transform: translateY(-1px);
  }
  .search-bar input {
    background: none; border: none; outline: none;
    color: ${colors.text}; font-size: 15px; width: 100%;
    transition: color 0.3s;
  }
  .search-bar input::placeholder { color: ${colors.textTertiary}; }
  .search-icon { color: ${colors.textTertiary}; font-size: 16px; }

  .avatar-btn {
    width: 40px; height: 40px; border-radius: 50%;
    border: 1.5px solid ${colors.glassBorder};
    overflow: hidden; flex-shrink: 0; cursor: pointer;
    background: linear-gradient(135deg, #A78BFA, #6366F1);
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; font-weight: 500; color: white;
    box-shadow: 0 4px 16px ${isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)'};
    transition: transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
  }
  .avatar-btn:hover { transform: scale(1.08); box-shadow: 0 0 0 3px rgba(167,139,250,0.35), 0 4px 20px rgba(99,102,241,0.40); }

  .bottom-nav {
    position: relative; z-index: 50;
    display: flex; align-items: center; justify-content: space-around;
    padding: 12px 20px calc(28px + env(safe-area-inset-bottom, 0px));
    background: ${isDark ? 'rgba(26,26,46,0.85)' : 'rgba(224,228,248,0.85)'};
    border-top: 0.5px solid ${colors.glassBorder};
    box-shadow: ${isDark ? '0 -1px 0 rgba(255,255,255,0.06)' : '0 -1px 0 rgba(255,255,255,0.60)'};
    flex-shrink: 0;
    transition: background 0.4s, border-color 0.3s;
  }

  .nav-item {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    cursor: pointer; padding: 6px 16px; border-radius: 16px;
    transition: all 0.2s;
    color: ${colors.textTertiary};
    font-size: 11px; font-weight: 500; letter-spacing: 0.2px;
  }
  .nav-item:hover { color: ${colors.textSecondary}; background: ${colors.surface}; }
  .nav-item.active { color: ${colors.accent}; }
  .nav-item svg { width: 24px; height: 24px; }

  .glass-card {
    background: ${colors.surface};
    border: 0.5px solid ${colors.glassBorder};
    border-radius: 20px;
    box-shadow: ${colors.cardShadow};
    transition: background 0.25s, box-shadow 0.25s, transform 0.25s cubic-bezier(.34,1.56,.64,1);
  }
  .glass-card:hover { background: ${colors.surfaceHover}; box-shadow: ${colors.cardShadowHover}; }

  .section-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; color: ${colors.textTertiary}; text-transform: uppercase; margin-bottom: 12px; }

  .tag { 
    display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; 
    font-size: 12px; font-weight: 500; 
    background: ${isDark ? 'rgba(167,139,250,0.14)' : 'rgba(124,58,237,0.10)'};
    border: 0.5px solid ${isDark ? 'rgba(167,139,250,0.28)' : 'rgba(124,58,237,0.22)'};
    color: ${colors.accent};
    transition: background 0.2s;
  }

  .list-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 0.5px solid ${colors.glassBorder}; cursor: pointer; transition: opacity 0.15s; }
  .list-row:hover { opacity: 0.75; }
  .list-row:last-child { border-bottom: none; }

  .score-badge {
    border-radius: 12px; flex-shrink: 0;
    background: ${isDark ? 'rgba(167,139,250,0.18)' : 'rgba(124,58,237,0.12)'};
    border: 0.5px solid ${isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.28)'};
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600; color: ${colors.accent};
  }

  .input-field {
    background: ${colors.surface};
    border: 0.5px solid ${colors.glassBorder};
    border-radius: 14px; color: ${colors.text};
    font-size: 16px; padding: 16px 18px; width: 100%;
    outline: none;
    box-shadow: ${colors.cardShadow};
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    font-family: inherit;
  }
  .input-field:focus { border-color: ${isDark ? 'rgba(167,139,250,0.55)' : 'rgba(124,58,237,0.40)'}; background: ${colors.surfaceHover}; box-shadow: 0 0 0 3px ${colors.accentGlow}, ${colors.cardShadow}; }
  .input-field::placeholder { color: ${colors.textTertiary}; }

  .btn-primary {
    background: linear-gradient(135deg, #A78BFA, #6366F1);
    border: none; border-radius: 14px;
    color: white; font-size: 15px; font-weight: 500;
    padding: 14px 24px; width: 100%; cursor: pointer;
    box-shadow: 0 8px 32px rgba(99,102,241,0.35);
    transition: opacity 0.2s, transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
  }
  .btn-primary:hover { opacity: 0.92; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.45); }
  .btn-primary:active { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.6; transform: none; cursor: default; }

  .btn-ghost {
    background: ${colors.surface};
    border: 0.5px solid ${colors.glassBorder};
    border-radius: 14px; color: ${colors.text};
    font-size: 15px; font-weight: 400; padding: 14px 24px;
    width: 100%; cursor: pointer;
    box-shadow: ${colors.cardShadow};
    transition: background 0.2s, box-shadow 0.2s, transform 0.2s cubic-bezier(.34,1.56,.64,1);
  }
  .btn-ghost:hover { background: ${colors.surfaceHover}; box-shadow: ${colors.cardShadowHover}; transform: translateY(-1px); }
  .btn-ghost:disabled { opacity: 0.5; cursor: default; transform: none; }

  .content-area { position: relative; z-index: 1; padding: 10px 20px calc(120px + env(safe-area-inset-bottom, 0px)); flex: 1; display: flex; flex-direction: column; }

  ::-webkit-scrollbar { width: 0; }
`;
