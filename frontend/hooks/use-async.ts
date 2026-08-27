"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[]
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const cancelledRef = useRef(false);

  const execute = useCallback(() => {
    cancelledRef.current = false;
    setState({ data: null, error: null, loading: true });
    fn()
      .then((data) => {
        if (!cancelledRef.current) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch((err) => {
        if (!cancelledRef.current) {
          setState({
            data: null,
            error: err instanceof Error ? err.message : String(err),
            loading: false,
          });
        }
      });
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  deps);

  useEffect(() => {
    execute();
    return () => {
      cancelledRef.current = true;
    };
  }, [execute]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { ...state, refetch };
}
