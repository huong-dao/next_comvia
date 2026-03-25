"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ComviaApiError } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";

export type ComviaQueryState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  forbidden: boolean;
  unauthorized: boolean;
};

/** `fetcher` nên bọc `useCallback` theo biến phụ thuộc (vd `workspaceId`) để tránh gọi API lặp không cần thiết. */
export function useComviaQuery<T>(enabled: boolean, fetcher: (token: string) => Promise<T>) {
  const router = useRouter();
  const [state, setState] = useState<ComviaQueryState<T>>({
    data: null,
    error: null,
    loading: Boolean(enabled),
    forbidden: false,
    unauthorized: false,
  });

  const refetch = useCallback(async () => {
    if (!enabled) return;
    const token = getAccessToken();
    if (!token) {
      setState({
        data: null,
        error: null,
        loading: false,
        forbidden: false,
        unauthorized: true,
      });
      router.replace("/auth/login");
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      forbidden: false,
      unauthorized: false,
    }));

    try {
      const data = await fetcher(token);
      setState({
        data,
        error: null,
        loading: false,
        forbidden: false,
        unauthorized: false,
      });
    } catch (e) {
      if (e instanceof ComviaApiError) {
        if (e.statusCode === 401) {
          setState({
            data: null,
            error: e.message,
            loading: false,
            forbidden: false,
            unauthorized: true,
          });
          router.replace("/auth/login");
          return;
        }
        if (e.statusCode === 403) {
          setState({
            data: null,
            error: e.message,
            loading: false,
            forbidden: true,
            unauthorized: false,
          });
          return;
        }
        setState({
          data: null,
          error: e.message,
          loading: false,
          forbidden: false,
          unauthorized: false,
        });
        return;
      }

      const message = e instanceof Error ? e.message : "Lỗi không xác định";
      setState({
        data: null,
        error: message,
        loading: false,
        forbidden: false,
        unauthorized: false,
      });
    }
  }, [enabled, fetcher, router]);

  useEffect(() => {
    // Only run on client after mount; avoids SSR `location is not defined`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refetch();
  }, [refetch]);

  return { ...state, refetch };
}

export function useComviaMutation<TResult>() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (fn: (token: string) => Promise<TResult>) => {
      const token = getAccessToken();
      if (!token) {
        router.replace("/auth/login");
        throw new Error("Chưa đăng nhập");
      }

      setLoading(true);
      setError(null);

      try {
        return await fn(token);
      } catch (e) {
        if (e instanceof ComviaApiError) {
          if (e.statusCode === 401) {
            router.replace("/auth/login");
          }
          setError(e.message);
          throw e;
        }
        const message = e instanceof Error ? e.message : "Lỗi không xác định";
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return { run, loading, error, setError };
}
