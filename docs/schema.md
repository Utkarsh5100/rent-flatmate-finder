# Database Schema — Rent & Flatmate Finder

## Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o| TenantProfile : "has (if TENANT)"
    User ||--o{ Listing : "owns (if OWNER)"
    User ||--o{ CompatibilityScore : "scored as tenant"
    User ||--o{ InterestRequest : "sends as tenant"
    User ||--o{ ChatMessage : "sends"
    User ||--o{ Notification : "receives"

    Listing ||--o{ ListingPhoto : "has"
    Listing ||--o{ CompatibilityScore : "scored against"
    Listing ||--o{ InterestRequest : "receives"

    InterestRequest ||--o| Conversation : "spawns (on accept)"
    Conversation ||--o{ ChatMessage : "contains"

    User {
        string id PK "cuid"
        string email UK "unique"
        string hashedPassword
        string firstName
        string lastName
        string phone "nullable"
        string avatarUrl "nullable"
        enum role "TENANT | OWNER | ADMIN"
        boolean isActive "admin deactivation"
        datetime lastLoginAt "nullable"
        datetime createdAt
        datetime updatedAt
    }

    TenantProfile {
        string id PK "cuid"
        string userId FK-UK "unique → User"
        string preferredLocation
        int budgetMin
        int budgetMax
        datetime moveInDate
        string occupation "nullable"
        string lifestyle "nullable"
        string bio "nullable"
        datetime createdAt
        datetime updatedAt
    }

    Listing {
        string id PK "cuid"
        string ownerId FK "→ User"
        string title
        string description
        string location
        string address "nullable"
        int rent "monthly"
        int deposit "nullable"
        datetime availableFrom
        enum roomType "SINGLE | DOUBLE | SHARED | STUDIO | APARTMENT"
        enum furnishingStatus "FURNISHED | SEMI | UNFURNISHED"
        string_arr amenities
        string_arr rules
        int maxOccupants "default 1"
        enum status "ACTIVE | FILLED"
        datetime createdAt
        datetime updatedAt
    }

    ListingPhoto {
        string id PK "cuid"
        string listingId FK "→ Listing"
        string url
        string altText "nullable"
        int order "display order"
        datetime createdAt
    }

    CompatibilityScore {
        string id PK "cuid"
        string tenantId FK "→ User"
        string listingId FK "→ Listing"
        int score "0–100"
        string explanation "LLM reasoning"
        enum computedVia "LLM | FALLBACK"
        datetime computedAt
    }

    InterestRequest {
        string id PK "cuid"
        string tenantId FK "→ User"
        string listingId FK "→ Listing"
        enum status "PENDING | ACCEPTED | DECLINED"
        string message "nullable intro"
        datetime createdAt
        datetime updatedAt
        datetime resolvedAt "nullable"
    }

    Conversation {
        string id PK "cuid"
        string interestRequestId FK-UK "unique → InterestRequest"
        datetime createdAt
        datetime updatedAt
    }

    ChatMessage {
        string id PK "cuid"
        string conversationId FK "→ Conversation"
        string senderId FK "→ User"
        string content
        datetime readAt "nullable (read receipt)"
        datetime createdAt
    }

    Notification {
        string id PK "cuid"
        string userId FK "→ User"
        enum type "INTEREST_RECEIVED | ACCEPTED | DECLINED | NEW_MESSAGE | ..."
        string title
        string message
        boolean read "default false"
        json metadata "nullable, flexible payload"
        datetime createdAt
    }
```

---

## Models Summary

| Model | Rows (seed) | Purpose |
|-------|------------|---------|
| **User** | 8 | Auth entity — email, hashed password, role (TENANT/OWNER/ADMIN), isActive flag for admin deactivation |
| **TenantProfile** | 4 | 1:1 extension for tenants — location preference, budget range, move-in date, lifestyle tags |
| **Listing** | 10 | Room/apartment listed by an owner — location, rent, room type, furnishing, amenities, rules |
| **ListingPhoto** | ~25 | Ordered photo gallery per listing — separate table for flexible add/remove |
| **CompatibilityScore** | 11 | Cached AI score (0–100) per tenant×listing pair — includes LLM explanation text |
| **InterestRequest** | 4 | Tenant→Listing "handshake" — PENDING/ACCEPTED/DECLINED workflow |
| **Conversation** | 1 | Chat thread created when interest is accepted — 1:1 with InterestRequest |
| **ChatMessage** | 4 | Individual messages in a conversation — supports read receipts via `readAt` |
| **Notification** | 5 | In-app notification log — typed, with flexible JSON metadata payload |

---

## Enums

| Enum | Values | Used By |
|------|--------|---------|
| `UserRole` | `TENANT`, `OWNER`, `ADMIN` | User.role |
| `ListingStatus` | `ACTIVE`, `FILLED` | Listing.status |
| `RoomType` | `SINGLE`, `DOUBLE`, `SHARED`, `STUDIO`, `APARTMENT` | Listing.roomType |
| `FurnishingStatus` | `FURNISHED`, `SEMI_FURNISHED`, `UNFURNISHED` | Listing.furnishingStatus |
| `InterestStatus` | `PENDING`, `ACCEPTED`, `DECLINED` | InterestRequest.status |
| `ComputedVia` | `LLM`, `FALLBACK` | CompatibilityScore.computedVia |
| `NotificationType` | `INTEREST_RECEIVED`, `INTEREST_ACCEPTED`, `INTEREST_DECLINED`, `NEW_MESSAGE`, `LISTING_FILLED`, `COMPATIBILITY_COMPUTED`, `SYSTEM` | Notification.type |

---

## Indexes

| Model | Indexed Columns | Rationale |
|-------|----------------|-----------|
| User | `email` (unique), `role`, `isActive` | Login lookup, role-based filtering, admin queries |
| TenantProfile | `preferredLocation`, `(budgetMin, budgetMax)` | Location search, budget range filtering |
| Listing | `location`, `rent`, `status`, `roomType`, `ownerId`, `availableFrom` | Search/filter on all major facets |
| ListingPhoto | `listingId` | Gallery fetch per listing |
| CompatibilityScore | `(tenantId, listingId)` unique, `tenantId`, `listingId`, `score` | Lookup by pair, ranked results per tenant |
| InterestRequest | `(tenantId, listingId)` unique, `tenantId`, `listingId`, `status` | Duplicate prevention, dashboard queries |
| ChatMessage | `conversationId`, `senderId`, `createdAt` | Message thread loading, user history, chronological sort |
| Notification | `userId`, `read`, `type`, `createdAt` | Unread count, type filtering, chronological display |

---

## Cascade / Restrict Rules

| Parent → Child | On Delete | Rationale |
|---------------|-----------|-----------|
| User → TenantProfile | **CASCADE** | Profile is meaningless without the user |
| User → Listing | **RESTRICT** | Owners must remove/reassign listings before account deletion |
| User → CompatibilityScore | **CASCADE** | Cached scores are stale without the tenant |
| User → InterestRequest | **CASCADE** | Interest requests are void without the tenant |
| User → ChatMessage (sender) | **RESTRICT** | Preserve message history — app must handle user deletion gracefully |
| User → Notification | **CASCADE** | Notifications are personal and disposable |
| Listing → ListingPhoto | **CASCADE** | Photos belong to the listing |
| Listing → CompatibilityScore | **CASCADE** | Scores are stale without the listing |
| Listing → InterestRequest | **CASCADE** | Interest requests are void for deleted listings |
| InterestRequest → Conversation | **CASCADE** | Conversation is tied to the interest |
| Conversation → ChatMessage | **CASCADE** | Messages belong to the conversation |

---

## Design Decisions

### 1. Chat: Conversation entity vs. direct InterestRequest messages

We introduced a `Conversation` entity between `InterestRequest` and `ChatMessage` rather than linking messages directly to `InterestRequest`. This provides:

- **Separation of concerns**: The interest workflow (PENDING → ACCEPTED/DECLINED) is cleanly separated from chat history.
- **Future extensibility**: If we later add group chats, support threads, or admin conversations, the `Conversation` model can be extended without touching the interest flow.
- **Conversation only exists after acceptance**: A `Conversation` is created only when `InterestRequest.status` becomes `ACCEPTED`, preventing premature messaging.

### 2. Photos as a separate table

`ListingPhoto` is a dedicated model rather than a `String[]` on `Listing` because:
- Photos need **ordering** (`order` field) for gallery display.
- Individual photo **CRUD** (add/remove/reorder) without rewriting the entire listing row.
- Future: photo **metadata** (dimensions, blurhash, CDN transform URLs) can be added without schema changes.

### 3. CompatibilityScore as a cache table

Scores are computed lazily (on demand) and cached. The `computedVia` enum tracks whether the score came from a real LLM call or a heuristic fallback (e.g., when the LLM API is down). The `@@unique([tenantId, listingId])` constraint ensures at most one score per pair — re-computation overwrites the row.

### 4. Notification metadata as JSON

The `metadata` field is typed as `Json?` rather than individual foreign keys. This keeps the notification model generic — different notification types can attach different payloads (`listingId`, `tenantName`, `conversationId`, etc.) without schema migrations for each new notification type.

### 5. Soft delete via `isActive` (Users only)

Users have an `isActive` flag for admin deactivation rather than hard deletes. This preserves referential integrity (chat history, listings) while preventing deactivated users from logging in. Hard deletion is a separate, destructive admin action that must respect the RESTRICT rules on Listing and ChatMessage.
