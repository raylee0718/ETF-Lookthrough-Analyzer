import { useEffect, useState } from "react";
import type {
  AppSettings,
  PortfolioDataSourceMode,
} from "../types/settings";

export const APP_SETTINGS_STORAGE_KEY = "etf-lookthrough-app-settings";
const SETTINGS_CHANGED_EVENT = "etf-lookthrough-app-settings-changed";

export const defaultAppSettings: AppSettings = {
  portfolioDataSourceMode: "manual",
};

const isAppSettings = (value: unknown): value is AppSettings => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const settings = value as Record<string, unknown>;

  return (
    settings.portfolioDataSourceMode === "manual" ||
    settings.portfolioDataSourceMode === "transactions"
  );
};

const loadSettings = () => {
  const rawValue = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);

  if (!rawValue) {
    return defaultAppSettings;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    return isAppSettings(parsedValue) ? parsedValue : defaultAppSettings;
  } catch {
    return defaultAppSettings;
  }
};

const saveSettings = (settings: AppSettings) => {
  window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    const handleSettingsChanged = () => {
      setSettings(loadSettings());
    };

    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    window.addEventListener("storage", handleSettingsChanged);

    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
      window.removeEventListener("storage", handleSettingsChanged);
    };
  }, []);

  const updateSettings = (partialSettings: Partial<AppSettings>) => {
    const nextSettings = {
      ...loadSettings(),
      ...partialSettings,
    };

    saveSettings(nextSettings);
    setSettings(nextSettings);
  };

  const setPortfolioDataSourceMode = (mode: PortfolioDataSourceMode) => {
    updateSettings({ portfolioDataSourceMode: mode });
  };

  const resetSettings = () => {
    saveSettings(defaultAppSettings);
    setSettings(defaultAppSettings);
  };

  return {
    settings,
    updateSettings,
    setPortfolioDataSourceMode,
    resetSettings,
  };
}
