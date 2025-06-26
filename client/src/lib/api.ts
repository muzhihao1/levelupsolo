// API utility functions with JWT support

const API_BASE = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch(url: string, options: RequestOptions = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  
  // Add auth header if token exists and not skipped
  if (!skipAuth) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
  }
  
  // Ensure content-type is set for JSON requests
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    fetchOptions.headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };
  }
  
  const response = await fetch(`${API_BASE}${url}`, fetchOptions);
  
  // Handle 401 errors - try to refresh token
  if (response.status === 401 && !skipAuth) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const { accessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Retry original request with new token
          fetchOptions.headers = {
            ...fetchOptions.headers,
            'Authorization': `Bearer ${accessToken}`,
          };
          return fetch(`${API_BASE}${url}`, fetchOptions);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }
    
    // If refresh fails or no refresh token, clear auth
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/auth';
  }
  
  return response;
}

export const api = {
  get: (url: string, options?: RequestOptions) => 
    apiFetch(url, { ...options, method: 'GET' }),
    
  post: (url: string, body?: any, options?: RequestOptions) =>
    apiFetch(url, { 
      ...options, 
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    
  put: (url: string, body?: any, options?: RequestOptions) =>
    apiFetch(url, { 
      ...options, 
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    
  delete: (url: string, options?: RequestOptions) =>
    apiFetch(url, { ...options, method: 'DELETE' }),
};