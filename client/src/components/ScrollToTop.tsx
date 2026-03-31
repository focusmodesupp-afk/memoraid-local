import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Scrolls window to top when route changes.
 * Use inside Router for user-facing pages (landing, login, dashboard).
 */
export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}
