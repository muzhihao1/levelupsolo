import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardTest() {
  const [results, setResults] = useState<any[]>([]);
  
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setResults(prev => [...prev, { test: "No token", status: "error" }]);
      return;
    }
    
    // Test all API endpoints
    const tests = [
      { url: "/api/auth/user", method: "GET" },
      { url: "/api/data?type=profile", method: "GET" },
      { url: "/api/data?type=stats", method: "GET" },
      { url: "/api/data?type=skills", method: "GET" },
      { url: "/api/data?type=goals", method: "GET" },
      { url: "/api/data?type=tasks", method: "GET" },
    ];
    
    tests.forEach(async (test) => {
      try {
        const response = await fetch(test.url, {
          method: test.method,
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        
        const data = response.ok ? await response.json() : null;
        
        setResults(prev => [...prev, {
          test: `${test.method} ${test.url}`,
          status: response.status,
          statusText: response.statusText,
          data: data,
          error: !response.ok ? `${response.status} ${response.statusText}` : null
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          test: `${test.method} ${test.url}`,
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        }]);
      }
    });
  }, []);
  
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Token:</strong> {localStorage.getItem("accessToken") ? "Present" : "Missing"}
            </div>
            {results.map((result, index) => (
              <div key={index} className={`p-4 border rounded ${result.status === 200 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div><strong>Test:</strong> {result.test}</div>
                <div><strong>Status:</strong> {result.status} {result.statusText}</div>
                {result.error && <div><strong>Error:</strong> {result.error}</div>}
                {result.data && <details>
                  <summary>Response Data</summary>
                  <pre className="text-xs">{JSON.stringify(result.data, null, 2)}</pre>
                </details>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}