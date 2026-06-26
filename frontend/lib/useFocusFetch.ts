import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Runs fetch on screen focus; ignores stale results if user navigates away mid-request.
 */
export function useFocusFetch(
  fetchFn: () => Promise<void>,
  deps: readonly unknown[],
) {
  const requestId = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const id = ++requestId.current;
      let active = true;

      (async () => {
        try {
          await fetchFn();
        } finally {
          if (!active || id !== requestId.current) return;
        }
      })();

      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps),
  );
}
