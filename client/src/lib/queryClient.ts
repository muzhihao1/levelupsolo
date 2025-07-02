import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const token = localStorage.getItem("accessToken");
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Parse JSON response
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// 为不同类型的数据设置不同的缓存策略
const cacheConfig = {
  // 用户数据和技能数据变化较少，缓存时间较长
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  // 任务数据变化频繁，缓存时间较短
  dynamic: {
    staleTime: 0, // Always consider stale, fetch fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  // 统计数据中等变化频率
  stats: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 默认 5 分钟
      gcTime: 10 * 60 * 1000, // 默认 10 分钟
      retry: (failureCount, error) => {
        if (error.message.includes('401')) return false;
        return failureCount < 2;
      },
      // 优化网络请求
      networkMode: 'offlineFirst',
      // 结构化克隆以提高性能
      structuralSharing: true,
    },
    mutations: {
      retry: false,
      // 乐观更新的网络模式
      networkMode: 'offlineFirst',
    },
  },
});

// 导出缓存配置供组件使用
export { cacheConfig };
