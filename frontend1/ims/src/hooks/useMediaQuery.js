import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query.
 *
 * <p>Recharts needs a numeric width for axis labels before it will truncate them, and
 * CSS alone cannot hand a component that number — so layout decisions that charts
 * have to react to have to come through here.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    // Re-read on mount: the initial state is computed before fonts and layout settle,
    // so a stale value would render the desktop variant on a phone.
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export default useMediaQuery;
