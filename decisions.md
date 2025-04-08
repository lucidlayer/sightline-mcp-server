# Key Decisions Log

A chronological record of major architectural, design, and implementation decisions for Sightline MCP + TimezonePulse integration.

---

## 2025-04-07

### Decision: Establish Persistent Memory System
- **Why:** To enable explainable, token-efficient, persistent context for agents and developers.
- **What:** Create `codeMap.md`, `activeContext.md`, `decisions.md` as core files.
- **How:** Store project structure, active plans, and decision logs in markdown files linked to knowledge graph entities.
- **Impact:** Improves traceability, debugging, and multi-agent collaboration.

---

### Decision: Link Snapshots, Validations, Diffs to Components
- **Why:** To ground validation and reasoning in specific UI components and functions.
- **What:** Use knowledge graph relations and file references in `codeMap.md`.
- **How:** Persist snapshot metadata, validation results, diffs, and reasoning steps with links to components/functions.
- **Impact:** Enables targeted fixes, better explainability, and historical traceability.

---

### Decision: Use Hybrid Git + Knowledge Graph Versioning
- **Why:** To combine efficient storage/diffing with semantic queries and lineage.
- **What:** Store snapshots/diffs in Git repo, metadata and relations in knowledge graph.
- **How:** Commit serialized snapshot data, link commit hashes to graph entities, create `hasPreviousVersion` relations.
- **Impact:** Robust, queryable, persistent version history.

---

### Decision: Modular MCP Server Architecture
- **Why:** To enable composability, extensibility, and multi-modal validation.
- **What:** Separate tools for snapshot, validation, diffing, reasoning, storage.
- **How:** Implement as MCP tools, integrate with existing servers (hyperbrowser, markdownify, taskmanager, memory, sequential-thinking).
- **Impact:** Flexible, explainable, multi-agent compatible system.

---

_Last updated: 2025-04-07_
