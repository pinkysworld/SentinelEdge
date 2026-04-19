window.BENCHMARK_DATA = {
  "lastUpdate": 1776591227357,
  "repoUrl": "https://github.com/pinkysworld/Wardex",
  "entries": {
    "Wardex criterion benches": [
      {
        "commit": {
          "author": {
            "name": "pinkysworld",
            "username": "pinkysworld",
            "email": "85413447+pinkysworld@users.noreply.github.com"
          },
          "committer": {
            "name": "pinkysworld",
            "username": "pinkysworld",
            "email": "85413447+pinkysworld@users.noreply.github.com"
          },
          "id": "7660ee52332fdc81b9c8d5cb09b3d5803342127d",
          "message": "site: improve a11y — darken muted text token to meet WCAG AA 4.5:1\n\npa11y-ci surfaced 31 contrast failures on /resources and /donate from\nthe --ink-3 muted-text token (#7a7a7a). On #fff and on --bg-alt that\nlands at 4.11-4.29:1, below the WCAG 2.1 AA 4.5:1 threshold.\n\n- --ink-3: #7a7a7a -> #6b6b6b (4.82:1 on #fff, 4.59:1 on #f3f2ee).\n- Bump styles.css?v=10 -> v=11 on all 6 pages and the changelog\n  generator to bust any downstream cache.",
          "timestamp": "2026-04-19T07:51:31Z",
          "url": "https://github.com/pinkysworld/Wardex/commit/7660ee52332fdc81b9c8d5cb09b3d5803342127d"
        },
        "date": 1776591226956,
        "tool": "cargo",
        "benches": [
          {
            "name": "full_pipeline/5",
            "value": 47444,
            "range": "± 595",
            "unit": "ns/iter"
          },
          {
            "name": "full_pipeline/50",
            "value": 406568,
            "range": "± 1035",
            "unit": "ns/iter"
          },
          {
            "name": "full_pipeline/200",
            "value": 1864453,
            "range": "± 62209",
            "unit": "ns/iter"
          },
          {
            "name": "full_pipeline/1000",
            "value": 17370622,
            "range": "± 734045",
            "unit": "ns/iter"
          },
          {
            "name": "detector_evaluate_single",
            "value": 642,
            "range": "± 9",
            "unit": "ns/iter"
          },
          {
            "name": "policy_evaluate_single",
            "value": 224,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "throughput/1000_samples",
            "value": 17372554,
            "range": "± 68599",
            "unit": "ns/iter"
          },
          {
            "name": "search_500_events",
            "value": 114522,
            "range": "± 1599",
            "unit": "ns/iter"
          },
          {
            "name": "hunt_field_query",
            "value": 93704,
            "range": "± 1300",
            "unit": "ns/iter"
          },
          {
            "name": "ml_triage_rf",
            "value": 55,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "sigma_evaluate_20_rules",
            "value": 33820,
            "range": "± 224",
            "unit": "ns/iter"
          }
        ]
      }
    ]
  }
}