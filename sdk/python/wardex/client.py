"""Wardex REST API client."""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import urljoin

import requests

from wardex.exceptions import (
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ServerError,
    WardexError,
)

MAX_BATCH_SIZE = 10_000


class WardexClient:
    """Synchronous client for the Wardex REST API.

    Parameters
    ----------
    base_url : str
        Wardex server URL, e.g. ``"https://wardex.example.com"``.
    token : str | None
        Bearer token.  If omitted, call :meth:`login` first.
    timeout : float
        Default request timeout in seconds.
    verify : bool
        Whether to verify TLS certificates.

    Use as a context manager to ensure the underlying session is closed::

        with WardexClient("https://wardex.local", token="...") as wdx:
            wdx.status()
    """

    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        timeout: float = 30.0,
        verify: bool = True,
    ):
        self._base = base_url.rstrip("/")
        self._token = token
        self._timeout = timeout
        self._session = requests.Session()
        self._session.verify = verify
        if token:
            self._session.headers["Authorization"] = f"Bearer {token}"

    # ── context manager ───────────────────────────────────────────────────

    def __enter__(self) -> WardexClient:
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()

    def close(self) -> None:
        """Close the underlying HTTP session."""
        self._session.close()

    # ── helpers ───────────────────────────────────────────────────────────

    def _url(self, path: str) -> str:
        return f"{self._base}{path}"

    @staticmethod
    def _is_json(resp: requests.Response) -> bool:
        ct = resp.headers.get("content-type", "")
        return ct.split(";")[0].strip().lower() == "application/json"

    def _raise_for_status(self, resp: requests.Response) -> None:
        if resp.ok:
            return
        body = resp.text
        code = resp.status_code
        if code in (401, 403):
            raise AuthenticationError(f"Auth error {code}", code, body)
        if code == 404:
            raise NotFoundError(f"Not found: {resp.url}", code, body)
        if code == 429:
            raise RateLimitError("Rate limit exceeded", code, body)
        if 500 <= code < 600:
            raise ServerError(f"Server error {code}", code, body)
        raise WardexError(f"HTTP {code}", code, body)

    def _request(self, method: str, path: str, *, body: Any = None, **params: Any) -> Any:
        kwargs: dict[str, Any] = {"timeout": self._timeout}
        if params:
            kwargs["params"] = params
        if body is not None:
            kwargs["json"] = body
        resp = self._session.request(method, self._url(path), **kwargs)
        self._raise_for_status(resp)
        if self._is_json(resp):
            return resp.json()
        return resp.text

    def _get(self, path: str, **params: Any) -> Any:
        return self._request("GET", path, **params)

    def _post(self, path: str, body: Any = None) -> Any:
        return self._request("POST", path, body=body)

    def _put(self, path: str, body: Any = None) -> Any:
        return self._request("PUT", path, body=body)

    def _delete(self, path: str) -> Any:
        return self._request("DELETE", path)

    # ── auth ──────────────────────────────────────────────────────────────

    def login(self, username: str, password: str) -> dict[str, Any]:
        data = self._post("/api/auth/login", {"username": username, "password": password})
        if isinstance(data, dict) and "token" in data:
            self._token = data["token"]
            self._session.headers["Authorization"] = f"Bearer {self._token}"
        return data

    def logout(self) -> Any:
        result = self._post("/api/auth/logout")
        self._token = None
        self._session.headers.pop("Authorization", None)
        return result

    def whoami(self) -> dict[str, Any]:
        return self._get("/api/auth/whoami")

    # ── status ────────────────────────────────────────────────────────────

    def status(self) -> dict[str, Any]:
        return self._get("/api/status")

    def health(self) -> dict[str, Any]:
        return self._get("/api/health")

    # ── alerts ────────────────────────────────────────────────────────────

    def list_alerts(self, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
        return self._get("/api/alerts", limit=limit, offset=offset)

    def get_alert(self, alert_id: str) -> dict[str, Any]:
        return self._get(f"/api/alerts/{alert_id}")

    def ack_alert(self, alert_id: str) -> dict[str, Any]:
        return self._post(f"/api/alerts/{alert_id}/ack")

    def resolve_alert(self, alert_id: str) -> dict[str, Any]:
        return self._post(f"/api/alerts/{alert_id}/resolve")

    # ── incidents ─────────────────────────────────────────────────────────

    def list_incidents(self, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
        return self._get("/api/incidents", limit=limit, offset=offset)

    def get_incident(self, incident_id: str) -> dict[str, Any]:
        return self._get(f"/api/incidents/{incident_id}")

    def create_incident(self, title: str, severity: str, description: str = "") -> dict[str, Any]:
        if not title or not title.strip():
            raise ValueError("title must not be empty")
        if severity not in ("low", "medium", "high", "critical"):
            raise ValueError(f"severity must be one of low/medium/high/critical, got '{severity}'")
        return self._post("/api/incidents", {
            "title": title,
            "severity": severity,
            "description": description,
        })

    def escalate(self, incident_id: str) -> dict[str, Any]:
        return self._post(f"/api/incidents/{incident_id}/escalate")

    # ── fleet ─────────────────────────────────────────────────────────────

    def list_agents(self) -> list[dict[str, Any]]:
        return self._get("/api/fleet/agents")

    def get_agent(self, agent_id: str) -> dict[str, Any]:
        return self._get(f"/api/fleet/agents/{agent_id}")

    def isolate_agent(self, agent_id: str) -> dict[str, Any]:
        return self._post(f"/api/fleet/agents/{agent_id}/isolate")

    def unisolate_agent(self, agent_id: str) -> dict[str, Any]:
        return self._post(f"/api/fleet/agents/{agent_id}/unisolate")

    # ── detection ─────────────────────────────────────────────────────────

    def run_detection(self) -> dict[str, Any]:
        return self._post("/api/detection/run")

    def get_baseline(self) -> dict[str, Any]:
        return self._get("/api/detection/baseline")

    # ── telemetry ─────────────────────────────────────────────────────────

    def ingest_event(self, event: dict[str, Any]) -> dict[str, Any]:
        return self._post("/api/telemetry/ingest", event)

    def ingest_batch(self, events: list[dict[str, Any]]) -> dict[str, Any]:
        if len(events) > MAX_BATCH_SIZE:
            raise ValueError(f"Batch size {len(events)} exceeds maximum of {MAX_BATCH_SIZE}")
        return self._post("/api/telemetry/ingest/batch", events)

    # ── policy ────────────────────────────────────────────────────────────

    def list_policies(self) -> list[dict[str, Any]]:
        return self._get("/api/policies")

    def get_policy(self, policy_id: str) -> dict[str, Any]:
        return self._get(f"/api/policies/{policy_id}")

    def update_policy(self, policy_id: str, body: dict[str, Any]) -> dict[str, Any]:
        return self._put(f"/api/policies/{policy_id}", body)

    # ── threat intel ──────────────────────────────────────────────────────

    def list_iocs(self) -> list[dict[str, Any]]:
        return self._get("/api/threat-intel/iocs")

    def add_ioc(self, ioc: dict[str, Any]) -> dict[str, Any]:
        return self._post("/api/threat-intel/iocs", ioc)

    def query_ioc(self, value: str) -> dict[str, Any]:
        return self._get("/api/threat-intel/query", value=value)

    # ── response ──────────────────────────────────────────────────────────

    def list_actions(self) -> list[dict[str, Any]]:
        return self._get("/api/response/actions")

    def execute_action(self, action: dict[str, Any]) -> dict[str, Any]:
        return self._post("/api/response/execute", action)

    # ── reports ───────────────────────────────────────────────────────────

    def list_reports(self) -> list[dict[str, Any]]:
        return self._get("/api/reports")

    def generate_report(self, report_type: str = "full") -> dict[str, Any]:
        return self._post("/api/reports/generate", {"type": report_type})

    # ── config ────────────────────────────────────────────────────────────

    def get_config(self) -> dict[str, Any]:
        return self._get("/api/config")

    def update_config(self, config: dict[str, Any]) -> dict[str, Any]:
        return self._put("/api/config", config)

    # ── metrics ───────────────────────────────────────────────────────────

    def metrics(self) -> str:
        return self._get("/api/metrics")

    # ── openapi ───────────────────────────────────────────────────────────

    def openapi_spec(self) -> dict[str, Any]:
        return self._get("/api/openapi.json")
