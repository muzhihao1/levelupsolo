# iOS-Web Data Synchronization Plan

## Overview
This document outlines a comprehensive plan to synchronize data between the iOS app and Web app for Level Up Solo, ensuring seamless user experience across platforms.

## Current State Analysis

### Web Application (90% complete)
- **Backend**: Node.js + Express + PostgreSQL + Drizzle ORM
- **Auth**: Session-based authentication with JWT support
- **API**: RESTful endpoints at `https://www.levelupsolo.net/api`
- **Deployment**: Railway with PostgreSQL database

### iOS Application (65% complete)
- **Frontend**: Native SwiftUI
- **Auth**: JWT-based authentication
- **Network**: NetworkManager with retry logic
- **Local Storage**: Core Data (setup but not fully implemented)
- **API**: Connects to same backend as Web

### Shared Infrastructure
- **Database**: Single PostgreSQL instance
- **API**: Unified RESTful API
- **Auth**: JWT tokens for mobile, sessions for web

## Phase 1: Authentication Alignment (Week 1)

### 1.1 Unified Auth Token Management
- **Goal**: Ensure both platforms can authenticate seamlessly
- **Tasks**:
  - [ ] Implement refresh token rotation on both platforms
  - [ ] Add device tracking for multi-device support
  - [ ] Create unified session management API
  - [ ] Implement secure token storage on iOS (Keychain)
  - [ ] Add biometric authentication support on iOS

### 1.2 Cross-Platform Login
- **Goal**: Allow users to log in on one platform and access on another
- **Implementation**:
  ```typescript
  // Backend: Add device registration endpoint
  POST /api/auth/devices
  {
    "deviceId": "unique-device-id",
    "platform": "ios|web",
    "deviceName": "iPhone 15 Pro",
    "pushToken": "optional-for-notifications"
  }
  ```

## Phase 2: Real-Time Data Synchronization (Week 2-3)

### 2.1 WebSocket Implementation
- **Goal**: Enable real-time updates across devices
- **Architecture**:
  ```
  Web App ←→ WebSocket Server ←→ iOS App
                    ↓
                PostgreSQL
  ```

### 2.2 Sync Protocol Design
```typescript
interface SyncMessage {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'task' | 'goal' | 'skill' | 'milestone';
  data: any;
  timestamp: Date;
  deviceId: string;
  userId: string;
}
```

### 2.3 Implementation Steps
1. **Backend WebSocket Server**:
   - Add Socket.io to existing Express server
   - Create rooms for each user
   - Implement message broadcasting

2. **iOS WebSocket Client**:
   - Integrate URLSessionWebSocketTask
   - Handle reconnection logic
   - Queue messages during offline periods

3. **Web WebSocket Client**:
   - Add Socket.io client
   - Implement optimistic updates
   - Handle connection state UI

## Phase 3: Offline Support & Conflict Resolution (Week 4-5)

### 3.1 iOS Offline Capability
- **Goal**: Full functionality without internet connection
- **Implementation**:
  ```swift
  // Core Data schema matching server models
  @Model
  class CDTask {
      @Attribute(.unique) var id: Int
      var title: String
      var syncStatus: SyncStatus
      var lastModified: Date
      var conflictResolution: ConflictResolution?
  }
  
  enum SyncStatus {
      case synced
      case pendingCreate
      case pendingUpdate
      case pendingDelete
      case conflict
  }
  ```

### 3.2 Conflict Resolution Strategy
1. **Last-Write-Wins (LWW)**: Default for most fields
2. **Merge Strategy**: For arrays (tags, skills)
3. **User Choice**: For critical conflicts
4. **Version Vectors**: Track changes per device

### 3.3 Sync Queue Implementation
```swift
// iOS: DataSyncService enhancement
class EnhancedDataSyncService {
    private var syncQueue: [SyncOperation] = []
    private var conflictResolver: ConflictResolver
    
    func queueOperation(_ operation: SyncOperation) {
        syncQueue.append(operation)
        if NetworkMonitor.shared.isConnected {
            processSyncQueue()
        }
    }
    
    func resolveConflict(_ local: Entity, _ remote: Entity) -> Entity {
        // Implement conflict resolution logic
    }
}
```

## Phase 4: Data Consistency & Integrity (Week 6)

### 4.1 Transaction Management
- **Goal**: Ensure atomic operations across platforms
- **Implementation**:
  - Add transaction IDs to all operations
  - Implement rollback mechanisms
  - Create audit logs for debugging

### 4.2 Data Validation
```typescript
// Shared validation rules
const ValidationRules = {
  task: {
    title: { minLength: 2, maxLength: 200 },
    expReward: { min: 5, max: 100 },
    energyCost: { min: 1, max: 5 }
  },
  // ... other entities
};
```

### 4.3 Consistency Checks
- Implement periodic sync validation
- Add checksum verification
- Create repair mechanisms for corrupted data

## Phase 5: Performance Optimization (Week 7)

### 5.1 Differential Sync
- **Goal**: Minimize data transfer
- **Implementation**:
  - Send only changed fields
  - Implement compression (gzip)
  - Use binary protocols for large data

### 5.2 Intelligent Caching
```swift
// iOS: Smart cache management
class CacheManager {
    func prioritizeCache() {
        // Cache frequently accessed data
        // Evict old/unused data
        // Prefetch predicted data
    }
}
```

### 5.3 Batch Operations
- Group multiple updates
- Implement debouncing for rapid changes
- Use pagination for large datasets

## Phase 6: User Experience Enhancements (Week 8)

### 6.1 Sync Status UI
- **Web**: Add sync indicator in header
- **iOS**: Create SyncStatusView component
- **Both**: Show pending changes count

### 6.2 Cross-Device Notifications
- Push notifications for important updates
- In-app notifications for sync events
- Email summaries for offline periods

### 6.3 Data Export/Import
- Allow users to export their data
- Support data migration between accounts
- Implement backup/restore functionality

## Technical Implementation Details

### API Versioning Strategy
```typescript
// Support multiple API versions
app.use('/api/v1', legacyRoutes);
app.use('/api/v2', currentRoutes);

// Version negotiation header
headers: {
  'X-API-Version': '2.0',
  'X-Min-Version': '1.0'
}
```

### Database Schema Updates
```sql
-- Add sync metadata to all tables
ALTER TABLE tasks ADD COLUMN device_id VARCHAR(50);
ALTER TABLE tasks ADD COLUMN sync_version INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN last_synced_at TIMESTAMP;

-- Create sync history table
CREATE TABLE sync_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  device_id VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  operation VARCHAR(20) NOT NULL,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Security Considerations
1. **Encryption**: All sync data encrypted in transit (TLS)
2. **Authentication**: Verify device ownership
3. **Rate Limiting**: Prevent sync abuse
4. **Data Privacy**: Ensure user data isolation

## Testing Strategy

### 1. Unit Tests
- Sync queue operations
- Conflict resolution logic
- Data transformation

### 2. Integration Tests
- Multi-device scenarios
- Network failure handling
- Large dataset synchronization

### 3. E2E Tests
- Complete user workflows across platforms
- Offline/online transitions
- Concurrent editing scenarios

## Rollout Plan

### Phase 1: Beta Testing (Week 9)
1. Enable for internal team
2. Monitor sync performance
3. Gather feedback

### Phase 2: Gradual Rollout (Week 10)
1. 10% of users
2. 50% of users
3. 100% deployment

### Phase 3: Monitoring (Ongoing)
- Track sync success rates
- Monitor conflict frequency
- Measure sync latency

## Success Metrics

1. **Sync Reliability**: >99.9% success rate
2. **Sync Speed**: <2s for typical operations
3. **Conflict Rate**: <0.1% of operations
4. **User Satisfaction**: >4.5/5 rating
5. **Cross-Platform Usage**: >30% using both platforms

## Risk Mitigation

### 1. Data Loss Prevention
- Regular automated backups
- Transaction logs
- User-triggered restore points

### 2. Performance Degradation
- Circuit breakers for sync operations
- Fallback to manual sync
- Progressive sync for large accounts

### 3. Platform Divergence
- Shared schema definitions
- Automated compatibility tests
- Feature flags for platform-specific features

## Next Steps

1. **Immediate Actions**:
   - Complete Core Data implementation in iOS
   - Add WebSocket support to backend
   - Create sync status UI components

2. **Short-term Goals**:
   - Implement basic offline support
   - Add conflict detection
   - Create sync analytics dashboard

3. **Long-term Vision**:
   - Real-time collaboration features
   - Multi-user shared goals
   - Cross-platform widgets

## Conclusion

This synchronization plan ensures that Level Up Solo users can seamlessly switch between Web and iOS platforms while maintaining data consistency and enjoying a responsive, reliable experience. The phased approach allows for iterative improvements and risk mitigation while delivering value to users quickly.