# Cline Rules for Enforcing Sightline MCP Server Usage

---



## **Copy-Paste**
Automated Workflow for Every UI Fix Request
When a user requests a UI fix (e.g., "button too big", "element misaligned"):

Pre-change Baseline

Invoke /take_snapshot to capture the current UI state (screenshot, DOM, styles).
Store snapshot in Git and memory graph.
Link to previous snapshot via hasPreviousVersion.
Add observations describing the baseline state.
Apply the fix

Modify code as needed.
Document planned changes in memory and sequential-thinking.
Post-change Capture

Invoke /take_snapshot again after the fix.
Store snapshot in Git and graph.
Link to the pre-change snapshot.
Add observations describing the new state.
Validation

Invoke /validate_fix with explicit expected UI properties.
Store validation result in graph.
Link validation result to the new snapshot via producesValidationResult.
If validation passes:

Confirm fix success across DOM, styles, visuals.
Persist all data (snapshots, validation, diffs).
End workflow.
If validation fails:

Invoke /compare_snapshots to analyze visual and semantic differences.
Invoke /get_snapshot_history to retrieve full version lineage.
Invoke /get_validation_results to fetch all past validation attempts.
Invoke /get_snapshot_diffs to list all related diffs.
Convert results to markdown for explainability.
Invoke /step_thinking to reflect, update hypotheses, and plan next fix.
Invoke /plan_tasks to generate a new fix plan.
Retry fix or escalate based on reasoning.
Throughout the process:

Use memory MCP to:
Store all entities, relations, observations.
Track snapshots, validations, diffs, reasoning steps.
Use sequential-thinking MCP to:
Break down complex fixes.
Reflect on failures.
Plan next steps.
Avoid blind retries.
Tool Utilization Summary
/take_snapshot: Before and after every change.
/validate_fix: After every change.
/compare_snapshots: On validation failure.
/get_snapshot_history: To understand lineage.
/get_validation_results: To review past validations.
/get_snapshot_diffs: To analyze related diffs.
/convert_to_markdown: To summarize state and diffs.
/step_thinking: To reflect and update reasoning.
/plan_tasks: To generate new fix plans.
memory MCP: Persist all data, context, and relations.
sequential-thinking MCP: Structure reasoning, avoid blind retries.
Principles
NEVER assume success without explicit, multi-modal validation.
ALWAYS base decisions on Sightline feedback and reasoning.
DISALLOW skipping snapshots, validation, or reasoning.
LOG everything for traceability and debugging.

---

## 1. **Mandatory Sightline Tool Invocation**

- **Always** invoke the relevant Sightline MCP tools (`/take_snapshot`, `/validate_fix`, `/compare_snapshots`, `/convert_to_markdown`, `/step_thinking`, `/plan_tasks`) **after every agent code change**.
- **Never** assume a fix succeeded without explicit validation via Sightline.

---

## 2. **Sequential Validation Workflow**

- **Enforce** the following sequence **without skipping**:  
  `Apply Fix → Take Snapshot → Validate Fix → If Fail, Diff Snapshots → Convert to Markdown → Reason → Retry or Escalate`
- **Do not proceed** to next steps or retries until Sightline confirms validation results.

---

## 3. **Persistent Context Storage**

- **Always** store snapshots, validation results, diffs, and reasoning steps in Sightline's **memory graph** and **filesystem** after each cycle.
- **Retrieve** relevant past context from Sightline before planning new fixes.

---

## 4. **Reflective Reasoning Enforcement**

- **Require** the use of Sightline's **sequential thinking** tool to guide agent reasoning after failed validations.
- **Disallow** blind retries without explicit reasoning steps and hypothesis updates.

---

## 5. **No Bypassing of Multi-Modal Feedback**

- **Never** rely solely on code diffs or test results.  
- **Always** incorporate **visual, DOM, style, layout, and text feedback** from Sightline snapshots and validation.

---

## 6. **Strict Error Handling**

- **If any Sightline tool returns an error or partial data,**  
  - **Log the issue,**  
  - **Trigger retries or escalate,**  
  - **Do not silently continue.**

---

## 7. **Audit Trail Enforcement**

- **Log all Sightline tool invocations, inputs, outputs, and errors** in the knowledge graph and filesystem.
- **Use this audit trail** for debugging, learning, and compliance.

---

## 8. **No Assumptions Without Ground Truth**

- **Agents and Cline must never assume** a UI fix is successful **without explicit, multi-modal validation** from Sightline.
- **All decisions must be based on Sightline's feedback.**

---

## **Summary**

These rules **guarantee** that Cline and its agents **fully utilize Sightline's multi-modal validation and reasoning capabilities**, **never skip critical steps**, and **maintain persistent, explainable context** throughout the workflow.



