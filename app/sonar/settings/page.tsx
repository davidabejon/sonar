"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeClient } from "../ThemeContext";
import { getTheme } from "../theme";

type User = { id: string; email: string; username: string; createdAt: string };

const Icon = {
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useThemeClient();
  const COLORS = getTheme(isDarkMode);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(setUser).catch(() => {});
    fetch("/api/admin/check").then(r => r.json()).then(d => setIsAdmin(d.isAdmin)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const css = `
    .glass-card {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 20px;
      transition: all 0.2s;
    }
    .glass-card:hover { background: ${COLORS.surfaceHover}; }

    .section-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px;
      color: ${COLORS.textTertiary}; text-transform: uppercase;
      margin-bottom: 12px;
    }

    .settings-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 0;
      border-bottom: 0.5px solid ${COLORS.glassBorder};
      color: ${COLORS.text};
    }
    .settings-row:last-child { border-bottom: none; }

    .toggle {
      width: 44px; height: 26px; border-radius: 13px;
      position: relative; cursor: pointer; transition: background 0.2s;
    }
    .toggle.on { background: linear-gradient(135deg, #A78BFA, #6366F1); }
    .toggle.off { background: ${COLORS.surface}; }
    .toggle::after {
      content: ''; position: absolute;
      width: 20px; height: 20px; border-radius: 50%;
      background: white; top: 3px; transition: left 0.2s;
    }
    .toggle.on::after { left: 21px; }
    .toggle.off::after { left: 3px; }

    .btn-ghost {
      background: ${COLORS.surface};
      border: 0.5px solid ${COLORS.glassBorder};
      border-radius: 14px; color: #FF6B6B;
      font-size: 15px; font-weight: 400; padding: 14px 24px;
      width: 100%; cursor: pointer; transition: all 0.2s;
    }
    .btn-ghost:hover { background: ${COLORS.surfaceHover}; }
  `;

  const sections = [
    {
      title: "Cuenta",
      rows: [
        { label: "Correo electrónico", value: user?.email ?? "…", icon: <Icon.Globe /> },
        { label: "Contraseña", value: "••••••••", icon: <Icon.Lock /> },
        ...(isAdmin ? [{ label: "Panel Admin", value: "→", icon: <Icon.Shield />, action: () => router.push('/admin') }] : []),
      ],
    },
    {
      title: "Preferencias",
      rows: [
        // { label: "Notificaciones", toggle: "notifications", icon: <Icon.Bell /> },
        { label: "Modo oscuro", toggle: "darkMode", icon: <Icon.Moon /> },
        // { label: "Perfil privado", toggle: "privateProfile", icon: <Icon.Lock /> },
      ],
    },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="content-area" style={{ paddingTop: 24 }}>
        {/* Profile mini */}
        <div
          className="glass-card"
          style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 28, cursor: "pointer" }}
          onClick={() => router.push('/sonar/profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { router.push('/sonar/profile'); } }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg, #A78BFA, #6366F1)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>{user ? user.username[0].toUpperCase() : "·"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{user?.username ?? "…"}</div>
            <div style={{ fontSize: 13, color: COLORS.textSecondary }}>Ver perfil</div>
          </div>
          <div style={{ color: COLORS.textTertiary, width: 18, height: 18 }}><Icon.ChevronRight /></div>
        </div>

        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <div className="section-label">{section.title}</div>
            <div className="glass-card" style={{ padding: "0 16px" }}>
              {section.rows.map((row: any) => (
                <div 
                  key={row.label} 
                  className="settings-row"
                  onClick={row.action}
                  style={{ cursor: row.action ? 'pointer' : 'default' }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ color: COLORS.textTertiary, width: 18, height: 18 }}>{row.icon}</div>
                    <span style={{ fontSize: 15 }}>{row.label}</span>
                  </div>
                  {row.toggle ? (
                    <div 
                      className={`toggle ${row.toggle === "darkMode" && isDarkMode ? "on" : row.toggle !== "darkMode" ? "on" : "off"}`} 
                      onClick={() => row.toggle === "darkMode" && toggleTheme()} 
                    />
                  ) : (
                    <span style={{ fontSize: 14, color: COLORS.textTertiary }}>{row.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="btn-ghost" onClick={handleLogout}>
          Cerrar sesión
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: COLORS.textTertiary, marginTop: 16 }}>
          Sonar v1.0.0 · hecho con 🎵
        </p>
      </div>
    </>
  );
}
