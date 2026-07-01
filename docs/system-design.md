# System Design — Rent & Flatmate Finder Platform

## 1. Compatibility Scoring Engine & Cache Strategy

To match tenants with rooms, the platform computes compatibility scores (0–100) along with textual rationales using large language models (LLMs). Because LLM evaluation is resource-intensive, slow (1–5s latency), and costly, a strict caching and staleness model is enforced.

### Caching Architecture
Scores are computed once and stored in the `CompatibilityScore` database table. Key fields include:
- `tenantId` and `listingId` (Composite Unique Primary Key)
- `score` (0–100 Integer)
- `explanation` (Text explanation from the scorer)
- `computedVia` (Enum: `LLM` or `FALLBACK`)
- `computedAt` (DateTime timestamp)

### Staleness and Invalidation
Scores are computed on-demand when a tenant requests the listings feed. The orchestrator determines whether a cached score is still valid by checking the timestamps:
$$\text{Is Fresh} = \text{computedAt} > \text{Listing.updatedAt} \quad \land \quad \text{computedAt} > \text{TenantProfile.updatedAt}$$
If either the listing's specifications (rent, location, roomType) or the tenant's preferences (budgetMax, preferredLocation) have changed since `computedAt`, the score is invalidated, recomputed, and upserted. This guarantees data consistency without scheduling proactive cache clearing workers.

---

## 2. LLM Integration & Rule-Based Fallback Scorer

The scoring flow implements a resilient fallback mechanism. If the LLM provider fails (due to key exhaustion, network timeouts, or invalid JSON output), the scoring engine reverts to a deterministic, local scorer.

### LLM Call Flow
The backend formats room listings and tenant profiles into a structured JSON string, prompts the LLM for a structured match estimation under `response_format: { type: "json_object" }`, and validates the schema using Zod:
```typescript
const llmResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string().min(1),
});
```

### Rule-Based Fallback Math
The fallback scorer calculates the score using a linear weighted rubric ($100$ points total):
1. **Budget Match ($50\%$ weight)**: Perfect overlap returns $50$ points. When listing rent is outside the tenant's preferred range $[B_{\text{min}}, B_{\text{max}}]$, points decay logarithmically relative to the distance ratio:
   $$R_{\text{distance}} = \frac{|\text{Rent} - \text{Preferred boundary}|}{\text{Midpoint}}$$
2. **Location Match ($35\%$ weight)**: Exact case-insensitive matches yield $35$ points. Partial substring intersections yield $20$ points, while mismatched locations yield $0$.
3. **Timing Match ($15\%$ weight)**: If the listing is available on or before the tenant's move-in date, $15$ points are awarded. Availability delays of $\le 14$ days receive $10$ points, $\le 30$ days receive $5$ points, and longer delays receive $0$ points.

---

## 3. Real-Time Chat Infrastructure

Chat channels are established between owners and tenants to facilitate tenancy negotiations.

### Socket.IO and State Synchronization
- **Handshake Verification**: Sockets connect using a JWT authorization token. Sockets join user-specific communication lines (`user:userId`) to listen for system-wide alerts.
- **Access Authorization**: When a client requests to join a room (`join:conversation`), the server validates that the conversation’s underlying `InterestRequest` is in the `ACCEPTED` state and that the user is either the listing owner or the tenant. Unauthorized join requests are immediately rejected.
- **Message Pipeline**: Socket triggers (`message:send`) write chat logs straight to the `ChatMessage` table. Upon successful database commitment, the message is broadcast to the socket room (`message:new`) to sync active chat windows.
- **Optimistic Reconciliation**: The frontend renders sent messages instantly with a loading icon. When the client receives the broadcast message carrying the matching `tempId`, the state is reconciled and the loading indicator is resolved.
- **Read Receipts & Typing**: Real-time read receipts (double-check marks) update when a user views an active conversation. Typing flags trigger short 2-second timeout broadcasts to prevent stream spam.

---

## 4. Notifications & Async Email Pipeline

The notification pipeline coordinates app activities through in-app alerts and asynchronous email dispatches.

```
Tenant Expresses Interest
  │
  ├──► Writes to Notification Table (In-App Bell Alert)
  │
  └──► Checks Cached Compatibility Score
        │
        └───► IF Score >= 80 (Configurable Threshold)
               │
               └───► Dispatches Non-Blocking Email to Owner
```

1. **In-App NotificationBell**: High-performance bell dropdown polls notifications every 30s. Clicking "Mark all read" updates all entries with a single patch.
2. **Asynchronous Non-Blocking Emails**: Email dispatches (SMTP/Resend) are wrapped in self-resolving Promises. Network delays, timeout glitches, or incorrect API credentials log error telemetry internally but never block or crash core Express routes.
