#!/usr/bin/env bash
# Build & install Versemark on a USB-connected iPhone (native, not Expo Go).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MOBILE="$(cd "$(dirname "$0")/.." && pwd)"
DEVICE_NAME="${1:-DPS iPhone}"

die() { echo "error: $*" >&2; exit 1; }

# --- Xcode required ---
if ! xcodebuild -version >/dev/null 2>&1; then
  cat >&2 <<'EOF'
error: Full Xcode is required to install on a physical iPhone.

This Mac only has Command Line Tools (no Xcode.app).

1. Install Xcode from the Mac App Store (or: brew install --cask xcode)
2. Open Xcode once → accept license → install extra components
3. sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
4. sudo xcodebuild -license accept
5. Re-run: pnpm run ios:device

EOF
  exit 1
fi

# --- CocoaPods ---
if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods not found — installing via Homebrew…"
  brew install cocoapods
fi

# --- Code signing (required for physical devices) ---
if ! security find-identity -v -p codesigning 2>/dev/null | grep -qE 'iPhone Developer|Apple Development|iOS Development'; then
  cat >&2 <<'EOF'
error: No Apple development code-signing certificate on this Mac.

Preferred (App Store Connect CLI — already used for this project):
  1. asc auth login --key-id … --issuer-id … --private-key AuthKey_….p8
  2. asc certificates create --certificate-type IOS_DEVELOPMENT --generate-csr \
       --key-out ./signing/ios-development.key --csr-out ./signing/ios-development.csr
  3. Import the resulting .p12 into the login keychain (see project signing/)
  4. asc signing fetch --bundle-id app.versemark.mobile \
       --profile-type IOS_APP_DEVELOPMENT --device DEVICE_ID --create-missing --output ./signing

Or via Xcode GUI:
  Xcode → Settings → Accounts → add Apple ID → Manage Certificates → Apple Development
  then open apps/mobile/ios/Versemark.xcworkspace and enable Automatic signing (team 467UZHSCC3).

EOF
  exit 1
fi

# Resolve UDID via devicectl JSON (more reliable than name matching in Expo).
resolve_device_udid() {
  local name="$1"
  local tmp
  tmp="$(mktemp)"
  if ! xcrun devicectl list devices --json-output "$tmp" --timeout 8 >/dev/null 2>&1; then
    rm -f "$tmp"
    return 1
  fi
  python3 - "$tmp" "$name" <<'PY'
import json, sys
path, want = sys.argv[1], sys.argv[2].lower()
data = json.load(open(path))
devices = data.get("result", {}).get("devices") or []
# Prefer exact name match, then substring; only paired devices.
matched = []
for d in devices:
    props = d.get("deviceProperties") or {}
    conn = d.get("connectionProperties") or {}
    hw = d.get("hardwareProperties") or {}
    if conn.get("pairingState") != "paired":
        continue
    n = (props.get("name") or "")
    udid = (hw.get("udid") or "")
    if not udid:
        continue
    if n.lower() == want or want in n.lower():
        matched.append((0 if n.lower() == want else 1, udid, n, conn.get("tunnelState"), props.get("ddiServicesAvailable")))
if not matched:
    # Any paired iPhone
    for d in devices:
        props = d.get("deviceProperties") or {}
        conn = d.get("connectionProperties") or {}
        hw = d.get("hardwareProperties") or {}
        if conn.get("pairingState") != "paired":
            continue
        if (hw.get("deviceType") or "").lower() == "iphone" or (hw.get("platform") or "") == "iOS":
            udid = hw.get("udid")
            if udid:
                matched.append((2, udid, props.get("name"), conn.get("tunnelState"), props.get("ddiServicesAvailable")))
if not matched:
    sys.exit(1)
matched.sort()
_, udid, name, tunnel, ddi = matched[0]
print(udid)
print(name or "", file=sys.stderr)
if tunnel == "unavailable" or ddi is False:
    print(f"note: device tunnel={tunnel!r} ddiServicesAvailable={ddi!r} — unlock phone, trust Mac, enable Developer Mode if prompted.", file=sys.stderr)
sys.exit(0)
PY
  local rc=$?
  rm -f "$tmp"
  return $rc
}

# --- Device presence ---
echo "Looking for device: $DEVICE_NAME"
DEVICE_UDID=""
if DEVICE_UDID="$(resolve_device_udid "$DEVICE_NAME" 2>/tmp/versemark-device-resolve.err)"; then
  RESOLVED_NAME="$(cat /tmp/versemark-device-resolve.err 2>/dev/null | head -1 || true)"
  echo "Found via devicectl: ${RESOLVED_NAME:-$DEVICE_NAME} ($DEVICE_UDID)"
  if [[ -s /tmp/versemark-device-resolve.err ]]; then
    tail -n +2 /tmp/versemark-device-resolve.err 2>/dev/null || true
  fi
elif xcrun xctrace list devices 2>/dev/null | grep -F "$DEVICE_NAME" >/dev/null; then
  echo "Found via xctrace (name only — Expo will match by name)."
else
  cat >&2 <<EOF
warning: Could not confirm "$DEVICE_NAME" is connected.
  • Unlock the iPhone
  • Trust this computer if prompted
  • Settings → Privacy & Security → Developer Mode → On (iOS 16+)
  • Keep the phone unlocked during first install/signing
  Continuing anyway so Expo can list devices…
EOF
fi

cd "$MOBILE"

# Generate native ios/ project if missing
if [[ ! -d ios ]]; then
  echo "Generating native ios/ project (expo prebuild)…"
  pnpm exec expo prebuild --platform ios --no-install
fi

# Install pods
if [[ -f ios/Podfile ]]; then
  echo "Installing CocoaPods…"
  (cd ios && pod install)
fi

# Always Release: embeds JS in the .app (no Metro / no white-screen-on-LAN).
# Debug is opt-in: VM_IOS_DEBUG=1 pnpm run ios:device
CONFIGURATION="${VM_IOS_CONFIGURATION:-Release}"
if [[ "${VM_IOS_DEBUG:-}" == "1" ]]; then
  CONFIGURATION="Debug"
fi

TARGET="${DEVICE_UDID:-$DEVICE_NAME}"
echo "Building & installing on: $TARGET ($CONFIGURATION)"
# --device with UDID is more reliable than display name; first run may open Xcode signing UI
# --no-bundler: do not start Metro; Release bundles JS into the binary
pnpm exec expo run:ios --device "$TARGET" --configuration "$CONFIGURATION" --no-bundler