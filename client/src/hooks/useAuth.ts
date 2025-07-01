import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface UserData {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

async function fetchWithAuth(url: string) {
  const token = localStorage.getItem("accessToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(url, { headers });
  
  if (response.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      const refreshResponse = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (refreshResponse.ok) {
        const { accessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", newRefreshToken);
        
        // Retry original request
        return fetch(url, {
          headers: {
            ...headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } else {
        // Refresh failed, clear tokens
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }
  }
  
  return response;
}

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<UserData>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      
      // Handle JWT tokens
      if (token) {
        const response = await fetchWithAuth("/api/auth/user");
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        return response.json();
      }
      
      // No token
      throw new Error("No authentication token");
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Check for tokens on mount
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token && !user && !isLoading) {
      refetch();
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}