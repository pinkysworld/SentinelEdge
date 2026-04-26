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

require_file_in_workdir() {
  local relative_path="$1"
  local description="$2"
  local path="$WORK_DIR/$relative_path"

  if [[ ! -s "$path" ]]; then
    echo "error: expected $description at $relative_path" >&2
    exit 1
  fi
}

require_executable_in_workdir() {
  local relative_path="$1"
  local description="$2"
  local path="$WORK_DIR/$relative_path"

  if [[ ! -x "$path" ]]; then
    echo "error: expected executable $description at $relative_path" >&2
    exit 1
  fi
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

require_executable_in_workdir "target/release/wardex" "release wardex binary"
require_file_in_workdir "admin-console/dist/index.html" "embedded admin console entrypoint"
require_file_in_workdir "site/index.html" "runtime site entrypoint"
require_file_in_workdir "examples/README.md" "runtime examples index"
require_file_in_workdir "docs/README.md" "embedded documentation index"
require_file_in_workdir "sdk/typescript/package.json" "SDK generation input"

echo "container build contract validation passed"
