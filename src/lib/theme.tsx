import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

export interface ThemeConfig {
  theme: Theme;
  accentColor: string;
  cardStyle?: "modern" | "glass" | "minimal";
  density?: "comfortable" | "compact";
  sidebarCollapsed?: boolean;
}

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  cardStyle: "modern" | "glass" | "minimal";
  setCardStyle: (style: "modern" | "glass" | "minimal") => void;
}

export function lightenColor(hex: string, percent: number): string {
  try {
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map((c) => c + c).join("");
    }
    if (cleanHex.length !== 6) return hex;
    const num = parseInt(cleanHex, 16);
    const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * (percent / 100)));
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * (percent / 100)));
    const b = Math.min(255, Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * (percent / 100)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch (e) {
    return hex;
  }
}

export function darkenColor(hex: string, percent: number): string {
  try {
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map((c) => c + c).join("");
    }
    if (cleanHex.length !== 6) return hex;
    const num = parseInt(cleanHex, 16);
    const r = Math.max(0, Math.floor((num >> 16) * (1 - percent / 100)));
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - percent / 100)));
    const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - percent / 100)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch (e) {
    return hex;
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  if (cleanHex.length !== 6) return { r: 201, g: 162, b: 39 };
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function applyThemeAndAccent(
  theme: Theme,
  color: string,
  cardStyle: "modern" | "glass" | "minimal" = "modern"
) {
  if (typeof window === "undefined" || !document?.documentElement) return;

  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
    if (document.body) {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    }
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    if (document.body) {
      document.body.classList.remove("dark");
      document.body.classList.add("light");
    }
  }

  const glow = lightenColor(color, 25);
  const darkShade = darkenColor(color, 25);
  const { r, g, b } = hexToRgb(color);
  const rgbStr = `${r}, ${g}, ${b}`;

  // Direct CSS custom properties on root
  root.style.setProperty("--primary", color);
  root.style.setProperty("--primary-glow", glow);
  root.style.setProperty("--color-primary", color);
  root.style.setProperty("--color-primary-glow", glow);
  root.style.setProperty("--color-brand", color);
  root.style.setProperty("--color-brand-light", glow);
  root.style.setProperty("--ring", color);
  root.style.setProperty("--color-ring", color);
  root.style.setProperty("--sidebar-primary", color);
  root.style.setProperty("--sidebar-ring", color);
  root.style.setProperty("--accent", color);
  root.style.setProperty("--color-accent", color);
  root.style.setProperty("--chart-1", color);
  root.style.setProperty("--chart-2", glow);
  root.style.setProperty("--rdp-accent-color", color);

  // Maintain custom injected style tag for absolute CSS cascade victory
  let styleEl = document.getElementById("smhub-dynamic-theme") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "smhub-dynamic-theme";
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    /* ================================================================ */
    /* SM HUB REACTIVE DYNAMIC THEME SYSTEM                            */
    /* ================================================================ */
    :root, .dark, .light, html, body {
      --primary: ${color} !important;
      --primary-glow: ${glow} !important;
      --color-primary: ${color} !important;
      --color-primary-glow: ${glow} !important;
      --color-brand: ${color} !important;
      --color-brand-light: ${glow} !important;
      --ring: ${color} !important;
      --color-ring: ${color} !important;
      --sidebar-primary: ${color} !important;
      --sidebar-ring: ${color} !important;
      --accent: ${color} !important;
      --color-accent: ${color} !important;
      --chart-1: ${color} !important;
      --chart-2: ${glow} !important;
      --rdp-accent-color: ${color} !important;
    }

    /* Core Brand Utilities */
    .bg-brand, 
    button.bg-brand, 
    a.bg-brand,
    span.bg-brand,
    [data-state=checked].bg-brand,
    [data-state=checked] .bg-brand {
      background-color: ${color} !important;
    }

    .text-brand,
    span.text-brand,
    a.text-brand,
    p.text-brand,
    h1.text-brand,
    h2.text-brand,
    h3.text-brand,
    svg.text-brand,
    [data-state=active] > .text-brand {
      color: ${color} !important;
    }

    .border-brand,
    div.border-brand,
    span.border-brand,
    button.border-brand,
    input.border-brand {
      border-color: ${color} !important;
    }

    .ring-brand,
    .focus-visible\\:ring-brand:focus-visible,
    input:focus-visible,
    textarea:focus-visible {
      --tw-ring-color: ${color} !important;
      outline-color: ${color} !important;
    }

    /* Opacity variants of Brand Color (attribute selector covers all variations) */
    [class*="bg-brand/5"], .bg-brand\\/5 { background-color: rgba(${rgbStr}, 0.05) !important; }
    [class*="bg-brand/10"], .bg-brand\\/10 { background-color: rgba(${rgbStr}, 0.10) !important; }
    [class*="bg-brand/15"], .bg-brand\\/15 { background-color: rgba(${rgbStr}, 0.15) !important; }
    [class*="bg-brand/20"], .bg-brand\\/20 { background-color: rgba(${rgbStr}, 0.20) !important; }
    [class*="bg-brand/25"], .bg-brand\\/25 { background-color: rgba(${rgbStr}, 0.25) !important; }
    [class*="bg-brand/30"], .bg-brand\\/30 { background-color: rgba(${rgbStr}, 0.30) !important; }
    [class*="bg-brand/40"], .bg-brand\\/40 { background-color: rgba(${rgbStr}, 0.40) !important; }
    [class*="bg-brand/50"], .bg-brand\\/50 { background-color: rgba(${rgbStr}, 0.50) !important; }
    [class*="bg-brand/80"], .bg-brand\\/80 { background-color: rgba(${rgbStr}, 0.80) !important; }
    [class*="bg-brand/90"], .bg-brand\\/90 { background-color: rgba(${rgbStr}, 0.90) !important; }

    [class*="border-brand/10"], .border-brand\\/10 { border-color: rgba(${rgbStr}, 0.10) !important; }
    [class*="border-brand/15"], .border-brand\\/15 { border-color: rgba(${rgbStr}, 0.15) !important; }
    [class*="border-brand/20"], .border-brand\\/20 { border-color: rgba(${rgbStr}, 0.20) !important; }
    [class*="border-brand/25"], .border-brand\\/25 { border-color: rgba(${rgbStr}, 0.25) !important; }
    [class*="border-brand/30"], .border-brand\\/30 { border-color: rgba(${rgbStr}, 0.30) !important; }
    [class*="border-brand/40"], .border-brand\\/40 { border-color: rgba(${rgbStr}, 0.40) !important; }
    [class*="border-brand/50"], .border-brand\\/50 { border-color: rgba(${rgbStr}, 0.50) !important; }
    [class*="border-brand/60"], .border-brand\\/60 { border-color: rgba(${rgbStr}, 0.60) !important; }

    [class*="hover:border-brand"]:hover { border-color: ${color} !important; }
    [class*="hover:border-brand/40"]:hover { border-color: rgba(${rgbStr}, 0.40) !important; }
    [class*="hover:bg-brand/15"]:hover { background-color: rgba(${rgbStr}, 0.15) !important; }
    [class*="hover:bg-brand/20"]:hover { background-color: rgba(${rgbStr}, 0.20) !important; }
    [class*="hover:text-brand"]:hover { color: ${color} !important; }
    [class*="group:hover"] .group-hover\\:text-brand,
    .group:hover .group-hover\\:text-brand { color: ${color} !important; }

    /* Gradients and Special Brand Utilities */
    .gradient-brand {
      background-image: linear-gradient(120deg, ${color}, ${glow}) !important;
    }
    .text-gradient-brand, [class*="text-gradient-brand"] {
      background-image: linear-gradient(100deg, ${color}, ${glow}) !important;
      background-clip: text !important;
      -webkit-background-clip: text !important;
      color: transparent !important;
    }
    [class*="from-brand"] {
      --tw-gradient-from: ${color} !important;
    }
    [class*="to-brand-light"] {
      --tw-gradient-to: ${glow} !important;
    }
    .glow-brand {
      box-shadow: 0 12px 34px -14px rgba(${rgbStr}, 0.65) !important;
    }
    [class*="shadow-brand"] {
      --tw-shadow-color: rgba(${rgbStr}, 0.25) !important;
    }

    /* Fallback overrides for legacy hardcoded gold color */
    [class*="from-[#c9a227]"], [class*="from-[#C9A227]"] {
      --tw-gradient-from: ${color} !important;
    }
    [class*="to-[#e6be44]"], [class*="to-[#E6BE44]"] {
      --tw-gradient-to: ${glow} !important;
    }
    [class*="text-[#c9a227]"], [class*="text-[#C9A227]"] {
      color: ${color} !important;
    }
    [class*="accent-[#c9a227]"], [class*="accent-[#C9A227]"], input[type="range"], input[type="checkbox"]:checked {
      accent-color: ${color} !important;
    }

    /* Calendar and DayPicker styling */
    .rdp-day_selected:not(.rdp-day_range_middle) {
      background-color: ${color} !important;
      color: #000000 !important;
      font-weight: bold !important;
    }

    /* Tab triggers active state */
    [role="tablist"] [role="tab"][data-state="active"].bg-brand,
    [role="tablist"] button[data-state="active"].bg-brand {
      background-color: ${color} !important;
      color: #000000 !important;
    }

    /* Sidebar Active Nav Item */
    aside a.bg-brand\\/10,
    aside a[class*="bg-brand/10"] {
      background-color: rgba(${rgbStr}, 0.12) !important;
      color: ${color} !important;
    }

    /* User Selected Text */
    ::selection {
      background-color: ${color} !important;
      color: #000000 !important;
    }

    ${
      cardStyle === "glass"
        ? `
    .bg-\\[\\#111111\\], .bg-\\[\\#0e0e11\\], .bg-\\[\\#141418\\] {
      background-color: rgba(18, 18, 22, 0.7) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
    }
    `
        : cardStyle === "minimal"
        ? `
    .bg-\\[\\#111111\\], .bg-\\[\\#0e0e11\\], .bg-\\[\\#141418\\] {
      box-shadow: none !important;
      border-color: rgba(255, 255, 255, 0.05) !important;
    }
    `
        : ""
    }

    ${
      !isDark
        ? `
    /* ================================================================ */
    /* LIGHT MODE ADAPTATION                                            */
    /* ================================================================ */
    html.light, body.light {
      background-color: #f8fafc !important;
      color: #0f172a !important;
    }
    html.light aside {
      background-color: #ffffff !important;
      border-color: #e2e8f0 !important;
      color: #0f172a !important;
    }
    html.light header {
      background-color: rgba(255, 255, 255, 0.92) !important;
      border-color: #e2e8f0 !important;
      color: #0f172a !important;
      backdrop-filter: blur(12px) !important;
    }
    html.light .bg-\\[\\#0a0a0a\\],
    html.light .bg-\\[\\#0e0e11\\],
    html.light .bg-\\[\\#111111\\],
    html.light .bg-\\[\\#141418\\],
    html.light .bg-\\[\\#18181b\\] {
      background-color: #ffffff !important;
      border-color: #e2e8f0 !important;
      color: #0f172a !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    }
    html.light .text-white,
    html.light .text-neutral-100,
    html.light .text-neutral-200 {
      color: #0f172a !important;
    }
    html.light .text-gray-300,
    html.light .text-gray-400,
    html.light .text-neutral-400,
    html.light .text-neutral-500 {
      color: #64748b !important;
    }
    html.light .border-white\\/5,
    html.light .border-white\\/10,
    html.light .border-white\\/20 {
      border-color: #e2e8f0 !important;
    }
    html.light .bg-white\\/5,
    html.light .bg-white\\/10 {
      background-color: #f1f5f9 !important;
    }
    html.light input,
    html.light textarea,
    html.light select {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }
    html.light aside a.text-neutral-400 {
      color: #64748b !important;
    }
    html.light aside a.text-neutral-400:hover {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
    }
    `
        : `
    /* ================================================================ */
    /* DARK MODE ADAPTATION                                             */
    /* ================================================================ */
    html.dark, body.dark {
      background-color: #0a0a0c !important;
      color: #f8fafc !important;
    }
    `
    }
  `;

  // Dispatch global event for components that need to respond
  window.dispatchEvent(
    new CustomEvent("smhub-theme-changed", {
      detail: { theme, color, cardStyle, isDark },
    })
  );
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  accentColor: "#C9A227",
  setAccentColor: () => {},
  cardStyle: "modern",
  setCardStyle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accentColor, setAccentColorState] = useState<string>("#C9A227");
  const [cardStyle, setCardStyleState] = useState<"modern" | "glass" | "minimal">("modern");

  useEffect(() => {
    try {
      let savedTheme: Theme = "dark";
      let savedColor = "#C9A227";
      let savedCardStyle: "modern" | "glass" | "minimal" = "modern";

      // 1. Check direct keys first
      const directTheme = localStorage.getItem("smhub_theme") as Theme | null;
      const directAccent = localStorage.getItem("smhub_accent");
      if (directTheme) savedTheme = directTheme;
      if (directAccent && directAccent.startsWith("#")) savedColor = directAccent;

      // 2. Check appearances bundle
      const storedAppearances = localStorage.getItem("smhub_page_appearances");
      if (storedAppearances) {
        const parsed = JSON.parse(storedAppearances);
        if (parsed?.system?.theme) savedTheme = parsed.system.theme;
        if (parsed?.system?.accentColor && parsed.system.accentColor.startsWith("#")) {
          savedColor = parsed.system.accentColor;
        }
        if (parsed?.system?.cardStyle) savedCardStyle = parsed.system.cardStyle;
      } else {
        // 3. Fallback to preferences bundle
        const storedPrefs = localStorage.getItem("smhub_preferences");
        if (storedPrefs) {
          const parsedPrefs = JSON.parse(storedPrefs);
          if (parsedPrefs?.theme) savedTheme = parsedPrefs.theme;
          if (parsedPrefs?.accentColor && parsedPrefs.accentColor.startsWith("#")) {
            savedColor = parsedPrefs.accentColor;
          }
        }
      }

      setThemeState(savedTheme);
      setAccentColorState(savedColor);
      setCardStyleState(savedCardStyle);
      applyThemeAndAccent(savedTheme, savedColor, savedCardStyle);
    } catch (e) {
      console.error("Erro ao inicializar tema:", e);
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyThemeAndAccent(t, accentColor, cardStyle);
    try {
      localStorage.setItem("smhub_theme", t);
      const stored = localStorage.getItem("smhub_page_appearances");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.system = { ...parsed.system, theme: t };
        localStorage.setItem("smhub_page_appearances", JSON.stringify(parsed));
      }
      const storedPrefs = localStorage.getItem("smhub_preferences");
      if (storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs);
        parsedPrefs.theme = t;
        localStorage.setItem("smhub_preferences", JSON.stringify(parsedPrefs));
      }
    } catch (e) {}
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    applyThemeAndAccent(theme, color, cardStyle);
    try {
      localStorage.setItem("smhub_accent", color);
      const stored = localStorage.getItem("smhub_page_appearances");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.system = { ...parsed.system, accentColor: color };
        localStorage.setItem("smhub_page_appearances", JSON.stringify(parsed));
      }
      const storedPrefs = localStorage.getItem("smhub_preferences");
      if (storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs);
        parsedPrefs.accentColor = color;
        localStorage.setItem("smhub_preferences", JSON.stringify(parsedPrefs));
      }
    } catch (e) {}
  };

  const setCardStyle = (style: "modern" | "glass" | "minimal") => {
    setCardStyleState(style);
    applyThemeAndAccent(theme, accentColor, style);
    try {
      const stored = localStorage.getItem("smhub_page_appearances");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.system = { ...parsed.system, cardStyle: style };
        localStorage.setItem("smhub_page_appearances", JSON.stringify(parsed));
      }
    } catch (e) {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        accentColor,
        setAccentColor,
        cardStyle,
        setCardStyle,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

