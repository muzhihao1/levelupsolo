import { useQuery } from "@tanstack/react-query";

interface UserData {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<UserData>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}