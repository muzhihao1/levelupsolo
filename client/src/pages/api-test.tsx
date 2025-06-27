import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApiTest() {
  const [results, setResults] = useState<any[]>([]);

  const testEndpoint = async (url: string, method: string = 'GET') => {
    const token = localStorage.getItem("accessToken");
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      const duration = Date.now() - startTime;
      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      
      setResults(prev => [...prev, {
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        duration,
        ok: response.ok,
        data: data,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString(),
      }]);
    } catch (error: any) {
      setResults(prev => [...prev, {
        url,
        method,
        error: error.message,
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const runTests = () => {
    setResults([]);
    // Test various endpoints
    testEndpoint('/api/health');
    testEndpoint('/api/auth/user');
    testEndpoint('/api/tasks');
    testEndpoint('/api/data?type=tasks');
    testEndpoint('/api/skills');
    testEndpoint('/api/data?type=skills');
    testEndpoint('/api/user-stats');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTests}>Run API Tests</Button>
          
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="border rounded p-3 text-sm">
                <div className="font-mono font-semibold">
                  {result.method} {result.url}
                </div>
                {result.error ? (
                  <div className="text-red-500">Error: {result.error}</div>
                ) : (
                  <>
                    <div className={result.ok ? "text-green-600" : "text-red-600"}>
                      Status: {result.status} {result.statusText} ({result.duration}ms)
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Response Data</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Headers</summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.headers, null, 2)}
                      </pre>
                    </details>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}