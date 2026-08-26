#!/usr/bin/env bash
#
# build-and-publish.sh — one-shot script to publish PulseFit to Expo and build an APK.
#
# PREREQUISITES:
#   1. An Expo account (free at https://expo.dev/signup)
#   2. An Expo access token (create one at https://expo.dev/accounts/<your-account>/settings/access-tokens)
#   3. Set the token as an env var before running this script:
#
#        export EXPO_TOKEN="your_long_expo_token_here"
#        ./build-and-publish.sh
#
# WHAT THIS SCRIPT DOES:
#   1. Logs in to EAS using your EXPO_TOKEN
#   2. Publishes the current project to Expo (creates a shareable Expo Go link)
#   3. Builds an APK via EAS Build (preview profile, internal distribution)
#   4. Downloads the APK to ./PulseFit.apk
#
# TIMING:
#   - eas update: ~30 seconds
#   - eas build: 10-20 minutes (EAS builds on cloud servers)
#   - APK download: ~30 seconds
#
# COST:
#   - Free tier of EAS includes 30 builds/month for Android, which is plenty
#     for a coursework submission.
#
# TROUBLESHOOTING:
#   - "An Expo user account is required" → your EXPO_TOKEN env var is empty or invalid
#   - Build fails → check the build logs at the URL printed by `eas build`
#   - APK doesn't download → run `eas build:view [build-id]` to get the download URL

set -euo pipefail

# --- 0. Verify prerequisites ---
if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "ERROR: EXPO_TOKEN environment variable is not set."
  echo ""
  echo "Create a token at: https://expo.dev/accounts/<your-account>/settings/access-tokens"
  echo "Then run:"
  echo ""
  echo "  export EXPO_TOKEN=\"your_token_here\""
  echo "  ./build-and-publish.sh"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "ERROR: Run this script from the PulseFit project root (where package.json lives)."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (first run only)..."
  npm install --legacy-peer-deps
fi

echo ""
echo "=========================================="
echo " PulseFit — Build & Publish"
echo "=========================================="
echo ""

# --- 1. Verify EAS auth ---
echo "[1/4] Verifying Expo authentication..."
npx eas-cli whoami
echo "  ✓ Logged in"
echo ""

# --- 2. Publish to Expo (creates the Expo Go link) ---
echo "[2/4] Publishing to Expo (creates shareable Expo Go link)..."
npx eas-cli update --branch preview --message "Initial PulseFit release" --non-interactive
echo "  ✓ Published"
echo ""
echo "  Expo Go link: open the Expo Go app on your phone and scan the QR code at:"
echo "                https://expo.dev/accounts/<your-account>/projects/pulsefit"
echo ""

# --- 3. Build the APK ---
echo "[3/4] Building APK via EAS Build (preview profile, ~10-20 minutes)..."
BUILD_OUTPUT=$(npx eas-cli build --platform android --profile preview --non-interactive --json 2>&1 | tail -1)
echo "  Build submitted. Track progress at:"
echo "  $(echo "$BUILD_OUTPUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0].get("buildUrl", "see console output"))' 2>/dev/null || echo 'see console output above')"
echo ""
echo "  Waiting for build to complete..."
npx eas-cli build --platform android --profile preview --non-interactive --wait
echo "  ✓ Build complete"
echo ""

# --- 4. Download the APK ---
echo "[4/4] Downloading APK..."
APK_URL=$(npx eas-cli build:view --json 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("artifacts", {}).get("buildUrl", ""))' 2>/dev/null)
if [ -z "$APK_URL" ]; then
  echo "  Could not auto-detect APK URL. Get it manually from:"
  echo "  https://expo.dev/accounts/<your-account>/projects/pulsefit/builds"
  echo "  Then download with: curl -o PulseFit.apk '<URL>'"
else
  curl -L -o PulseFit.apk "$APK_URL"
  echo "  ✓ Downloaded to: $(pwd)/PulseFit.apk"
  ls -lh PulseFit.apk
fi

echo ""
echo "=========================================="
echo " Done!"
echo "=========================================="
echo ""
echo "Deliverables in this directory:"
echo "  ./PulseFit.apk         ← install on Android phone"
echo "  ./project-report.pdf   ← submission report (PDF)"
echo "  ./project-report.docx  ← submission report (DOCX, with screenshot placeholders)"
echo ""
echo "Expo Go link: see step 2 output above"
echo "GitHub repo:  https://github.com/gadda00/pulsefit"
