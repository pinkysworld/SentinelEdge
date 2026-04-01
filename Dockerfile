# Wardex — multi-stage container build
# Usage:
#   docker build -t wardex .
#   docker run -p 8080:8080 -v wardex-data:/app/var wardex

# ── Stage 1: Build ────────────────────────────────────────────
FROM rust:1.82-bookworm AS builder

WORKDIR /build
COPY Cargo.toml Cargo.lock* ./
COPY src/ src/
COPY site/ site/
COPY examples/ examples/
COPY tests/ tests/

RUN cargo build --release --bin sentineledge \
    && strip target/release/sentineledge

# ── Stage 2: Runtime ──────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd -r wardex && useradd -r -g wardex -d /app -s /sbin/nologin wardex

WORKDIR /app
COPY --from=builder /build/target/release/sentineledge /app/wardex
COPY site/ /app/site/
COPY examples/ /app/examples/

RUN mkdir -p /app/var && chown -R wardex:wardex /app

USER wardex

EXPOSE 8080

VOLUME ["/app/var"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["/app/wardex", "status-json"]

ENTRYPOINT ["/app/wardex"]
CMD ["serve", "--port", "8080"]
