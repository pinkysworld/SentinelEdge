#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/wardex-container-build.XXXXXX")"

cleanup() {
  rm -rf "$WORK_DIR"
}

copy_required() {
  local relative_path="$1"
  local source_path="$ROOT_DIR/$relative_path"
  local destination_path="$WORK_DIR/$relative_path"

  if [[ ! -e "$source_path" ]]; then
    echo "error: required build input is missing: $relative_path" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$destination_path")"
  cp -R "$source_path" "$destination_path"
}

trap cleanup EXIT

# Keep this list aligned with the Docker builder-stage COPY inputs.
required_paths=(
  "Cargo.toml"
  "Cargo.lock"
  "build.rs"
  "src"
  "docs"
  "admin-console"
  "sdk"
  "site"
  "examples"
  "benches"
  "tests"
)

for path in "${required_paths[@]}"; do
  copy_required "$path"
done

cd "$WORK_DIR"
npm ci --prefix admin-console
cargo build --release --features tls --bin wardex

echo "container build contract validation passed"
