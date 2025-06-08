import { useAuth, type User } from "./useAuth";

/**
 * Hook for user authentication and state management
 * This is an alias for useAuth to maintain compatibility with different import patterns
 *
 * Provides:
 * - User authentication state
 * - User data (id, email, name, etc.)
 * - Loading states
 * - Authentication methods (logout, refresh)
 * - Owner detection for special dashboard access
 */
export function useUser() {
  const auth = useAuth();

  // Check if current user is the owner
  // Note: Using hardcoded owner email since this is client-side code
  const ownerEmail = "shajith240@gmail.com";
  const isOwner = auth.user?.email?.toLowerCase() === ownerEmail.toLowerCase();

  return {
    ...auth,
    isOwner,
    // Alias for compatibility
    isLoading: auth.isLoading,
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
  };
}

// Export the User type for convenience
export type { User };

// Default export for flexibility
export default useUser;
