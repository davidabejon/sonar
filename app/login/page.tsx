"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useThemeClient } from "../sonar/ThemeContext";
import { getTheme, getGlobalCSS } from "../sonar/theme";

export default function Login() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useThemeClient();
  const COLORS = getTheme(isDarkMode);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const css = getGlobalCSS(COLORS, isDarkMode) + `
    .phone { align-items: center; justify-content: center; }
    .waveform { display: flex; align-items: center; gap: 2px; height: 28px; }
    .waveform span { width: 3px; border-radius: 2px; background: ${COLORS.accent}; opacity: 0.6; animation: wave 1.2s ease-in-out infinite; }
    @keyframes wave { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
  `;

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al iniciar sesión");
        return;
      }
      router.push(searchParams.get("next") || "/sonar/home");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style suppressHydrationWarning>{css}</style>
      <div className="phone" suppressHydrationWarning>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 32px", gap: 0, width: "100%", maxWidth: 390 }} suppressHydrationWarning>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22, margin: "0 auto 20px",
              background: "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(99,102,241,0.2))",
              border: "1px solid rgba(167,139,250,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 48px rgba(167,139,250,0.2)",
            }}>
              <div className="waveform">
                {[0.3, 0.7, 1, 0.6, 0.4, 0.8, 0.5].map((h, i) => (
                  <span key={i} style={{ height: `${h * 28}px`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: -0.5, color: COLORS.text }} suppressHydrationWarning>sonar</h1>
            <p style={{ fontSize: 15, color: COLORS.textSecondary, marginTop: 6, fontWeight: 300 }} suppressHydrationWarning>tu música, tu memoria</p>
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="input-field" value={emailOrUsername} onChange={e => setEmailOrUsername(e.target.value)} placeholder="correo electrónico o usuario" type="text" autoComplete="username" />
            <input className="input-field" value={pass} onChange={e => setPass(e.target.value)} placeholder="contraseña" type="password" autoComplete="current-password" />

            <div style={{ textAlign: "right", marginTop: 2 }}>
              <span style={{ fontSize: 13, color: COLORS.accent, cursor: "pointer" }} suppressHydrationWarning>¿Olvidaste tu contraseña?</span>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#f87171", textAlign: "center", margin: 0 }}>{error}</p>
            )}

            <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ marginTop: 8, opacity: loading ? 0.7 : undefined }}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
            <button className="btn-ghost" onClick={() => router.push("/register")} disabled={loading}>Crear cuenta</button>
          </div>
        </div>
      </div>
    </>
  );
}
