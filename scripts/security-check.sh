#!/bin/bash
# ============================================================================
# Security Check — Pre-commit Security Scanner
# ============================================================================
# Scans staged files for common security issues. Non-blocking by default
# (exits 0 with warnings). Use --strict to fail on any finding, and --all to
# scan the whole source tree instead of the staged set (CI has nothing staged,
# so without --all the scan silently checks zero files there).
#
# What it catches:
# - Path traversal: user input flowing into filesystem operations
# - Console.log in non-test files (if stdout is reserved for data)
# - Hardcoded secrets: API keys, tokens, passwords in source
# - eval() usage: code injection risk
# - SQL string interpolation: SQL injection risk
#
# Usage:
#   ./scripts/security-check.sh              # Staged files, warn only (exit 0)
#   ./scripts/security-check.sh --strict     # Fail on findings (exit 1)
#   ./scripts/security-check.sh --all        # Scan all of app/, lib/, components/
#   ./scripts/security-check.sh --since REF  # Scan files changed vs REF (CI)
#
# Note: a full --all scan takes several minutes on this codebase, so CI uses
# --since to scan only what the pull request touched.
# ============================================================================
set -euo pipefail

STRICT=false
SCAN_ALL=false
SINCE_REF=""
while [ $# -gt 0 ]; do
  case "$1" in
    --strict) STRICT=true ;;
    --all) SCAN_ALL=true ;;
    --since)
      shift
      SINCE_REF="${1:-}"
      if [ -z "$SINCE_REF" ]; then
        echo "--since requires a git ref" >&2
        exit 2
      fi
      ;;
  esac
  shift
done

WARNINGS=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

warn() {
  echo -e "${YELLOW}⚠ WARNING:${NC} $1"
  echo "  File: $2"
  echo "  Line: $3"
  echo ""
  WARNINGS=$((WARNINGS + 1))
}

# Get files to check: --since REF diff, staged files, or the whole tree
if [ -n "$SINCE_REF" ]; then
  # Includes R (renamed): a file that is renamed and modified in the same PR
  # would otherwise skip the scan entirely.
  FILES=$(git diff --name-only --diff-filter=ACMR "$SINCE_REF"...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null || true)
elif [ "$SCAN_ALL" = false ] && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  FILES=$(git diff --cached --name-only --diff-filter=ACM -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null || true)
else
  FILES=$(find "$PROJECT_DIR/app" "$PROJECT_DIR/lib" "$PROJECT_DIR/components" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null || true)
fi

if [ -z "$FILES" ]; then
  echo -e "${GREEN}✓ No files to check.${NC}"
  exit 0
fi

echo "Security scan: checking $(echo "$FILES" | wc -l | tr -d ' ') files..."
echo ""

for file in $FILES; do
  [ -f "$file" ] || continue
  LINE_NUM=0

  while IFS= read -r line; do
    LINE_NUM=$((LINE_NUM + 1))

    # Skip test files for console.log check
    IS_TEST=false
    case "$file" in
      *.test.* | *.spec.* | *__tests__* | *test_*) IS_TEST=true ;;
    esac

    # --- Path Traversal ---
    # User input flowing into fs.readFile, fs.writeFile, path.join without sanitization
    if echo "$line" | grep -qE "(readFile|writeFile|readdir|mkdir|unlink|path\.join|path\.resolve)\s*\(.*\b(req\.|request\.|params\.|query\.|body\.|input)" 2>/dev/null; then
      warn "Possible path traversal — user input in filesystem operation" "$file" "$LINE_NUM"
    fi

    # --- Console.log in non-test files ---
    if [ "$IS_TEST" = false ] && echo "$line" | grep -qE "console\.(log|debug)\(" 2>/dev/null; then
      # Skip comments
      TRIMMED=$(echo "$line" | sed 's/^[[:space:]]*//')
      case "$TRIMMED" in
        "//"*|"#"*|"*"*) ;; # skip comments
        *) warn "console.log() in non-test file (use structured logger)" "$file" "$LINE_NUM" ;;
      esac
    fi

    # --- Hardcoded Secrets ---
    # API keys, tokens, passwords assigned as string literals
    if echo "$line" | grep -qiE "(api_key|apikey|secret|password|token|private_key)\s*[:=]\s*['\"][A-Za-z0-9+/=_-]{8,}" 2>/dev/null; then
      # Skip .env.example and template files
      case "$file" in
        *.example | *.template) ;;
        *) warn "Possible hardcoded secret" "$file" "$LINE_NUM" ;;
      esac
    fi

    # --- eval() Usage ---
    if echo "$line" | grep -qE "\beval\s*\(" 2>/dev/null; then
      TRIMMED=$(echo "$line" | sed 's/^[[:space:]]*//')
      case "$TRIMMED" in
        "//"*|"#"*|"*"*) ;; # skip comments
        *) warn "eval() usage — code injection risk" "$file" "$LINE_NUM" ;;
      esac
    fi

    # --- SQL String Interpolation ---
    # Catches template literals and f-strings used in SQL-like contexts
    if echo "$line" | grep -qE "(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER).*(\\\$\{|\" *\+|f['\"])" 2>/dev/null; then
      warn "SQL string interpolation — use parameterized queries" "$file" "$LINE_NUM"
    fi

  done < "$file"
done

# Summary
echo "──────────────────────────────────────"
if [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✓ No security issues found.${NC}"
  exit 0
fi

echo -e "${YELLOW}Found $WARNINGS warning(s).${NC}"

if [ "$STRICT" = true ]; then
  echo -e "${RED}Strict mode: failing due to warnings.${NC}"
  exit 1
fi

echo "Run with --strict to treat warnings as errors."
exit 0
