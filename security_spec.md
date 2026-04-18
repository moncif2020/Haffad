# Firestore Security Specification - Hoffad (Finalized)

## Data Invariants
1. **User Ownership**: All user-related data (profiles, lessons, pairings, uploads) must be strictly owned/accessible by the authenticated `userId`.
2. **Transient Uploads**: Remote uploads (`/uploads`) are temporary; accessible by the owner or the target `deviceId`.
3. **Session Integrity**: TV sessions (`/tv_sessions`) cannot be linked without valid authentication and profile data.
4. **Denial of Wallet**: All fields have size/type constraints. Document IDs are validated via regex.
5. **Temporal Integrity**: `createdAt` and `updatedAt` are validated against `request.time`.

## The "Dirty Dozen" Payloads (Red Team Tests)

### 1. Identity Spoofing (Cross-User Write)
- **Scenario**: User A attempts to create/update `/users/UserB`.
- **Payload**: `{ "xp": 100 }`
- **Result**: `PERMISSION_DENIED` (via `isOwner(userId)`).

### 2. Unauthorized List Scraping
- **Scenario**: Anonymous user attempts to list all `/uploads`.
- **Result**: `PERMISSION_DENIED` (Default Deny).

### 3. Session Hijacking (Status Injection)
- **Scenario**: Anonymous user attempts to create a session with `status: 'linked'`.
- **Result**: `PERMISSION_DENIED` (via `isValidTVSession` + `allow create: if status == 'waiting'`).

### 4. Payload Poisoning (Large Data)
- **Scenario**: User attempts to upload a 5MB string as a URL.
- **Result**: `PERMISSION_DENIED` (via `isValidUrl` check `.size() <= 2048`).

### 5. ID Exhaustion (Path Poisoning)
- **Scenario**: User attempts to create a document with an ID containing emoji or special characters.
- **Result**: `PERMISSION_DENIED` (via `isValidId` regex `^[a-zA-Z0-9_\\-]+$`).

### 6. Relational Integrity Breach (Lessons)
- **Scenario**: User A attempts to read User B's lessons.
- **Result**: `PERMISSION_DENIED` (via `isOwner(userId)`).

### 7. Global Read Leak (Wait Sniffing)
- **Scenario**: Non-owner attempts to read a linked session's user info.
- **Result**: `PERMISSION_DENIED` (via `get` restricted to `status == 'waiting'` or `owner`).

### 8. Immutable Field Violation (CreatedAt)
- **Scenario**: User attempts to update `createdAt` on an existing profile.
- **Result**: `PERMISSION_DENIED` (via `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['createdAt'])`).

### 9. Device State Overwrite
- **Scenario**: User B attempts to write to `/pairings/UserA_Device`.
- **Result**: `PERMISSION_DENIED` (via `isOwner` check on `userId` field).

### 10. Profile Data Corruption
- **Scenario**: User attempts to set `displayName` to an empty string.
- **Result**: `PERMISSION_DENIED` (via `isValidProfileData` check `.size() > 0`).

### 11. Abandoned Upload Scraping
- **Scenario**: User B attempts to delete User A's upload using only the `uploadId`.
- **Result**: `PERMISSION_DENIED` (via `allow delete: if resource.data.userId == request.auth.uid`).

### 12. Timestamp Spoofing (Future Dates)
- **Scenario**: User attempts to create an upload with `createdAt` set to the year 2099.
- **Result**: `PERMISSION_DENIED` (via `data.createdAt <= request.time`).
