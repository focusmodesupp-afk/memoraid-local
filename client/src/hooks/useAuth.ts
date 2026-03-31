/**
 * useAuth – backward-compatible hook that reads from the global AuthContext.
 * Every component that calls useAuth() now shares the same auth state;
 * only one /auth/me request fires per app session (in AuthProvider).
 */
export type { AuthUser } from '../contexts/AuthContext';
export { useAuthContext as useAuth } from '../contexts/AuthContext';
