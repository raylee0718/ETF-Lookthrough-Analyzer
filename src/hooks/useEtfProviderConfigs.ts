import { useEffect, useMemo, useState } from "react";
import type {
  EtfHoldingsProviderType,
  EtfProviderConfig,
} from "../types/etfProvider";

export const ETF_PROVIDER_CONFIGS_STORAGE_KEY =
  "etf-lookthrough-etf-provider-configs";

const providerTypes: EtfHoldingsProviderType[] = [
  "manual",
  "csv",
  "sitca",
  "issuer",
  "custom",
];

const isEtfProviderConfig = (value: unknown): value is EtfProviderConfig => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const config = value as Record<string, unknown>;

  return (
    typeof config.etfSymbol === "string" &&
    providerTypes.includes(config.providerType as EtfHoldingsProviderType) &&
    typeof config.enabled === "boolean" &&
    (config.sourceUrl === undefined || typeof config.sourceUrl === "string") &&
    (config.notes === undefined || typeof config.notes === "string")
  );
};

const normalizeConfig = (config: EtfProviderConfig): EtfProviderConfig => ({
  etfSymbol: config.etfSymbol.trim().toUpperCase(),
  providerType: config.providerType,
  sourceUrl: config.sourceUrl?.trim() || undefined,
  notes: config.notes?.trim() || undefined,
  enabled: config.enabled,
});

const parseStoredConfigs = (rawValue: string | null) => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue) || !parsedValue.every(isEtfProviderConfig)) {
      return [];
    }

    return parsedValue.map(normalizeConfig);
  } catch {
    return [];
  }
};

export function useEtfProviderConfigs() {
  const [providerConfigs, setProviderConfigs] = useState<EtfProviderConfig[]>(
    () =>
      parseStoredConfigs(
        window.localStorage.getItem(ETF_PROVIDER_CONFIGS_STORAGE_KEY),
      ),
  );

  useEffect(() => {
    window.localStorage.setItem(
      ETF_PROVIDER_CONFIGS_STORAGE_KEY,
      JSON.stringify(providerConfigs),
    );
  }, [providerConfigs]);

  const sortedProviderConfigs = useMemo(
    () =>
      [...providerConfigs].sort((a, b) =>
        a.etfSymbol.localeCompare(b.etfSymbol),
      ),
    [providerConfigs],
  );

  const upsertProviderConfig = (input: EtfProviderConfig) => {
    const normalizedInput = normalizeConfig(input);

    if (!normalizedInput.etfSymbol) {
      return;
    }

    setProviderConfigs((currentConfigs) => {
      const existingConfig = currentConfigs.find(
        (config) => config.etfSymbol === normalizedInput.etfSymbol,
      );

      if (!existingConfig) {
        return [...currentConfigs, normalizedInput];
      }

      return currentConfigs.map((config) =>
        config.etfSymbol === normalizedInput.etfSymbol
          ? normalizedInput
          : config,
      );
    });
  };

  const deleteProviderConfig = (etfSymbol: string) => {
    const normalizedEtfSymbol = etfSymbol.trim().toUpperCase();

    setProviderConfigs((currentConfigs) =>
      currentConfigs.filter((config) => config.etfSymbol !== normalizedEtfSymbol),
    );
  };

  const resetProviderConfigs = () => {
    setProviderConfigs([]);
  };

  return {
    providerConfigs: sortedProviderConfigs,
    upsertProviderConfig,
    deleteProviderConfig,
    resetProviderConfigs,
  };
}
