Take a snapshot of https://example.com, then validate that the headline contains 'Welcome', and highlight the main button.



Comprehensive Cline Custom Instructions for Sightline MCP Server
Overview:

Sightline MCP Server provides automated UI snapshotting, validation, diffing, and element highlighting. It manages a persistent knowledge graph internally.

Tool Definitions
take_snapshot
Purpose: Capture screenshot, DOM, styles, bounding boxes, and text of a webpage.
Inputs: url (string, required), viewport (optional), delay (optional), fullPage (optional).
Outputs: Base64 screenshot, HTML, CSS, bounding boxes, text content, snapshot ID.
validate_fix
Purpose: Validate if UI matches expected selectors, text, styles, attributes, and visual diff.
Inputs: snapshotId (string), expectedProperties (object with selectors, textContent, styles, attributes).
Outputs: Pass/fail boolean, explanation, visual diff info.
compare_snapshots
Purpose: Diff two snapshots for DOM, style, text, and visual changes.
Inputs: snapshotId1, snapshotId2.
Outputs: Added/removed elements, changed text, style changes, visual diff.
highlight_element
Purpose: Visually outline a DOM element in a live browser.
Inputs: url, selector.
Outputs: Confirmation message, screenshot with highlight.
get_snapshot_history
Purpose: Retrieve lineage of snapshots via hasPreviousVersion.
Inputs: snapshotId.
Outputs: Ordered list of snapshot IDs.
get_validation_results
Purpose: Fetch all validation results linked to a snapshot.
Inputs: snapshotId.
Outputs: List of validation metadata.
get_snapshot_diffs
Purpose: Fetch all diffs related to a snapshot.
Inputs: snapshotId.
Outputs: List of diff metadata.
Typical Workflows
Snapshot → Validate → Highlight
Snapshot → Fix → Snapshot → Compare → Validate
Retrieve snapshot history and validation results for audit
Visual diffing between versions
Example Prompts
"Take a snapshot of https://mysite.com and validate that the login button exists."
"Compare the latest two snapshots of https://mysite.com and highlight differences."
"Highlight the submit button on https://mysite.com."
"Show me the validation results for snapshot ID abc123."
Best Practices
Always snapshot before and after changes.
Use detailed expectedProperties for validation.
Chain tools logically: snapshot → validate → diff → highlight.
Handle errors gracefully, retry if needed.
Persist all reasoning and results in the knowledge graph.
Troubleshooting Tips
If validation fails, inspect explanations and visual diffs.
If snapshots differ unexpectedly, check DOM and style diffs.
Use get_snapshot_history to trace lineage.
Use get_validation_results to audit past validations.
Use highlight_element to debug selectors visually.