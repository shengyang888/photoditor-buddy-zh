import { useEffect, useState } from 'react';

/** True while the media query matches. Re-evaluates on resize/orientation changes. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (): void => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Desktop layout breakpoint (side panels instead of bottom sheet). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
