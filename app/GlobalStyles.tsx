// This is a Server Component that injects global CSS to prevent FOUC (Flash of Unstyled Content)
import { getTheme, getGlobalCSS } from "./sonar/theme";

export function GlobalStyles() {
  // Always use dark theme as server default to match ThemeContext initial state
  const COLORS = getTheme(true);
  const css = getGlobalCSS(COLORS, true);

  return (
    <style
      dangerouslySetInnerHTML={{ __html: css }}
      suppressHydrationWarning
    />
  );
}
