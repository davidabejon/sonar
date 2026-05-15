import { createContext, useContext, useState } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export interface FloatingCardProps {
  /** Emoji, URL de imagen o cualquier ReactNode para el thumbnail */
  thumbnail: string | React.ReactNode;
  title: string;
  subtitle: string;
  /** Puntuación entre 0.0 y 10.0 */
  score: number;
  /** Optional override for theme ("light" | "dark"). When provided, this takes precedence over context. */
  theme?: Theme;
  onClick?: () => void;
}

export interface FloatingCardListProps {
  cards: FloatingCardProps[];
  label?: string;
  theme?: Theme;
  /** Ancho máximo del contenedor en px. Default: 480 */
  maxWidth?: number;
}

// ─── Contexto de tema ─────────────────────────────────────────────────────────

const ThemeCtx = createContext<Theme>("dark");
const useTheme = () => useContext(ThemeCtx);

// ─── Tokens por tema ──────────────────────────────────────────────────────────

const tokens = {
  dark: {
    title:           "rgba(255,255,255,0.95)",
    subtitle:        "rgba(255,255,255,0.50)",
    cardBg:          "rgba(255,255,255,0.11)",
    cardBorder:      "rgba(255,255,255,0.22)",
    cardShadow:      "0 2px 20px rgba(0,0,0,0.12), inset 0 0.5px 0 rgba(255,255,255,0.30)",
    cardShadowHover: "0 8px 32px rgba(0,0,0,0.20), inset 0 0.5px 0 rgba(255,255,255,0.40)",
    thumbBg:         "rgba(255,255,255,0.12)",
    trackStroke:     "rgba(255,255,255,0.15)",
  },
  light: {
    title:           "rgba(20,10,50,0.90)",
    subtitle:        "rgba(60,40,100,0.55)",
    cardBg:          "rgba(255,255,255,0.52)",
    cardBorder:      "rgba(255,255,255,0.70)",
    cardShadow:      "0 2px 16px rgba(80,60,160,0.10), inset 0 0.5px 0 rgba(255,255,255,0.80)",
    cardShadowHover: "0 8px 28px rgba(80,60,160,0.18), inset 0 0.5px 0 rgba(255,255,255,0.90)",
    thumbBg:         "rgba(100,80,200,0.10)",
    trackStroke:     "rgba(80,60,160,0.15)",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreToColor(score: number): string {
  const t = Math.min(Math.max(score, 0), 10) / 10;

  if (t <= 0.5) {
    const s = t * 2;
    const r = Math.round(220 + (255 - 220) * (1 - s));
    const g = Math.round(70  + (185 - 70)  * s);
    const b = Math.round(50  + (30  - 50)  * s);
    return `rgb(${r},${g},${b})`;
  } else {
    const s = (t - 0.5) * 2;
    const r = Math.round(255 - (255 - 80)  * s);
    const g = Math.round(185 + (210 - 185) * s);
    const b = Math.round(30  + (80  - 30)  * s);
    return `rgb(${r},${g},${b})`;
  }
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const theme = useTheme();
  const tk = tokens[theme];
  const color = scoreToColor(score);
  const offset = CIRCUMFERENCE * (1 - score / 10);

  return (
    <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
      <svg
        width={48}
        height={48}
        viewBox="0 0 48 48"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <circle
          cx={24} cy={24} r={RADIUS}
          fill="none"
          stroke={tk.trackStroke}
          strokeWidth={3.5}
        />
        <circle
          cx={24} cy={24} r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1), stroke 0.6s ease",
          }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          color,
          letterSpacing: "-0.5px",
          transition: "color 0.6s ease",
        }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function Thumbnail({ src }: { src: string | React.ReactNode }) {
  const theme = useTheme();
  const isString = typeof src === "string";
  const isUrl =
    isString &&
    (src.startsWith("http") || src.startsWith("/") || src.startsWith("./"));

  const base: React.CSSProperties = {
    flexShrink: 0,
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: tokens[theme].thumbBg,
  };

  if (isUrl) {
    return (
      <div style={base}>
        <img
          src={src as string}
          alt=""
          aria-hidden="true"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return <div style={{ ...base, fontSize: 26 }}>{src}</div>;
}

// ─── FloatingCard ─────────────────────────────────────────────────────────────

export function FloatingCard({
  thumbnail,
  title,
  subtitle,
  score,
  onClick,
}: FloatingCardProps) {
  const ctxTheme = useTheme();
  const themeUsed = (arguments[0] as FloatingCardProps).theme ?? ctxTheme;
  const theme = themeUsed;
  const tk = tokens[theme];
  const [hovered, setHovered] = useState(false);

  const cardStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 18px",
    borderRadius: 20,
    border: `0.5px solid ${tk.cardBorder}`,
    background: tk.cardBg,
    boxShadow: hovered ? tk.cardShadowHover : tk.cardShadow,
    transform: hovered ? "translateY(-2px) scale(1.012)" : "translateY(0) scale(1)",
    transition:
      "transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s ease",
    cursor: onClick ? "pointer" : "default",
    minWidth: 0,
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <Thumbnail src={thumbnail} />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: tk.title,
            letterSpacing: "-0.2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
            transition: "color 0.3s ease",
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            fontWeight: 400,
            color: tk.subtitle,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.3,
            transition: "color 0.3s ease",
          }}
        >
          {subtitle}
        </p>
      </div>

      <ScoreRing score={score} />
    </div>
  );
}

// ─── FloatingCardList ─────────────────────────────────────────────────────────

const DARK_MESH =
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)";

const LIGHT_MESH =
  "linear-gradient(135deg, #e0e4f8 0%, #d4e4f7 40%, #c5d8f5 70%, #d5c5ee 100%)";

export function FloatingCardList({
  cards,
  label,
  theme = "dark",
  maxWidth = 480,
}: FloatingCardListProps) {
  const isDark = theme === "dark";

  const wrapperStyle: React.CSSProperties = {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif",
    borderRadius: 28,
    background: isDark ? DARK_MESH : LIGHT_MESH,
    padding: 2,
    maxWidth,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  };

  const blobsStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: isDark
      ? `radial-gradient(ellipse 60% 50% at 20% 30%, rgba(120,80,255,0.35) 0%, transparent 70%),
         radial-gradient(ellipse 50% 60% at 80% 70%, rgba(255,100,150,0.25) 0%, transparent 70%),
         radial-gradient(ellipse 40% 40% at 60% 15%, rgba(0,200,255,0.20) 0%, transparent 60%)`
      : `radial-gradient(ellipse 60% 50% at 20% 30%, rgba(140,100,255,0.20) 0%, transparent 70%),
         radial-gradient(ellipse 50% 60% at 80% 70%, rgba(255,110,160,0.15) 0%, transparent 70%),
         radial-gradient(ellipse 40% 40% at 60% 15%, rgba(0,150,255,0.12) 0%, transparent 60%)`,
  };

  const labelColor = isDark
    ? "rgba(255,255,255,0.40)"
    : "rgba(40,20,100,0.45)";

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={wrapperStyle} aria-label={label ?? "Tarjetas de puntuación"}>
        <div style={blobsStyle} aria-hidden="true" />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {label && (
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: labelColor,
                padding: "0 4px",
              }}
            >
              {label}
            </p>
          )}
          {cards.map((card, i) => (
            <FloatingCard key={i} {...card} theme={theme} />
          ))}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

const DEMO_CARDS: FloatingCardProps[] = [
  { thumbnail: "🎵", title: "The Dark Side of the Moon", subtitle: "Pink Floyd · Álbum · 1973",          score: 9.4 },
  { thumbnail: "🎬", title: "Interstellar",              subtitle: "Christopher Nolan · Sci-fi · 2014",  score: 8.7 },
  { thumbnail: "📖", title: "El nombre del viento",      subtitle: "Patrick Rothfuss · Fantasía · 2007", score: 6.2 },
  { thumbnail: "🎮", title: "Cyberpunk 2077",            subtitle: "CD Projekt Red · RPG · 2020",        score: 4.1 },
  { thumbnail: "🍕", title: "Trattoria da Mario",        subtitle: "Italiana · Malasaña, Madrid",        score: 1.8 },
];

export default function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const isDark = theme === "dark";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDark ? "#0d0d14" : "#eceef8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        gap: 24,
        transition: "background 0.4s ease",
      }}
    >
      <button
        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        style={{
          padding: "8px 20px",
          borderRadius: 999,
          border: `0.5px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(80,60,160,0.25)"}`,
          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.60)",
          color: isDark ? "rgba(255,255,255,0.80)" : "rgba(30,15,80,0.80)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          letterSpacing: "-0.1px",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          transition: "all 0.3s ease",
        }}
        aria-label="Cambiar tema"
      >
        {isDark ? "☀️  Modo claro" : "🌙  Modo oscuro"}
      </button>

      <FloatingCardList
        cards={DEMO_CARDS}
        label="Recomendados"
        theme={theme}
        maxWidth={460}
      />
    </div>
  );
}
