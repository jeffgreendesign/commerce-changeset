#!/bin/bash
# ============================================================================
# Version Floor Check — Minimum Safe Version Enforcement
# ============================================================================
# Checks installed dependency versions against known-vulnerable version ranges
# defined in config/version-floors.json. Non-blocking by default (exits 0 with
# warnings). Use --strict to fail on any violation.
#
# Why this exists:
# - Vercel blocks deployments of vulnerable Next.js and next-mdx-remote versions
# - React Server Components had a CVSS 10.0 RCE (React2Shell) actively exploited
# - Developers can work all day on a vulnerable version and only discover it at
#   deploy time. This check catches it in gates/pre-commit instead.
#
# What it checks:
# - next: React2Shell RCE, middleware auth bypass, DoS
# - react-server-dom-*: RSC RCE and DoS vulnerabilities
# - Any additional packages listed in config/version-floors.json
#
# Usage:
#   ./scripts/version-floor-check.sh              # Warn only (exit 0)
#   ./scripts/version-floor-check.sh --strict     # Fail on violations (exit 1)
# ============================================================================
set -euo pipefail

STRICT=false
if [ "${1:-}" = "--strict" ]; then
  STRICT=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FLOORS_FILE="$PROJECT_DIR/config/version-floors.json"

# Exit silently if no floors file — framework-agnostic opt-in
if [ ! -f "$FLOORS_FILE" ]; then
  exit 0
fi

# Require Node.js for JSON parsing and version comparison
if ! command -v node >/dev/null 2>&1; then
  echo -e "\033[1;33m⚠ Node.js not found — skipping version floor check.\033[0m"
  exit 0
fi

# Require package.json
if [ ! -f "$PROJECT_DIR/package.json" ]; then
  exit 0
fi

echo "Version floor check: scanning installed dependencies..."
echo ""

# Single Node.js call: parse floors, check versions, format output, exit with warning count
WARNINGS=$(node -e "
  const fs = require('fs');
  const path = require('path');

  const projectDir = process.argv[1];
  const floorsFile = process.argv[2];

  // ANSI colors
  const Y = '\x1b[1;33m', G = '\x1b[0;32m', C = '\x1b[0;36m', NC = '\x1b[0m';

  let floors;
  try {
    floors = JSON.parse(fs.readFileSync(floorsFile, 'utf8'));
  } catch (e) {
    process.stderr.write('Failed to parse ' + floorsFile + ': ' + e.message + '\n');
    process.stdout.write('0');
    process.exit(0);
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
  } catch (e) {
    process.stdout.write('0');
    process.exit(0);
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  function compareSemver(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    }
    return 0;
  }

  function cleanVersion(v) {
    return v.replace(/^[~^>=<]+/, '').split('-')[0];
  }

  // Use stderr for display output so stdout is clean for the warning count
  const log = (msg) => process.stderr.write(msg + '\n');

  let warnings = 0;
  let checked = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const [pkgName, floorData] of Object.entries(floors.floors || {})) {
    if (!allDeps[pkgName]) continue;

    // Resolve installed version: prefer node_modules, fall back to package.json spec
    let installed;
    const nmPkgPath = path.join(projectDir, 'node_modules', pkgName, 'package.json');
    try {
      installed = JSON.parse(fs.readFileSync(nmPkgPath, 'utf8')).version;
    } catch (e) {
      installed = cleanVersion(allDeps[pkgName]);
    }

    if (!installed || installed === '*' || installed === 'latest') continue;
    checked++;

    // Check for overrides (accepted risk with expiry)
    if (floors.overrides && floors.overrides[pkgName]) {
      const override = floors.overrides[pkgName];
      if (override.expires && override.expires >= today) {
        log(C + 'ℹ Override:' + NC + ' ' + pkgName + '@' + installed + ' — Accepted risk until ' + override.expires + ': ' + (override.accepted_risk || 'No reason given'));
        log('');
        continue;
      }
      if (override.expires && override.expires < today) {
        log(Y + '⚠ WARNING:' + NC + ' Expired risk override — ' + (override.accepted_risk || 'No reason given'));
        log('  Package: ' + pkgName);
        log('  Installed: ' + installed);
        log('  Override expired: ' + override.expires);
        log('');
        warnings++;
        // Fall through to normal check
      }
    }

    const minimums = floorData.minimums || {};
    const parts = installed.split('.');
    const majorMinor = parts[0] + '.' + parts[1];

    // Most specific match: major.minor > major > *
    const floorVersion = minimums[majorMinor] || minimums[parts[0]] || minimums['*'];
    if (!floorVersion) continue;

    if (compareSemver(installed, floorVersion) < 0) {
      log(Y + '⚠ WARNING:' + NC + ' Vulnerable version — ' + floorData.reason);
      log('  Package: ' + pkgName);
      log('  Installed: ' + installed);
      log('  Minimum safe: ' + floorVersion);
      log('');
      warnings++;
    } else {
      log(G + '✓' + NC + ' ' + pkgName + '@' + installed + ' (floor: ' + floorVersion + ')');
    }
  }

  if (checked === 0) {
    log(G + '✓ No version floor issues (no monitored packages found).' + NC);
  }

  // Only the warning count goes to stdout
  process.stdout.write(String(warnings));
" "$PROJECT_DIR" "$FLOORS_FILE")

# Summary
echo ""
echo "──────────────────────────────────────"
if [ "$WARNINGS" -eq 0 ]; then
  echo -e "\033[0;32m✓ All monitored packages meet version floors.\033[0m"
  exit 0
fi

echo -e "\033[1;33mFound $WARNINGS version floor violation(s).\033[0m"
echo ""
echo "Fix: upgrade to the minimum safe version listed above."
echo "See config/version-floors.json for CVE details."

if [ "$STRICT" = true ]; then
  echo ""
  echo -e "\033[0;31mStrict mode: failing due to version floor violations.\033[0m"
  exit 1
fi

echo "Run with --strict to treat violations as errors."
exit 0
