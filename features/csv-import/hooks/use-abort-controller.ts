import { useRef, useCallback, useEffect } from "react";

interface UseAbortControllerReturn {
  abort: () => void;
  getSignal: () => AbortSignal | undefined;
  reset: () => void;
}

export function useAbortController(): UseAbortControllerReturn {
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const getSignal = useCallback(() => {
    return abortControllerRef.current?.signal;
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    abort,
    getSignal,
    reset,
  };
}
