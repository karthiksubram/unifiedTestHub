#!/usr/bin/env bash
# ==============================================================================
# Script Name : uth_autosys_smart_manager.sh
# Framework   : UTh Workflow Automation
# Description : Contextual Autosys validator & monitor that performs deep local
#               vs external dependency analysis using 'autorep' (status and JIL
#               conditions) and 'job_depends' (Autosys's own evaluation output).
# Usage       : ./uth_autosys_smart_manager.sh <validate|monitor> <TOP_BOX_NAME>
#
# Exit codes  : 0  clean / completed / in progress with no real blockers
#               1  usage error, box not found, or autorep returned nothing usable
#               2  required Autosys CLI missing
#               10 validate: unsatisfied external dependencies found
#                  monitor : jobs blocked by external/held/missing dependencies
#               20 monitor : failed or terminated jobs in the hierarchy
#
# Environment : AUTOREP_OPTS        extra autorep flags (default: -w, no name truncation)
#               UTH_FLAG_SATISFIED  1 = also count external links that are already
#                                   satisfied as issues in validate (default: 0)
# Requires    : bash 4+ (associative arrays, ${var,,}), GNU grep (-o, \b).
# NOTE        : Must be uploaded with LF line endings (not CRLF).
# ==============================================================================

MODE="${1:-}"
TOP_BOX="${2:-}"
AUTOREP_OPTS="${AUTOREP_OPTS:--w}"
FLAG_SATISFIED="${UTH_FLAG_SATISFIED:-0}"

# Valid Autosys status codes (matched by value, never by column position)
STATUS_RE='^(IN|AC|RU|SU|FA|TE|ST|RE|QU|OH|OI|WA|PE)$'

if [[ -z "$MODE" || -z "$TOP_BOX" ]]; then
  echo "[ERROR] Missing arguments. Usage: $0 <validate|monitor> <TOP_BOX_NAME>"
  exit 1
fi

if [[ "$MODE" != "validate" && "$MODE" != "monitor" ]]; then
  echo "[ERROR] Invalid mode '$MODE'. Use 'validate' or 'monitor'."
  exit 1
fi

if ! command -v autorep &> /dev/null; then
  echo "[ERROR] Autosys CLI command (autorep) not found in PATH."
  exit 2
fi

WORKDIR=$(mktemp -d) || { echo "[ERROR] Unable to create temp directory."; exit 2; }
trap 'rm -rf "$WORKDIR"' EXIT

JOBS_FILE="$WORKDIR/jobs.txt"     # one internal job name per line
SNAP_FILE="$WORKDIR/status.txt"   # "<job> <status>" per line
COND_FILE="$WORKDIR/cond.tsv"     # "<job>\t<condition>" per line

declare -A STATUS_CACHE           # cache for external job statuses
RESOLVED_STATUS=""
BLOCKED=0

# ------------------------------------------------------------------------------
# autorep output parser: stdin = raw autorep text, stdout = "<job> <status>"
# Skips headers, separator lines (dashes or underscores) and CAUAJM error lines.
# The status is located by value, so Last Start / Last End columns don't matter.
# ------------------------------------------------------------------------------
parse_autorep() {
  awk -v re="$STATUS_RE" '
    NF == 0 { next }
    $1 ~ /^[-_]+$/ { next }
    $1 == "Job" && $2 == "Name" { next }
    $1 ~ /^CAUAJM/ { next }
    {
      st = "UNKNOWN"
      for (i = 2; i <= NF; i++) {
        if ($i ~ re) { st = $i; break }
      }
      print $1, st
    }'
}

# Build the internal inventory: every job in the box tree (all levels, any name)
load_inventory() {
  # shellcheck disable=SC2086
  autorep $AUTOREP_OPTS -J "$TOP_BOX" -L0 </dev/null 2>&1 | parse_autorep > "$SNAP_FILE"
  awk '{print $1}' "$SNAP_FILE" > "$JOBS_FILE"
}

# One bulk pass over the JIL to collect every job's condition
load_conditions() {
  # shellcheck disable=SC2086
  autorep $AUTOREP_OPTS -J "$TOP_BOX" -L0 -q </dev/null 2>/dev/null | awk '
    /^[[:space:]]*insert_job:/ {
      for (i = 1; i <= NF; i++) if ($i == "insert_job:") { job = $(i + 1); break }
    }
    /^[[:space:]]*condition:/ {
      c = $0
      sub(/^[[:space:]]*condition:[[:space:]]*/, "", c)
      if (job != "" && c != "") printf "%s\t%s\n", job, c
    }' > "$COND_FILE"
}

require_inventory() {
  load_inventory
  if [[ ! -s "$JOBS_FILE" ]] || ! grep -Fxq -- "$TOP_BOX" "$JOBS_FILE"; then
    echo "[ERROR] Top-level box '$TOP_BOX' not found or autorep returned no usable output."
    exit 1
  fi
  load_conditions
}

is_internal() { grep -Fxq -- "$1" "$JOBS_FILE"; }

local_status() {
  awk -v j="$1" '$1 == j {print $2; exit}' "$SNAP_FILE"
}

get_condition() {
  awk -F'\t' -v j="$1" '$1 == j {print $2; exit}' "$COND_FILE"
}

# Sets RESOLVED_STATUS (not command substitution, so the cache persists)
resolve_status() {
  local j="$1" s
  if is_internal "$j"; then
    s=$(local_status "$j")
    RESOLVED_STATUS="${s:-UNKNOWN_OR_MISSING}"
    return
  fi
  if [[ -z "${STATUS_CACHE[$j]+x}" ]]; then
    # shellcheck disable=SC2086
    s=$(autorep $AUTOREP_OPTS -J "$j" </dev/null 2>/dev/null | parse_autorep \
          | awk -v j="$j" '$1 == j {print $2; exit}')
    if [[ -z "$s" || "$s" == "UNKNOWN" ]]; then s="UNKNOWN_OR_MISSING"; fi
    STATUS_CACHE[$j]="$s"
  fi
  RESOLVED_STATUS="${STATUS_CACHE[$j]}"
}

# Global variable lookup; prints the rest of the autorep -G row or UNKNOWN_OR_MISSING
get_global_value() {
  local out
  out=$(autorep -G "$1" </dev/null 2>/dev/null | awk -v g="$1" '
    $1 == g { for (i = 2; i <= NF; i++) printf "%s%s", $i, (i < NF ? " " : ""); print ""; exit }')
  echo "${out:-UNKNOWN_OR_MISSING}"
}

# ------------------------------------------------------------------------------
# Condition parsing: stdin = condition string, stdout = "<kind>\t<fn>\t<name>"
#   kind J = job dependency, V = global variable
#   fn   s f d t n e v (canonical short form)
# Only names inside condition functions are extracted, so operators, keywords,
# lookback values (24.00) and comparison values are never mistaken for jobs.
# ------------------------------------------------------------------------------
extract_deps() {
  local tok fn arg
  grep -oiE '\b[a-z]+\([^)]*\)' | while IFS= read -r tok; do
    fn=${tok%%(*}; fn=${fn,,}
    arg=${tok#*(}; arg=${arg%)}
    arg=${arg%%,*}      # drop lookback
    arg=${arg%%^*}      # drop cross-instance suffix
    arg=${arg// /}
    [[ -z "$arg" ]] && continue
    case "$fn" in
      s|success)      printf 'J\ts\t%s\n' "$arg" ;;
      f|failure)      printf 'J\tf\t%s\n' "$arg" ;;
      d|done)         printf 'J\td\t%s\n' "$arg" ;;
      t|terminated)   printf 'J\tt\t%s\n' "$arg" ;;
      n|notrunning)   printf 'J\tn\t%s\n' "$arg" ;;
      e|exitcode)     printf 'J\te\t%s\n' "$arg" ;;
      v|value)        printf 'V\tv\t%s\n' "$arg" ;;
    esac
  done | sort -u
}

# Is a single condition term satisfied by the job's current status?
dep_satisfied() {
  local fn="$1" st="$2"
  case "$fn" in
    s) [[ "$st" == "SU" ]] ;;
    f) [[ "$st" == "FA" ]] ;;
    t) [[ "$st" == "TE" ]] ;;
    d) [[ "$st" =~ ^(SU|FA|TE)$ ]] ;;
    n) [[ ! "$st" =~ ^(RU|ST)$ && "$st" != "UNKNOWN_OR_MISSING" ]] ;;
    *) return 1 ;;   # e() and v() cannot be evaluated from status alone
  esac
}

# ==============================================================================
# CORE FUNCTION: Analyze dependencies for a specific waiting job
# Sets BLOCKED=1 when a genuine blocker is found.
# ==============================================================================
analyze_job_dependencies() {
  local target="$1" cond kind fn name st val tag

  cond=$(get_condition "$target")
  if [[ -z "$cond" ]]; then
    echo "      -> No dependency condition. Check start_times / date_conditions, machine, resources or parent box."
  else
    echo "      Condition: $cond"
    while IFS=$'\t' read -r kind fn name; do
      [[ -z "$name" || "$name" == "$target" ]] && continue

      if [[ "$kind" == "V" ]]; then
        val=$(get_global_value "$name")
        echo "      [EXTERNAL VARIABLE] -> '$name' [Value: $val]"
        if [[ "$val" == "UNKNOWN_OR_MISSING" ]]; then
          echo "          CRITICAL: Global variable does not exist or cannot be read!"
        else
          echo "          NOTE: Compare this value with the v() term in the condition above."
        fi
        BLOCKED=1
        continue
      fi

      resolve_status "$name"
      st="$RESOLVED_STATUS"

      if is_internal "$name"; then
        echo "      [LOCAL DEPENDENCY]  -> '$name' [Status: $st] (needs: $fn)"
        if dep_satisfied "$fn" "$st"; then
          echo "          OK: Term is satisfied."
        else
          case "$st" in
            FA|TE) echo "          WARNING: Local predecessor has FAILED/TERMINATED!" ;;
            OH)    echo "          CRITICAL: Local predecessor is ON HOLD!"; BLOCKED=1 ;;
            OI)    echo "          WARNING: Local predecessor is ON ICE." ;;
            *)     echo "          INFO: Local predecessor is active/waiting (normal sequence flow)." ;;
          esac
        fi
      else
        echo "      [EXTERNAL BLOCKER]  -> '$name' [Status: $st] (needs: $fn)"
        if [[ "$fn" == "e" ]]; then
          echo "          NOTE: exitcode() term cannot be evaluated here; verify manually."
          BLOCKED=1
        elif dep_satisfied "$fn" "$st"; then
          echo "          NOTE: Term is satisfied (Why is this job stuck? Check lookback window and other terms)."
        else
          case "$st" in
            UNKNOWN_OR_MISSING) echo "          CRITICAL: External dependency does not exist or cannot be reached!"; BLOCKED=1 ;;
            OH)                 echo "          CRITICAL: External dependency is ON HOLD!"; BLOCKED=1 ;;
            OI)                 echo "          WARNING: External dependency is ON ICE." ;;
            SU|FA|TE)           echo "          CRITICAL: External job is $st, which does not satisfy $fn()!"; BLOCKED=1 ;;
            *)                  echo "          INFO: External dependency is currently $st (still pending)."; BLOCKED=1 ;;
          esac
        fi
      fi
    done < <(printf '%s\n' "$cond" | extract_deps)
  fi

  if command -v job_depends &> /dev/null; then
    echo "      Autosys evaluation (job_depends -c):"
    job_depends -c -J "$target" </dev/null 2>/dev/null | head -n 15 | sed 's/^/        | /'
  fi
}

# ==============================================================================
# MODE 1: PRE-FORCE START VALIDATION
# ==============================================================================
if [[ "$MODE" == "validate" ]]; then
  echo "=================================================================="
  echo " UTh SMART PRE-START VALIDATION FOR: $TOP_BOX"
  echo "=================================================================="

  require_inventory

  ISSUES_FOUND=0
  echo "Scanning hierarchy for invalid or external prerequisites..."
  echo "------------------------------------------------------------------"

  while IFS=$'\t' read -r JOB_NAME COND; do
    while IFS=$'\t' read -r kind fn name; do
      [[ -z "$name" || "$name" == "$JOB_NAME" ]] && continue

      if [[ "$kind" == "V" ]]; then
        val=$(get_global_value "$name")
        echo "[EXTERNAL VARIABLE] Job '$JOB_NAME' depends on global variable: '$name' [Value: $val]"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        continue
      fi

      is_internal "$name" && continue

      resolve_status "$name"
      st="$RESOLVED_STATUS"
      if dep_satisfied "$fn" "$st"; then
        echo "[EXTERNAL LINK] Job '$JOB_NAME' depends on external: '$name' [Status: $st] (currently satisfied)"
        [[ "$FLAG_SATISFIED" == "1" ]] && ISSUES_FOUND=$((ISSUES_FOUND + 1))
      else
        echo "[EXTERNAL LINK] Job '$JOB_NAME' depends on external: '$name' [Status: $st] (needs: $fn)"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
      fi
    done < <(printf '%s\n' "$COND" | extract_deps)
  done < "$COND_FILE"

  echo "------------------------------------------------------------------"
  if [[ $ISSUES_FOUND -gt 0 ]]; then
    echo "VALIDATION_STATUS: EXTERNAL_DEPENDENCIES_FOUND ($ISSUES_FOUND links identified)"
    echo "ACTION: Prompt user if they wish to proceed with Force Start and handle/correct later."
    exit 10
  else
    echo "VALIDATION_STATUS: CLEAN (No unsatisfied external dependencies)"
    exit 0
  fi

# ==============================================================================
# MODE 2: POST-START DELAYED MONITORING (e.g., after 15 mins)
# ==============================================================================
elif [[ "$MODE" == "monitor" ]]; then
  echo "=================================================================="
  echo " UTh SMART POST-START MONITORING SNAPSHOT FOR: $TOP_BOX"
  echo "=================================================================="

  require_inventory

  count_status() { awk -v re="$1" '$2 ~ re {n++} END {print n + 0}' "$SNAP_FILE"; }

  TOTAL_COUNT=$(wc -l < "$JOBS_FILE" | tr -d '[:space:]')
  SUCCESS_COUNT=$(count_status '^SU$')
  RUNNING_COUNT=$(count_status '^(RU|ST)$')
  WAITING_COUNT=$(count_status '^(AC|WA|QU|PE|RE)$')
  INACTIVE_COUNT=$(count_status '^IN$')
  HELD_COUNT=$(count_status '^(OH|OI)$')
  FAILED_COUNT=$(count_status '^(FA|TE)$')
  TOP_STATUS=$(local_status "$TOP_BOX")

  echo "Execution Snapshot Summary:"
  echo " - Top Box Status : ${TOP_STATUS:-UNKNOWN}"
  echo " - Total Jobs     : $TOTAL_COUNT"
  echo " - Success        : $SUCCESS_COUNT"
  echo " - Running        : $RUNNING_COUNT"
  echo " - Waiting/AC     : $WAITING_COUNT"
  echo " - Inactive       : $INACTIVE_COUNT"
  echo " - On Hold/Ice    : $HELD_COUNT"
  echo " - Failed         : $FAILED_COUNT"
  echo "------------------------------------------------------------------"

  # Handle failures immediately
  if [[ $FAILED_COUNT -gt 0 ]]; then
    echo "[ALERT] Failed or Terminated jobs found in hierarchy:"
    awk '$2 ~ /^(FA|TE)$/ {printf "   -> %-35s Status: %s\n", $1, $2}' "$SNAP_FILE"
    echo "MONITOR_STATUS: FAILED"
    exit 20
  fi

  # The top box status is the authoritative completion signal
  if [[ "$TOP_STATUS" == "SU" ]]; then
    echo "MONITOR_STATUS: COMPLETED_SUCCESSFULLY"
    exit 0
  fi

  # Held / iced jobs
  if [[ $HELD_COUNT -gt 0 ]]; then
    echo "[DIAGNOSTIC] Jobs on hold or on ice:"
    while read -r job st; do
      if [[ "$st" == "OH" ]]; then
        echo "   -> $job [ON_HOLD]  CRITICAL: box cannot complete until released."
        BLOCKED=1
      else
        echo "   -> $job [ON_ICE]   WARNING: job is skipped until taken off ice."
      fi
    done < <(awk '$2 ~ /^(OH|OI)$/' "$SNAP_FILE")
    echo "------------------------------------------------------------------"
  fi

  # Breakdown of Active/Waiting nodes
  if [[ $WAITING_COUNT -gt 0 ]]; then
    echo "[DIAGNOSTIC] Inspecting jobs in ACTIVATED/WAITING state..."
    echo "------------------------------------------------------------------"
    while read -r job st; do
      echo "Job: $job [Current Status: $st]"
      analyze_job_dependencies "$job"
      echo "------------------------------------------------------------------"
    done < <(awk '$2 ~ /^(AC|WA|QU|PE|RE)$/' "$SNAP_FILE")
  fi

  if [[ $BLOCKED -eq 1 ]]; then
    echo "MONITOR_STATUS: INSPECTION_COMPLETE_WAITING_NODES_FOUND"
    exit 10
  fi

  echo "MONITOR_STATUS: IN_PROGRESS"
  exit 0
fi
