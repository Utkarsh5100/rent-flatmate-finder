# ADR-001: Compatibility Score Caching Strategy

**Status**: Accepted  
**Date**: 2025-07-01  
**Decision makers**: Engineering team

## Context

The Rent & Flatmate Finder app computes compatibility scores between tenant profiles and room listings using an LLM (OpenAI/Claude). Each scoring call:

- Costs money (LLM API tokens)
- Takes 1–5 seconds per call
- Returns deterministic-ish results for the same inputs

A browse page may show 12+ listings, each needing a score. Without caching, a single page load triggers 12+ LLM calls (~$0.01–0.10 per page view, 12–60s latency).

## Decision

**Cache scores in the `CompatibilityScore` table**, keyed by `(tenantId, listingId)`, and only recompute when the listing or tenant profile has been updated since the last computation.

### Staleness detection

Compare `CompatibilityScore.computedAt` against `Listing.updatedAt` and `TenantProfile.updatedAt`. If either entity was updated after the score was computed, the score is stale and recomputed on next access.

### Fallback scoring

When the LLM is unavailable (no API key, timeout, invalid response), a deterministic rule-based scorer runs instead. The `computedVia` field (`LLM` or `FALLBACK`) tracks which method produced the score, enabling future analysis of scoring quality.

## Consequences

### Positive
- **Cost**: LLM called once per unique (tenant, listing) pair until data changes
- **Latency**: Cached scores served instantly; only first view triggers computation
- **Reliability**: Fallback scorer ensures scores are always available
- **Auditability**: `computedVia` + `computedAt` enable scoring quality analysis

### Negative
- **Storage**: One row per (tenant, listing) pair — manageable at expected scale
- **Eventual consistency**: Score may be stale for a short window after profile/listing update until next browse
- **Cold start**: First browse by a new tenant triggers N scoring calls (mitigated by fallback speed)

## Alternatives Considered

1. **Recompute on every request**: Rejected — too expensive and slow
2. **TTL-based expiry** (e.g. 24h): Simpler but wastes LLM calls when data hasn't changed
3. **Event-driven recomputation** (recompute all scores on profile update): Rejected — O(tenants × listings) work on any edit
