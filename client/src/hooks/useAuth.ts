import { useQuery, useQueryClient } from "@tanstack/react-query";

// Define user type
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) {
          return null; // User not authenticated
        }
        throw new Error("Failed to fetch user data");
      }
      return response.json();
    },
    retry: false,
    staleTime: 0, // Always refetch to get latest user data
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const logout = async () => {
    try {
      // Call logout API endpoint
      await fetch("/api/auth/logout", {
        method: "GET",
        credentials: "include",
      });

      // Invalidate and remove user data from cache
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/user"], null);

      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshAuth = async () => {
    console.log("🔄 Refreshing authentication state...");
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    await queryClient.invalidateQueries({
      queryKey: ["/api/payments/subscription"],
    });
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isLoading, // Only consider authenticated if user exists AND not loading
    logout,
    refreshAuth,
  };
}
