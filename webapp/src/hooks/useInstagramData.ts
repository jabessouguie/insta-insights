"use client";

import useSWR from "swr";
import type { DataApiResponse, InstagramAnalytics } from "@/types/instagram";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface UseInstagramDataReturn {
  data: InstagramAnalytics | undefined;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useInstagramData(): UseInstagramDataReturn {
  const { data, error, isLoading, mutate } = useSWR<DataApiResponse>("/api/data", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60_000 * 5, // 5 min
  });

  return {
    data: data?.data,
    isLoading,
    isError: !!error || (!!data && !data.success),
    mutate,
  };
}
