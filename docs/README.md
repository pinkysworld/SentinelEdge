# SentinelEdge Documentation

This folder keeps the runtime, research blueprint, and public documentation in sync.

Read it in this order:

1. [`GETTING_STARTED.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/GETTING_STARTED.md) for build, run, and sample telemetry input.
2. [`ARCHITECTURE.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/ARCHITECTURE.md) for the runtime pipeline and design decisions.
3. [`STATUS.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/STATUS.md) for what is implemented, partially wired, and still unbuilt.
4. [`PROJECT_BACKLOG.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/PROJECT_BACKLOG.md) for small, buildable tasks.
5. [`RESEARCH_TRACKS.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/RESEARCH_TRACKS.md) for the full 25-track blueprint translated into an implementation status map.

## Current philosophy

- Build a useful runtime slice first.
- Keep the research agenda visible, but separate implemented code from planned work.
- Update the docs whenever behavior changes so the repository stays accurate.

## Working rule

When a new feature lands, update:

- the code in `src/`
- the implementation snapshot in [`STATUS.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/STATUS.md)
- the task state in [`PROJECT_BACKLOG.md`](/Users/michelpicker/Library/Mobile Documents/com~apple~CloudDocs/Projekte/SentinelEdge/docs/PROJECT_BACKLOG.md)
