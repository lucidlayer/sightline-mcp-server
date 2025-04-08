# Active Context

## Current Task
Implement Phase 1 of the integration plan:
- Establish persistent context with Memory System
- Create and maintain core files: codeMap.md, activeContext.md, decisions.md
- Link Sightline snapshots, validations, diffs, reasoning to components/functions
- Persist plans, hypotheses, results

---

## Recent Changes
- Created initial `codeMap.md` with project structure, function index, flow diagrams
- Initialized persistent context memory system
- Linked knowledge graph entities to project components

---

## Active Plans
- Enforce automated multi-modal validation workflow:
  - Always take a snapshot **before** any change.
  - Apply fix or change.
  - Always take a snapshot **after** the change.
  - Always explicitly validate the fix.
  - **If validation fails:**
    - Analyze diffs between snapshots.
    - Query snapshot lineage/history.
    - Retrieve past validation results.
    - Retrieve diffs related to snapshots.
    - Convert relevant data to markdown summaries.
    - Reflect using sequential-thinking MCP.
    - Plan next steps before retrying.
  - **Never** assume success without explicit validation pass.
  - Always update Memory System files (`codeMap.md`, `activeContext.md`, `decisions.md`) after changes.
- Automate tool invocation order:
  1. `/take_snapshot`
  2. Apply fix
  3. `/take_snapshot`
  4. `/validate_fix`
  5. If fail:
     - `/compare_snapshots`
     - `/get_snapshot_history`
     - `/get_validation_results`
     - `/get_snapshot_diffs`
     - `/convert_to_markdown`
     - `/step_thinking`
     - `/plan_tasks`
- Integrate prompt engineering best practices:
  - Enforce smart, token-efficient context loading (load `codeMap.md` and `activeContext.md` first, others as needed).
  - Require confidence ratings and explicit assumption checks before actions.
  - Encourage step-wise reasoning and reflection before/after fixes.
  - Demand thorough analysis of context, code, and validation results.
  - Log all tool invocations, inputs, outputs, and errors persistently.
  - Modularize project-specific rules inside `.clinerules/` folder:
    - Coding standards
    - Validation criteria
    - Fix policies
    - Documentation requirements
- Automate context refresh and smart loading:
  - Load `codeMap.md` and `activeContext.md` initially.
  - Load other Memory System files on demand.
  - Refresh context when encountering unexpected code, errors, or validation failures.
  - Summarize current understanding before proceeding with fixes or validation.
- Enhance reasoning and planning (Phase 5):
  - Use sequential-thinking MCP to break down complex fixes.
  - Reflect explicitly on failures.
  - Update hypotheses based on validation and diff results.
  - Plan next steps before retrying.
  - Avoid blind retries without reflection.
  - Persist all reasoning steps in Memory System files (`activeContext.md`, `decisions.md`).
- Testing and iteration (Phase 6):
  - Test the integrated system with real UI fix requests.
  - Verify automated workflows perform as expected.
  - Refine custom instructions and Memory System based on test results.
  - Iterate to improve reliability, explainability, and efficiency.
- Populate `decisions.md` with key architectural choices
- Link snapshots, validations, diffs explicitly in knowledge graph
- Automate updates to these files during development cycles
- Integrate with Sightline MCP server tools for snapshotting and validation
- Use sequential-thinking MCP for stepwise reasoning
- Use memory MCP for persistent knowledge graph

---

## Priorities
1. Maintain up-to-date code map and context
2. Log all key decisions and rationale
3. Link all validation/snapshot data to components/functions
4. Enable explainable, persistent, multi-modal context for agents and developers

---

_Last updated: 2025-04-07_
