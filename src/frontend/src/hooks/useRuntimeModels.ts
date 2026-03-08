import { useQuery } from "@tanstack/react-query";
import { platformApi } from "@/lib/api/platform";

type Option = { label: string; value: string };

export function useRuntimeModels() {
  const query = useQuery({
    queryKey: ["runtime-models"],
    queryFn: () => platformApi.runtimeModels()
  });

  const providerOptions: Option[] = [];
  const modelOptionsByProvider: Record<string, Option[]> = {};

  if (query.data) {
    const seen = new Set<string>();
    for (const m of query.data) {
      const provider = m.provider || "unknown";
      if (!seen.has(provider)) {
        providerOptions.push({ label: provider, value: provider });
        seen.add(provider);
      }

      if (!modelOptionsByProvider[provider]) modelOptionsByProvider[provider] = [];
      for (const modelName of m.models) {
        modelOptionsByProvider[provider].push({ label: modelName, value: modelName });
      }
    }
  }

  return {
    ...query,
    providerOptions,
    modelOptionsByProvider
  };
}
