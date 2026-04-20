import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from '../components/Settings.jsx';
import { ToastProvider } from '../hooks.jsx';

const jsonOk = (data) => ({
  ok: true,
  status: 200,
  headers: { get: (header) => (header === 'content-type' ? 'application/json' : null) },
  json: async () => data,
  text: async () => JSON.stringify(data),
});

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:wardex-audit');
    globalThis.URL.revokeObjectURL = vi.fn();
    globalThis.fetch = vi.fn((url) => {
      const parsed = new URL(String(url), 'http://localhost');
      const path = parsed.pathname;
      const params = parsed.searchParams;

      if (path === '/api/idp/providers') {
        return Promise.resolve(
          jsonOk({
            providers: [
              {
                id: 'idp-1',
                display_name: 'Corporate SSO',
                kind: 'oidc',
                enabled: true,
                validation: {
                  status: 'warning',
                  issues: [
                    {
                      level: 'warning',
                      field: 'group_role_mappings',
                      message:
                        'No group-to-role mappings configured; users may fall back to viewer access.',
                    },
                  ],
                  mapping_count: 0,
                },
              },
            ],
            count: 1,
            healthy: 0,
          }),
        );
      }
      if (path === '/api/scim/config') {
        return Promise.resolve(
          jsonOk({
            config: {
              enabled: true,
              base_url: 'https://scim.example.com',
              provisioning_mode: 'automatic',
              default_role: 'admin',
              group_role_mappings: { Security: 'admin' },
              status: 'configured',
            },
            validation: {
              status: 'warning',
              issues: [
                {
                  level: 'warning',
                  field: 'default_role',
                  message:
                    'Default role is admin; review whether all newly provisioned users should be privileged.',
                },
              ],
              mapping_count: 1,
            },
          }),
        );
      }
      if (
        path === '/api/audit/log' &&
        params.get('limit') === '25' &&
        params.get('offset') === '0' &&
        !params.get('q') &&
        !params.get('method') &&
        !params.get('status') &&
        !params.get('auth')
      ) {
        return Promise.resolve(
          jsonOk({
            entries: [
              {
                timestamp: '2026-04-20T10:15:00Z',
                method: 'GET',
                path: '/api/platform',
                source_ip: '127.0.0.1',
                status_code: 200,
                auth_used: true,
              },
            ],
            total: 26,
            offset: 0,
            limit: 25,
            count: 1,
            has_more: true,
          }),
        );
      }
      if (
        path === '/api/audit/log' &&
        params.get('limit') === '25' &&
        params.get('offset') === '25' &&
        !params.get('q') &&
        !params.get('method') &&
        !params.get('status') &&
        !params.get('auth')
      ) {
        return Promise.resolve(
          jsonOk({
            entries: [
              {
                timestamp: '2026-04-19T08:00:00Z',
                method: 'POST',
                path: '/api/status',
                source_ip: '10.0.0.5',
                status_code: 500,
                auth_used: false,
              },
            ],
            total: 26,
            offset: 25,
            limit: 25,
            count: 1,
            has_more: false,
          }),
        );
      }
      if (
        path === '/api/audit/log' &&
        params.get('limit') === '25' &&
        params.get('offset') === '0' &&
        params.get('q') === 'alerts' &&
        params.get('method') === 'POST' &&
        params.get('status') === '2xx' &&
        params.get('auth') === 'authenticated'
      ) {
        return Promise.resolve(
          jsonOk({
            entries: [
              {
                timestamp: '2026-04-20T10:17:00Z',
                method: 'POST',
                path: '/api/alerts/sample',
                source_ip: '127.0.0.1',
                status_code: 200,
                auth_used: true,
              },
            ],
            total: 1,
            offset: 0,
            limit: 25,
            count: 1,
            has_more: false,
          }),
        );
      }
      if (
        path === '/api/audit/log/export' &&
        params.get('q') === 'alerts' &&
        params.get('method') === 'POST' &&
        params.get('status') === '2xx' &&
        params.get('auth') === 'authenticated'
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: (header) => (header === 'content-type' ? 'text/csv; charset=utf-8' : null) },
          text: async () =>
            'timestamp,method,path,source_ip,status_code,auth_state\n"\'2026-04-20T10:17:00Z","\'POST","\'/api/alerts/sample","\'127.0.0.1",200,"\'authenticated"\n',
        });
      }
      return Promise.resolve(jsonOk({}));
    });
  });

  it('renders paginated audit entries on the admin tab', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <Settings />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Admin' }));

    expect(await screen.findByText('API Audit Trail')).toBeInTheDocument();
    expect(await screen.findByText('/api/platform')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-1 of 26 entries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Newer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Older' })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Older' }));

    const statusCell = await screen.findByText('/api/status');
    const statusRow = statusCell.closest('tr');
    expect(statusRow).not.toBeNull();
    expect(screen.getByText('Showing 26-26 of 26 entries')).toBeInTheDocument();
    expect(within(statusRow).getByText('Anonymous')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Newer' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Older' })).toBeDisabled();

    await waitFor(() => {
      expect(
        globalThis.fetch.mock.calls.some(
          ([url]) => String(url) === '/api/audit/log?limit=25&offset=25',
        ),
      ).toBe(true);
    });
  });

  it('filters the audit trail and exports the filtered csv', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <Settings />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Admin' }));
    await screen.findByText('API Audit Trail');

    await user.type(screen.getByLabelText('Search'), 'alerts');
    await user.selectOptions(screen.getByLabelText('Method'), 'POST');
    await user.selectOptions(screen.getByLabelText('Status'), '2xx');
    await user.selectOptions(screen.getByLabelText('Auth'), 'authenticated');

    expect(await screen.findByText('/api/alerts/sample')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-1 of 1 entries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(
        globalThis.fetch.mock.calls.some(
          ([url]) =>
            String(url) ===
            '/api/audit/log/export?q=alerts&method=POST&status=2xx&auth=authenticated',
        ),
      ).toBe(true);
    });
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it('surfaces identity validation state on the integrations tab', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <Settings />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Integrations' }));

    const idpCard = (await screen.findByText('IdP Providers')).closest('.card');
    expect(idpCard).not.toBeNull();

    const providerCell = within(idpCard).getByRole('cell', { name: 'Corporate SSO' });
    const providerRow = providerCell.closest('tr');
    expect(providerRow).not.toBeNull();
    expect(within(providerRow).getByText('OIDC')).toBeInTheDocument();
    expect(within(providerRow).getByText('Review')).toBeInTheDocument();
    expect(within(providerRow).getByText('1 issue • 0 mappings')).toBeInTheDocument();
    expect(
      screen.getByText('No group-to-role mappings configured; users may fall back to viewer access.'),
    ).toBeInTheDocument();

    const scimCard = screen.getByText('SCIM Config').closest('.card');
    expect(scimCard).not.toBeNull();
    expect(within(scimCard).getByText('Review')).toBeInTheDocument();
    expect(within(scimCard).getByText('1 group mapping configured')).toBeInTheDocument();
    expect(
      Array.from(scimCard.querySelectorAll('.stat-box')).some((node) =>
        node.textContent?.includes(
          'Default role is admin; review whether all newly provisioned users should be privileged.',
        ),
      ),
    ).toBe(true);

    await waitFor(() => {
      expect(
        globalThis.fetch.mock.calls.some(([url]) => String(url) === '/api/idp/providers'),
      ).toBe(true);
      expect(
        globalThis.fetch.mock.calls.some(([url]) => String(url) === '/api/scim/config'),
      ).toBe(true);
    });
  });
});