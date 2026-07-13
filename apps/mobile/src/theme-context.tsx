import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";
import { setColorScheme } from "@versemark/core";
import {
  darkColors,
  lightColors,
  makeTypography,
  type ColorScheme,
  type ThemeColors,
  type ThemePreference,
} from "./theme";

const THEME_KEY = "versemark:appearance";

type ThemeValue = {
  colors: ThemeColors;
  typography: ReturnType<typeof makeTypography>;
  scheme: ColorScheme;
  preference: ThemePreference;
  reduceMotion: boolean;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === "dark" ? "dark" : "light";
  const [preferenceOverride, setPreferenceOverride] = useState<ThemePreference>();
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    void AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "system" || stored === "light" || stored === "dark") {
        setPreferenceOverride(stored);
      }
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const preference = preferenceOverride ?? "system";
  const scheme: ColorScheme = preference === "system" ? system : preference;
  const colors = scheme === "dark" ? darkColors : lightColors;

  useEffect(() => {
    setColorScheme(scheme);
  }, [scheme]);

  const cycleTheme = useCallback(() => {
    setPreferenceOverride((currentOverride) => {
      const current = currentOverride ?? "system";
      const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
      void AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      colors,
      typography: makeTypography(colors),
      scheme,
      preference,
      reduceMotion,
      cycleTheme,
    }),
    [colors, cycleTheme, preference, reduceMotion, scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
