# GitHub Copilot Chat prompt — comprehensively harden UTh Autosys Smart Manager

You are acting as a senior CA Workload Automation/AutoSys engineer, Bash engineer, and test engineer. Work directly in this repository/workspace. The primary target is `uth_autosys_smart_manager.sh` and any UTh Python code that invokes it, if present.

## Objective

Comprehensively review, correct, test, and document the UTh Autosys automation flow for very large nested box hierarchies. The flow has three phases:

1. `validate`: before force-start, inventory the top box and descendants; discover dependencies on jobs/global variables outside that hierarchy; return a clear non-clean result when external dependencies cannot be verified or are unsatisfied, so the Python layer can ask for explicit operator approval.
2. Python issues `sendevent -E FORCE_STARTJOB -J <TOP_BOX_NAME>` only after the operator's decision.
3. `monitor`: Python waits a configurable grace period, then invokes the shell script for a snapshot. The script must distinguish completed, failed, blocked, unresolved, and still-in-progress outcomes, with actionable diagnostics.

Do not assume that the existing implementation is correct. Read the entire script and its callers/tests first. Identify all defects before editing, then implement fixes and tests.

## Data-handling constraint — mandatory

My organization does not permit sharing Autosys command outputs, production logs, job names, JIL, credentials, hostnames, or internal code/logs outside approved company tooling. Do not ask me to paste or upload any of those into this chat. Keep analysis and test data inside the approved company workspace. Do not send data to external services or use web/network calls. Do not put real command output into source control, fixtures, test reports, or the final response. If environment-specific evidence is needed, use approved local commands/docs within the workspace and report only sanitized conclusions. If you cannot verify a CLI behavior safely, mark it as an explicit assumption and fail safely rather than inventing a format or behavior.

## Required workflow

1. Inspect the full shell script, all Python invocation/caller code, repository docs, tests, shellcheck configuration, and any approved local AutoSys documentation available in the workspace.
2. Build a defect list grouped by severity, with file/line references and the test that will prove each fix.
3. Confirm the installed/approved AutoSys command syntax and output formats from approved local documentation or authorized local help. Do not guess the meaning of `autorep -L0`, `autorep -q`, `autorep -G`, `job_depends -c`, or the status columns. Do not assume output formats are the same across AutoSys versions.
4. Implement fixes in small, reviewable changes. Preserve compatibility with the existing Python contract unless you update the caller and document the migration together.
5. Add automated tests using synthetic fixtures that contain no real organization data. Mock `autorep`, `job_depends`, and other CLI commands using temporary executables placed first on `PATH`; do not require access to production Autosys to run unit tests.
6. Run `bash -n`, ShellCheck if available, all unit/integration tests, and any Python tests for the caller. Report exactly which checks passed, failed, or could not be run. Do not claim tests passed if they were not run.
7. Provide a concise change summary, a defect-to-test matrix, compatibility notes, and rollout/rollback guidance.

## Functional correctness requirements

### A. CLI invocation and failure handling
- Validate arguments and mode; quote all user-controlled values.
- Check required commands. `autorep` is required; make `job_depends` required or optional intentionally and document the choice.
- Use safe Bash practices (`set -o pipefail`; consider `set -u` only after auditing every variable). Do not let an upstream CLI failure become a valid-looking empty or partial result.
- Check every important command's exit status, including pipelines, `autorep` status/JIL/global-variable queries, and `job_depends`. Capture stderr for diagnosis without mixing error text into parsed data.
- Fail closed when inventory or condition retrieval fails or is incomplete. Do not report `CLEAN` when the data could not be obtained or parsed.
- Avoid unquoted expansion of `AUTOREP_OPTS`. If multiple arguments are supported, define and validate a safe representation (for example, an array populated from a documented configuration) rather than unsafe word splitting or `eval`.
- Use a private temporary directory, restrictive permissions, and reliable cleanup. Handle signals/interruptions without deleting unrelated paths.

### B. Inventory and status parsing
- Verify, from approved local documentation and synthetic/local checks, how the installed AutoSys version expands a top-level box to all descendants. Do not assume `-L0` means recursive inventory unless confirmed.
- Parse only genuine job records and the actual current-status field for the installed output format. Never scan arbitrary date/time/other columns and take the first token that resembles a status.
- Ignore headers, separators, warnings, and CAUAJM errors without accidentally treating them as job names.
- Detect malformed, duplicate, truncated, unexpected, or empty inventory results. Confirm the top-level box is present and inventory completeness can be established; otherwise return an explicit error/unknown result.
- Handle job names safely, including supported special characters. If the downstream file format cannot safely represent a name, detect and report it rather than silently corrupting it.
- Ensure the local snapshot is clearly timestamped and treat it as a point-in-time view. Do not imply that statuses remain current throughout a long diagnostic run.

### C. JIL/condition collection
- Parse JIL with state reset at each `insert_job`; associate each `condition:` only with the correct job. Handle line wrapping/multiline fields and repeated fields according to the actual output format.
- Preserve the full condition expression exactly enough for evaluation and diagnostics. Do not silently drop terms, qualifiers, lookback values, comparison operators, expected values, or cross-instance qualifiers.
- Distinguish “no condition” from “condition retrieval/parsing failed.”

### D. Correct dependency discovery and logical evaluation
- Separate dependency extraction from evaluation of the complete Boolean condition.
- Support the actual condition grammar used in this environment, including nested parentheses, `AND`/`OR` operators (including symbolic forms where supported), job functions such as `s()`, `f()`, `d()`, `t()`, `n()`, `e()`, global-variable `v()` comparisons, lookback windows, and cross-instance syntax where applicable.
- Do not evaluate each extracted term independently and declare the whole job blocked. Preserve expression logic. For example, in `s(A) | s(B)`, one satisfied branch can satisfy the expression; in `s(A) & s(B)`, both are required.
- Do not implement a home-grown evaluator unless it has a parser/AST, documented supported grammar, and tests. Prefer AutoSys' authoritative condition-evaluation output when it reliably provides the needed result; still provide contextual local-vs-external classification around the authoritative result.
- If a term cannot be evaluated correctly (such as an `e()` condition without exit-code evidence, an unsupported function, inaccessible global variable, or ambiguous CLI output), classify it as `UNKNOWN/UNRESOLVED`, not as definitely satisfied or definitely unsatisfied. Validation must not report clean when material dependencies remain unknown.
- Distinguish dependency status from the truth of the complete condition. A job status alone may not prove whether a condition involving lookback, `n()`, `e()`, global variables, or multiple Boolean branches is satisfied.
- Deduplicate repeated references without losing the context showing which job and expression referenced them.

### E. Local versus external classification
- Determine whether a dependency belongs to the verified hierarchy inventory, not merely whether a name string happens to match.
- Cache external lookups, but cache errors/unknowns explicitly and do not turn a failed query into “job missing” without evidence.
- Distinguish at least `SATISFIED`, `UNSATISFIED`, `MISSING`, `QUERY_ERROR`, and `UNSUPPORTED/UNKNOWN` where relevant.
- Do not label an external job as a confirmed blocker solely because its current status is not the desired status; the complete condition, lookback, and Boolean logic matter.
- Global variables: retrieve the value using verified CLI syntax, preserve comparison operator and expected value, and evaluate supported comparisons correctly. A variable's mere presence must not be treated as a blocker. If comparison cannot be evaluated, report unresolved.

### F. Validation behavior
- Scan every relevant job in the verified hierarchy.
- Report external references and their evaluation state, with the referencing internal job and condition context.
- The `UTH_FLAG_SATISFIED` behavior must be documented and tested. By default, report/flag material unsatisfied or unresolved external dependencies; optionally count already-satisfied external references only when the flag is set.
- Do not mislabel a valid `OR` branch as a blocker simply because another branch is false.
- Exit codes and machine-readable status markers must be stable and documented. Keep the existing contract (`0`, `1`, `2`, `10`, `20`) if possible; if a new code is necessary, update the Python caller and tests in the same change. Never use exit `0` plus `CLEAN` if any required query/evaluation failed.

### G. Monitor behavior
- Take one explicit status snapshot per invocation; print timestamp and counts. Do not claim continuous monitoring: Python controls the grace period and repeat polling.
- Treat top-box `SU` as success only if the inventory/snapshot is valid and no higher-priority failure condition contradicts it. Follow documented AutoSys box semantics.
- Detect `FA` and `TE` reliably and return the documented failure result, including failed job names/statuses.
- Diagnose `AC`, `WA`, and any additional states agreed by the requirement. Report `IN` separately as inactive/scheduling candidates; do not automatically call every inactive job blocked.
- Handle `OH` and `OI` according to verified AutoSys semantics. A warning must not accidentally be reported as a confirmed blocker, and a confirmed blocker must not be omitted.
- A local predecessor in `FA`/`TE` must not merely print a warning while the monitor returns a clean/in-progress outcome.
- Avoid false blockers from valid global-variable values or satisfied Boolean branches.
- Include `job_depends -c` output without arbitrary truncation that hides relevant information; bound output safely if necessary and indicate truncation. Handle command failure distinctly.
- Emit stable, parseable markers such as `MONITOR_STATUS: COMPLETED_SUCCESSFULLY`, `FAILED`, `BLOCKERS_FOUND`, `UNRESOLVED_ITEMS_FOUND`, and `IN_PROGRESS` (or document a compatible alternative).

### H. Scale and security
- The hierarchy may contain hundreds of boxes and thousands/millions of jobs. Avoid spawning multiple external commands per dependency when a supported bulk query can be used. Measure or estimate query complexity and prevent unbounded process creation.
- Keep caches bounded/appropriate to one invocation; do not persist stale statuses across monitoring runs.
- Avoid `eval`, unsafe temporary filenames, injection through job names/options, and logging secrets.
- Make all output safe for Python parsing; send diagnostics to stdout/stderr consistently and document the contract.

## Required synthetic test matrix

At minimum create tests for:
1. Valid inventory with nested boxes and command jobs.
2. Missing top box; empty output; `autorep` nonzero exit; partial output followed by error; malformed status rows; headers/separators/CAUAJM errors.
3. Correct status extraction when date/time columns contain status-like tokens or unrelated text.
4. JIL conditions belonging to multiple jobs; job with no condition; multiline condition; repeated/duplicate dependency references.
5. `s(A) & s(B)` with both true, one false, and one unknown.
6. `s(A) | s(B)` with A true/B false, A false/B true, both false, and unknown branches.
7. Nested Boolean expressions and parentheses.
8. External dependency satisfied, pending, failed, held, iced, missing, query error, and unsupported function.
9. `f()`, `d()`, `t()`, `n()`, and `e()` semantics according to verified AutoSys behavior.
10. Global variable present and comparison true; present and comparison false; missing; inaccessible; quoted values and supported comparison operators.
11. Lookback and cross-instance references: either correct support with tests or explicit unresolved classification, never silent truncation.
12. Local predecessor FA/TE and OH/OI handling.
13. Top box SU, FA/TE in hierarchy, AC/WA/IN states, and mixed snapshots.
14. `UTH_FLAG_SATISFIED=0` and `=1`.
15. `job_depends` missing/failing/large output.
16. Names with dashes, underscores, dots, and any other valid AutoSys characters; safe handling of malformed or unsupported names.
17. Large synthetic hierarchy/performance test demonstrating that command invocation count is bounded and lookup caching works.
18. Python caller behavior for every exit code and every `MONITOR_STATUS` marker, including the operator confirmation path for validation exit 10.

## Acceptance criteria

- All identified defects are fixed or explicitly documented as unsupported with a safe `UNKNOWN/UNRESOLVED` result.
- No unsupported/ambiguous condition is silently called satisfied.
- No individual false Boolean branch is automatically treated as a blocker when another branch satisfies the full expression.
- No CLI failure or partial inventory can produce a clean validation or successful completion.
- The Python caller and shell script agree on exit codes and status markers.
- Tests use only synthetic data; no real production output is committed or printed.
- `bash -n` passes; ShellCheck passes or all remaining findings are explained; all available tests pass.
- Do not stop after giving advice: make the changes in the workspace, run tests, inspect the diff, and summarize exactly what changed.

Start by inspecting the repository and reporting the initial defect list. Then implement the fixes and tests. Do not ask me to share restricted AutoSys output; work within the approved environment and clearly mark any behavior that cannot be verified locally.
