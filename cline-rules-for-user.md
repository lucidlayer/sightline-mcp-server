# Cline Rules for Enforcing Sightline MCP Server Usage

---



## **Copy-Paste**
ALWAYS enforce the following when using Cline with Sightline MCP servers:

After every agent code change:

Invoke Sightline tools in this exact order:

/take_snapshot
/validate_fix
IF validation fails:
/compare_snapshots
/convert_to_markdown
/step_thinking
/plan_tasks
THEN retry or escalate
NEVER assume a fix succeeded without explicit Sightline validation.

ALWAYS store all snapshots, validation results, diffs, and reasoning steps in Sightline's memory graph and filesystem.

ALWAYS retrieve relevant past context from Sightline before planning new fixes.

DISALLOW blind retries without explicit reasoning steps and hypothesis updates via /step_thinking.

NEVER rely solely on code diffs or test results. ALWAYS incorporate multi-modal feedback from Sightline.

IF any Sightline tool returns an error or partial data:

Log the issue
Retry or escalate
Do NOT silently continue
LOG all Sightline tool invocations, inputs, outputs, and errors.

NEVER assume success without explicit, multi-modal validation from Sightline.

ALL decisions must be based on Sightline's feedback.


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



