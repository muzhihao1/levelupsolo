# iOS API Response Format Fix

## Problem
When loading tasks, skills, or goals in the iOS app, users were getting "资源未找到" (Resource not found) errors.

## Root Cause
The iOS app expected API responses to be wrapped in an object with a specific field (e.g., `{ tasks: [...] }`), but the backend was returning arrays directly (`[...]`).

### Mismatched Expectations:

**iOS Expected:**
```json
{
  "tasks": [...]
}
```

**Backend Returned:**
```json
[...]
```

## Solution
Updated the iOS APIService methods to handle direct array responses:

### Changed Methods:
1. `getTasks()` - Now expects array directly
2. `getSkills()` - Now expects array directly  
3. `getGoals()` - Now expects array directly

### Code Changes:
```swift
// Before
func getTasks() async throws -> [UserTask] {
    struct TasksResponse: Decodable {
        let tasks: [UserTask]
    }
    let response: TasksResponse = try await networkManager.get(endpoint: "/tasks")
    return response.tasks
}

// After
func getTasks() async throws -> [UserTask] {
    // Backend returns array directly, not wrapped in object
    return try await networkManager.get(endpoint: "/tasks")
}
```

## Impact
This fix ensures that:
- Tasks load properly in the tasks view
- Skills are retrieved correctly
- Goals display without errors
- The "资源未找到" error no longer appears

## Testing
After this change:
1. Tasks should load when opening the tasks view
2. Creating new tasks should work properly
3. Skills and goals should display correctly in their respective views