import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AlertDrawer from '../components/AlertDrawer.jsx';
import { ToastProvider } from '../hooks.jsx';

const jsonOk = (data) => ({
  ok: true,
  status: 200,
  headers: { get: (h) => (h === 'content-type' ? 'application/json' : null) },
  json: async () => data,
  text: async () => JSON.stringify(data),
});

describe('AlertDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('/api/detection/explain')) {
        return Promise.resolve(
          jsonOk({
            summary: ['Critical alert from agent-1.'],
            why_fired: ['The detector attached credential and lateral movement reasons.'],
            why_safe_or_noisy: ['No prior analyst feedback is recorded for this event.'],
            next_steps: ['Review identity activity and isolate the source if confirmed.'],
            entity_scores: [
              {
                entity_kind: 'host',
                entity_id: 'edge-1',
                score: 9.4,
                confidence: 0.93,
                peer_group: 'linux hosts',
                score_components: [
                  { name: 'alert_score', score: 8.4, weight: 0.55 },
                  { name: 'sequence_context', score: 0.7, weight: 0.2 },
                ],
                sequence_signals: [
                  'Credential-access precursor observed in the detection reasons.',
                ],
                graph_context: ['host:edge-1 reported the alert.'],
                recommended_pivots: ['Open host timeline for edge-1.'],
              },
            ],
          }),
        );
      }
      return Promise.resolve(jsonOk({}));
    });
  });

  it('renders server-backed entity risk scoring context', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <AlertDrawer
          alert={{
            id: 1,
            alert_id: '1',
            message: 'Credential abuse on edge-1',
            hostname: 'edge-1',
            severity: 'critical',
            score: 8.4,
            confidence: 0.93,
            category: 'credential_access',
            reasons: ['credential_dump_attempt user=alice dst=10.0.0.5 lateral_remote'],
          }}
          onClose={() => {}}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /explain this alert/i }));

    await waitFor(() => {
      expect(screen.getByText('Entity risk scoring')).toBeInTheDocument();
    });
    expect(screen.getByText(/host · edge-1/i)).toBeInTheDocument();
    expect(screen.getByText(/Peer group: linux hosts/i)).toBeInTheDocument();
    expect(screen.getByText(/alert score:/i)).toBeInTheDocument();
    expect(screen.getByText(/Credential-access precursor/i)).toBeInTheDocument();
    expect(screen.getByText(/Next pivot: Open host timeline for edge-1/i)).toBeInTheDocument();
  });
});
