# Cross-Document Intelligence — Architecture Design Doc

## Overview

Cross-document intelligence allows ActionStation to connect insights across multiple analyzed documents within a workspace. When a user uploads document #50, the system finds relevant entities from the previous 49 analyzed documents and generates cross-reference insights automatically.

---

## Decision: TF-IDF Keyword Matching (Not Embeddings)

### Why TF-IDF over Embeddings

| Factor | TF-IDF | Gemini Embeddings |
|--------|--------|-------------------|
| Latency | <5ms (in-memory) | 200-500ms per call |
| Cost | Zero (client-side) | API call per document |
| Offline | Works offline | Requires network |
| Existing infra | Already built (`tfidfScorer.ts`, `relevanceScorer.ts`) | None in codebase |
| 500+ nodes | Handles well (pre-filter + rank) | N API calls = expensive |
| Privacy | No data leaves device | Text sent to Google |

**Decision:** Use existing TF-IDF + keyword scoring infrastructure. The codebase already has a battle-tested pipeline in `nodePoolBuilder.ts` and `relevanceScorer.ts`. Embeddings can be added as a Phase 5 enhancement if TF-IDF precision proves insufficient.

---

## Entity Index Architecture

### Client-Side In-Memory Index (Not Firestore)

**Rationale:** All nodes are already loaded into `canvasStore.nodes` on workspace open. Adding a Firestore subcollection would:
- Add write costs (2 writes per analyzed doc: node + index entry)
- Add read costs on workspace load
- Require Firestore rules updates
- Create sync complexity between canvasStore and Firestore index

Instead, we build the entity index **in-memory** from existing `ExtractionResult` cached on `AttachmentMeta`. This is:
- Zero additional Firestore cost
- Instantly available after workspace loads
- Automatically cleaned up when nodes are deleted
- Consistent with the existing pattern (nodePoolBuilder operates entirely in-memory)

### Entity Index Schema

```typescript
interface EntityIndexEntry {
    nodeId: string;
    filename: string;
    classification: DocumentClassification;
    entities: string[];       // Flattened from keyFacts + extendedFacts
    summary: string;
    analyzedAt: number;
}

interface EntityIndex {
    entries: EntityIndexEntry[];
    idfMap: Map<string, number>;  // Pre-computed IDF for fast scoring
    lastBuilt: number;
}
```

### Index Lifecycle

1. **Build on workspace load** — Scan all nodes with `data.attachments[].extraction`, extract entities
2. **Update incrementally** — When a new document is analyzed, add its entry to the index
3. **Invalidate on node delete** — Remove entry when source node is removed
4. **Rebuild on demand** — If index is stale (> 5 min since last build), rebuild from canvasStore

---

## Query Patterns at 500+ Nodes

### Pre-filtering Strategy

Most nodes (>80%) won't have document attachments. The pipeline:

1. **Filter:** Only nodes with `data.attachments?.some(a => a.extraction)` → typically <50 entries even at 500+ nodes
2. **Score:** TF-IDF score each entry against the new document's entities
3. **Threshold:** Only entries with score > 0.1 are considered matches
4. **Cap:** Top 5 matches returned (prevents insight spam)

### Performance Budget

| Operation | Target | Strategy |
|-----------|--------|----------|
| Index build | <50ms | Single pass over nodes array |
| Cross-reference query | <10ms | Pre-computed IDF + in-memory scoring |
| Insight generation | <3s | Single Gemini call with top matches as context |

---

## Cross-Reference Flow

```
Document uploaded → Analysis complete → ExtractionResult cached
                                              ↓
                                    Build query from entities
                                              ↓
                                    Score against entity index
                                              ↓
                                    Top matches found? ──No──→ Done
                                              ↓ Yes
                                    Generate cross-reference prompt
                                              ↓
                                    callGemini (single call)
                                              ↓
                                    Spawn cross-reference insight node
                                              ↓
                                    Connect with 'derived' edges
```

### Cross-Reference Prompt Design

The prompt includes:
- New document's summary + key facts
- Top matched documents' summaries + overlapping entities
- Instruction to identify connections, contradictions, and action items

Output: Structured JSON (Zod-validated) with cross-reference insights.

---

## Aggregation Strategy

### Periodic Summaries

Aggregation nodes summarize patterns across all analyzed documents:
- "You have 3 unpaid invoices totaling $1,247"
- "5 meeting notes mention Project Alpha with 12 open action items"
- "Legal contracts expiring within 30 days: 2"

### Refresh Strategy

- **Trigger:** After every 5th document analysis in a workspace
- **Debounce:** Max once per hour per workspace
- **Scope:** Group by classification, aggregate entities
- **Output:** Single aggregation node with sections per classification
- **Update:** Replace existing aggregation node (don't create duplicates)

### Storage

Aggregation nodes are identified by their ID prefix (`agg-`). No tags are auto-assigned
to any document agent nodes (insight, cross-reference, or aggregation). Tags are user-chosen
via the UtilsBar.

No new Firestore collections. The aggregation node is a regular `IdeaNode`.

---

## Privacy & Security

### Entity Data

- **Location:** Client-side only (in `AttachmentMeta.extraction` on canvasStore nodes)
- **No new Firestore collections** — entities never stored separately
- **Encryption at rest:** Firestore provides encryption at rest for node data
- **User isolation:** Existing Firebase rules (`request.auth.uid == userId`) apply

### Cross-Reference Prompts

- **No PII in prompts:** Entities are factual data points (amounts, dates, names of organizations), not user PII
- **Filename sanitization:** Already enforced by `sanitizeFilename()`
- **Input truncation:** Cross-reference context capped at `AGENT_INPUT_MAX_CHARS`
- **Same proxy:** Uses existing `callGemini` → `geminiProxy` Cloud Function with rate limiting

### Prompt Injection Prevention

- Entity strings extracted by Gemini are treated as data, not instructions
- Cross-reference prompt uses clear delimiters between instruction and data sections
- Entity strings are truncated to 200 chars each to prevent oversized injection

---

## Implementation Sub-Phases

### 4a: Entity Index + Cross-Reference Service (~1 week)
- `EntityIndex` type definitions
- `entityIndexService.ts` — build, update, query
- `crossReferenceService.ts` — score matches, build prompt, parse response
- TDD for all pure functions

### 4b: Cross-Reference Hook Integration (~3 days)
- Wire into `useDocumentAgent` — after analysis, check for cross-references
- Spawn cross-reference insight node with matched document context
- Analytics: `trackCrossReferenceGenerated`

### 4c: Aggregation Service (~4 days)
- `aggregationService.ts` — group by classification, aggregate
- `aggregationPromptBuilder.ts` — build aggregation prompt
- Debounce + frequency limiting
- Spawn/update aggregation node

### 4d: Timeline View (Stretch — Separate Track)
- Deferred. Requires UI components beyond current scope.
- Would use `analyzedAt` timestamps to build chronological view.

### 4e: Final Comprehensive Audit
- Full build + lint + test
- Security review of all new prompts
- File size audit
- Performance profiling at 500+ nodes

---

## Cost Analysis

| Operation | Gemini Calls | Frequency | Est. Monthly (500 users) |
|-----------|-------------|-----------|--------------------------|
| Document analysis | 1 per upload | ~10/user/month | 5,000 calls |
| Cross-reference | 1 per analysis (when matches found) | ~5/user/month | 2,500 calls |
| Aggregation | 1 per 5 analyses | ~2/user/month | 1,000 calls |
| **Total** | | | **~8,500 calls/month** |

At Gemini 2.0 Flash pricing (~$0.075/1M input tokens), this is negligible (<$1/month).

---

## What This Does NOT Include

- Embedding-based semantic search (deferred to Phase 5)
- Real-time cross-workspace intelligence (single workspace scope)
- Firestore entity index (unnecessary given in-memory approach)
- User-facing entity management UI (entities are transparent/automatic)
