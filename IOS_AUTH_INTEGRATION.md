# iOS App 认证集成指南

## 概述
Level Up Solo 使用 JWT 认证系统，完全兼容 iOS 应用。本指南详细说明如何在 iOS 应用中集成认证功能。

## API 端点

基础 URL: `https://www.levelupsolo.net/api`

### 认证相关端点

#### 1. 登录
```
POST /api/auth/simple-login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

响应:
{
  "message": "登录成功",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "名",
    "lastName": "姓"
  }
}
```

#### 2. 获取用户信息
```
GET /api/auth/user
Authorization: Bearer <accessToken>

响应:
{
  "id": "user_id",
  "email": "user@example.com",
  "firstName": "名",
  "lastName": "姓",
  "hasCompletedOnboarding": true
}
```

#### 3. 刷新 Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

响应:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

## Swift 实现示例

### 1. 网络管理器
```swift
import Foundation

class APIManager {
    static let shared = APIManager()
    private let baseURL = "https://www.levelupsolo.net/api"
    
    private var accessToken: String? {
        get { KeychainHelper.shared.get("accessToken") }
        set { 
            if let token = newValue {
                KeychainHelper.shared.save(token, for: "accessToken")
            } else {
                KeychainHelper.shared.delete("accessToken")
            }
        }
    }
    
    private var refreshToken: String? {
        get { KeychainHelper.shared.get("refreshToken") }
        set { 
            if let token = newValue {
                KeychainHelper.shared.save(token, for: "refreshToken")
            } else {
                KeychainHelper.shared.delete("refreshToken")
            }
        }
    }
}
```

### 2. 登录功能
```swift
extension APIManager {
    func login(email: String, password: String) async throws -> User {
        let url = URL(string: "\(baseURL)/auth/simple-login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.loginFailed
        }
        
        let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
        
        // 保存 tokens
        self.accessToken = loginResponse.accessToken
        self.refreshToken = loginResponse.refreshToken
        
        return loginResponse.user
    }
}
```

### 3. 认证请求拦截
```swift
extension APIManager {
    func authenticatedRequest(to endpoint: String, 
                            method: String = "GET", 
                            body: Data? = nil) async throws -> Data {
        guard let token = accessToken else {
            throw AuthError.notAuthenticated
        }
        
        let url = URL(string: "\(baseURL)\(endpoint)")!
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            switch httpResponse.statusCode {
            case 200...299:
                return data
            case 401:
                // Token 过期，尝试刷新
                try await refreshTokens()
                // 重试请求
                return try await authenticatedRequest(to: endpoint, 
                                                    method: method, 
                                                    body: body)
            default:
                throw APIError.requestFailed(statusCode: httpResponse.statusCode)
            }
        }
        
        return data
    }
    
    private func refreshTokens() async throws {
        guard let refreshToken = refreshToken else {
            throw AuthError.refreshTokenMissing
        }
        
        let url = URL(string: "\(baseURL)/auth/refresh")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["refreshToken": refreshToken]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            // 刷新失败，需要重新登录
            self.logout()
            throw AuthError.sessionExpired
        }
        
        let refreshResponse = try JSONDecoder().decode(RefreshResponse.self, from: data)
        self.accessToken = refreshResponse.accessToken
        self.refreshToken = refreshResponse.refreshToken
    }
}
```

### 4. 数据模型
```swift
struct LoginResponse: Codable {
    let message: String
    let accessToken: String
    let refreshToken: String
    let user: User
}

struct User: Codable {
    let id: String
    let email: String
    let firstName: String?
    let lastName: String?
    let hasCompletedOnboarding: Bool?
}

struct RefreshResponse: Codable {
    let accessToken: String
    let refreshToken: String
}

enum AuthError: Error {
    case loginFailed
    case notAuthenticated
    case refreshTokenMissing
    case sessionExpired
}

enum APIError: Error {
    case requestFailed(statusCode: Int)
}
```

### 5. Keychain 助手
```swift
import Security

class KeychainHelper {
    static let shared = KeychainHelper()
    
    func save(_ value: String, for key: String) {
        let data = value.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func get(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return value
    }
    
    func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}
```

## 使用示例

### 登录
```swift
Task {
    do {
        let user = try await APIManager.shared.login(
            email: "demo@levelupsolo.net", 
            password: "demo1234"
        )
        print("登录成功: \(user.email)")
    } catch {
        print("登录失败: \(error)")
    }
}
```

### 获取任务列表
```swift
Task {
    do {
        let data = try await APIManager.shared.authenticatedRequest(to: "/tasks")
        let tasks = try JSONDecoder().decode([Task].self, from: data)
        print("获取到 \(tasks.count) 个任务")
    } catch {
        print("获取任务失败: \(error)")
    }
}
```

## 注意事项

1. **Token 存储安全**
   - 使用 iOS Keychain 存储敏感信息
   - 不要存储在 UserDefaults 中

2. **错误处理**
   - 401 错误自动刷新 token
   - 刷新失败跳转到登录页面

3. **网络配置**
   - Info.plist 中确保允许 HTTPS 请求
   - 处理网络超时和重试

4. **并发处理**
   - 避免多个请求同时刷新 token
   - 使用 actor 或锁机制保护 token 操作

## 测试账号

开发测试时可以使用：
- 邮箱: `demo@levelupsolo.net`
- 密码: `demo1234`

## 后续步骤

1. 实现用户注册功能
2. 添加生物识别登录
3. 实现离线模式支持
4. 添加推送通知集成