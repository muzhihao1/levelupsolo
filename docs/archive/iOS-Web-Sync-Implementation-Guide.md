# iOS-Web Sync Implementation Guide

## Quick Start Implementation (This Week)

### Day 1-2: Fix Current Sync Issues

#### 1. Enable Core Data in iOS App
```swift
// DataManager.swift - Enable Core Data
class DataManager {
    static let shared = DataManager()
    
    lazy var persistentContainer: NSPersistentContainer = {
        let container = NSPersistentContainer(name: "LevelUpSolo")
        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Core Data failed to load: \(error)")
            }
        }
        return container
    }()
    
    func save() {
        let context = persistentContainer.viewContext
        if context.hasChanges {
            try? context.save()
        }
    }
}
```

#### 2. Add Sync Metadata to Backend
```typescript
// server/schema.ts - Add sync fields
export const tasks = pgTable('tasks', {
  // ... existing fields
  deviceId: varchar('device_id', { length: 50 }),
  syncVersion: integer('sync_version').default(1),
  lastSyncedAt: timestamp('last_synced_at'),
});
```

### Day 3-4: Implement Basic Offline Support

#### 1. iOS Offline Queue
```swift
// OfflineSyncQueue.swift
class OfflineSyncQueue {
    private var pendingOperations: [SyncOperation] = []
    
    func addOperation(_ operation: SyncOperation) {
        pendingOperations.append(operation)
        UserDefaults.standard.set(
            try? JSONEncoder().encode(pendingOperations),
            forKey: "pendingSync"
        )
    }
    
    func processPendingOperations() async {
        for operation in pendingOperations {
            do {
                try await operation.execute()
                removeOperation(operation)
            } catch {
                print("Sync failed: \(error)")
            }
        }
    }
}
```

#### 2. Network State Monitoring
```swift
// NetworkMonitor enhancement
extension NetworkMonitor {
    func startMonitoringForSync() {
        pathUpdateHandler = { path in
            if path.status == .satisfied {
                Task {
                    await OfflineSyncQueue.shared.processPendingOperations()
                }
            }
        }
    }
}
```

### Day 5: Add Conflict Detection

#### 1. Version Tracking
```swift
// Add to UserTask model
struct UserTask: Codable {
    // ... existing fields
    var syncVersion: Int = 1
    var lastModifiedAt: Date = Date()
    var deviceId: String?
}
```

#### 2. Simple Conflict Resolution
```swift
// ConflictResolver.swift
enum ConflictResolution {
    case keepLocal
    case keepRemote
    case merge
}

class ConflictResolver {
    func resolve(local: UserTask, remote: UserTask) -> UserTask {
        // Simple last-write-wins
        if local.lastModifiedAt > remote.lastModifiedAt {
            return local
        }
        return remote
    }
}
```

## Immediate Implementation Checklist

### Backend Changes Needed
- [ ] Add sync metadata columns to all tables
- [ ] Create sync status endpoint: `GET /api/sync/status`
- [ ] Add device registration: `POST /api/auth/devices`
- [ ] Implement sync endpoint: `POST /api/sync/batch`

### iOS Changes Needed
- [ ] Enable Core Data persistence
- [ ] Implement offline queue
- [ ] Add sync status UI indicator
- [ ] Create background sync task
- [ ] Handle auth token refresh

### Web Changes Needed
- [ ] Add sync status indicator
- [ ] Implement optimistic updates
- [ ] Add conflict resolution UI
- [ ] Create sync settings page

## Testing Checklist

### Scenario 1: Basic Offline Sync
1. Create task on iOS while offline
2. Go online
3. Verify task appears on web

### Scenario 2: Concurrent Editing
1. Edit task on iOS
2. Edit same task on web
3. Verify conflict resolution

### Scenario 3: Bulk Operations
1. Create 10+ tasks offline
2. Go online
3. Verify all sync correctly

## Common Issues & Solutions

### Issue 1: Duplicate Tasks
**Solution**: Use unique constraint on (userId, clientId) combination

### Issue 2: Lost Updates
**Solution**: Implement proper version tracking

### Issue 3: Sync Loops
**Solution**: Add sync source tracking to prevent echoes

## Monitoring & Analytics

### Key Metrics to Track
```typescript
// Add to backend analytics
interface SyncMetrics {
  syncSuccessRate: number;
  averageSyncTime: number;
  conflictRate: number;
  offlineQueueSize: number;
  failedSyncCount: number;
}
```

### User-Facing Sync Status
```swift
// iOS: SyncStatusView.swift
struct SyncStatusView: View {
    @ObservedObject var syncManager = SyncManager.shared
    
    var body: some View {
        HStack {
            Image(systemName: syncManager.isSyncing ? "arrow.triangle.2.circlepath" : "checkmark.circle.fill")
                .foregroundColor(syncManager.hasErrors ? .red : .green)
            
            Text(syncManager.statusMessage)
                .font(.caption)
        }
    }
}
```

## Next Steps After Basic Sync

1. **Week 2**: Implement WebSocket for real-time sync
2. **Week 3**: Add comprehensive conflict resolution
3. **Week 4**: Implement differential sync
4. **Week 5**: Add sync analytics dashboard

## Resources & References

- [Apple Core Data Programming Guide](https://developer.apple.com/documentation/coredata)
- [Conflict-free Replicated Data Types (CRDTs)](https://crdt.tech/)
- [Offline-First Web Development](https://offlinefirst.org/)

## Support & Troubleshooting

For sync-related issues:
1. Check sync status endpoint
2. Review device logs
3. Verify network connectivity
4. Check for version mismatches

Remember: Start simple, test thoroughly, iterate based on user feedback!