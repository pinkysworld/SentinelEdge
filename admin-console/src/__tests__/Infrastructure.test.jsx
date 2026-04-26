import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Infrastructure from '../components/Infrastructure.jsx';
import { ToastProvider } from '../hooks.jsx';

const jsonOk = (data) => ({
  ok: true,
  status: 200,
  headers: { get: (header) => (header === 'content-type' ? 'application/json' : null) },
  json: async () => data,
  text: async () => JSON.stringify(data),
});

function renderInfrastructure(route = '/infrastructure') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <Infrastructure />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let review = {
      id: 'review-1',
      title: 'Review suspicious binary quarantine',
      asset_id: 'host-a:/tmp/dropper',
      change_type: 'malware_containment',
      source: 'malware-verdict',
      summary: 'Validate blast radius before quarantine.',
      risk: 'high',
      approval_status: 'pending_review',
      recovery_status: 'not_started',
      requested_by: 'admin',
      requested_at: '2026-04-26T08:00:00Z',
      required_approvers: 1,
      approvals: [],
      evidence: { path: '/tmp/dropper' },
    };

    globalThis.fetch = vi.fn((url, options = {}) => {
      const parsed = new URL(String(url), 'http://localhost');
      const path = parsed.pathname;
      const method = options.method || 'GET';

      if (path === '/api/remediation/change-reviews' && method === 'GET') {
        return Promise.resolve(
          jsonOk({
            summary: {
              total: 1,
              pending: review.approval_status === 'pending_review' ? 1 : 0,
              approved: review.approval_status === 'approved' ? 1 : 0,
              recovery_ready: ['ready', 'verified'].includes(review.recovery_status) ? 1 : 0,
              signed: review.approval_chain_digest ? 1 : 0,
              rollback_proofs: review.rollback_proof ? 1 : 0,
            },
            reviews: [review],
          }),
        );
      }

      if (path === '/api/remediation/change-reviews/review-1/approval' && method === 'POST') {
        review = {
          ...review,
          approval_status: 'approved',
          recovery_status: 'ready',
          approvals: [{ approver: 'admin', decision: 'approve', signature: 'sig-1' }],
          approval_chain_digest: 'chain-digest-1234567890',
          rollback_proof: {
            proof_id: 'rollback-proof-123456',
            status: 'ready',
            recovery_plan: ['Capture pre-change state for host-a:/tmp/dropper'],
          },
        };
        return Promise.resolve(jsonOk({ status: 'approved', review }));
      }

      if (path === '/api/remediation/change-reviews/review-1/rollback' && method === 'POST') {
        review = {
          ...review,
          recovery_status: 'verified',
          rollback_proof: {
            ...review.rollback_proof,
            status: 'dry_run_verified',
            execution_result: { dry_run: true, commands: [{ program: 'cp' }] },
          },
        };
        return Promise.resolve(jsonOk({ status: 'rollback_recorded', review }));
      }

      const defaults = {
        '/api/monitor/status': { status: 'ok' },
        '/api/threads/status': { threads: [] },
        '/api/slo/status': { status: 'ok' },
        '/api/system/health/dependencies': { dependencies: [] },
        '/api/ndr/report': { alerts: [] },
        '/api/drift/status': { changes: [] },
        '/api/vulnerability/summary': { findings: [] },
        '/api/container/stats': { containers: [] },
        '/api/certs/summary': { certificates: [] },
        '/api/certs/alerts': { alerts: [] },
        '/api/assets/summary': { assets: [] },
        '/api/malware/stats': { total_scans: 0 },
        '/api/malware/recent': { recent: [] },
        '/api/compliance/summary': { frameworks: [] },
        '/api/analytics': { endpoints: [] },
        '/api/traces': { traces: [] },
      };
      return Promise.resolve(jsonOk(defaults[path] || {}));
    });
  });

  it('records signed approval and verifies rollback proof from the overview', async () => {
    const user = userEvent.setup();
    renderInfrastructure();

    expect(await screen.findByText('Change Review & Recovery')).toBeInTheDocument();
    expect(screen.getByText('Review suspicious binary quarantine')).toBeInTheDocument();
    expect(screen.getByText('0/1 approvals')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign Approval' }));

    expect(await screen.findByText(/Chain chain-digest/)).toBeInTheDocument();
    expect(screen.getByText(/rollback-proof-123456/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify Rollback' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Verify Rollback' }));

    await waitFor(() => {
      expect(
        globalThis.fetch.mock.calls.some(
          ([url, options]) =>
            String(url) === '/api/remediation/change-reviews/review-1/rollback' &&
            (options?.method || 'GET') === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('cancels live rollback when the typed hostname does not match', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.fn().mockReturnValue('not-the-host');
    const originalPrompt = window.prompt;
    window.prompt = promptSpy;
    renderInfrastructure();

    expect(await screen.findByText('Change Review & Recovery')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign Approval' }));
    await user.click(screen.getByRole('button', { name: 'Verify Rollback' }));

    const liveButton = await screen.findByRole('button', { name: /Live Rollback/ });
    await user.click(liveButton);

    expect(promptSpy).toHaveBeenCalled();
    const liveCalls = globalThis.fetch.mock.calls.filter(
      ([url, options]) =>
        String(url) === '/api/remediation/change-reviews/review-1/rollback' &&
        (options?.method || 'GET') === 'POST' &&
        typeof options?.body === 'string' &&
        options.body.includes('"dry_run":false'),
    );
    expect(liveCalls).toHaveLength(0);
    window.prompt = originalPrompt;
  });

  it('submits a live rollback when the operator types the matching hostname', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.fn().mockReturnValue('host-a:/tmp/dropper');
    const originalPrompt = window.prompt;
    window.prompt = promptSpy;
    renderInfrastructure();

    expect(await screen.findByText('Change Review & Recovery')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign Approval' }));
    await user.click(screen.getByRole('button', { name: 'Verify Rollback' }));

    const liveButton = await screen.findByRole('button', { name: /Live Rollback/ });
    await user.click(liveButton);

    await waitFor(() => {
      const liveCalls = globalThis.fetch.mock.calls.filter(
        ([url, options]) =>
          String(url) === '/api/remediation/change-reviews/review-1/rollback' &&
          (options?.method || 'GET') === 'POST' &&
          typeof options?.body === 'string' &&
          options.body.includes('"dry_run":false') &&
          options.body.includes('"confirm_hostname":"host-a:/tmp/dropper"'),
      );
      expect(liveCalls.length).toBeGreaterThanOrEqual(1);
    });
    window.prompt = originalPrompt;
  });
});
