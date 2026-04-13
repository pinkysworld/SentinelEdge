import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, RoleProvider, ThemeProvider, ToastProvider } from '../hooks.jsx';
import App from '../App.jsx';

// Stub fetch globally
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch.mockReset();
  localStorage.clear();
  // Default stub: return empty JSON for any api call
  global.fetch.mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: async () => ({}),
  });
});

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ThemeProvider>
        <AuthProvider>
          <RoleProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </RoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('renders without crashing', () => {
    renderApp();
    // App should render the sidebar brand
    expect(screen.getByText('Wardex')).toBeInTheDocument();
  });

  it('shows auth form when unauthenticated', () => {
    renderApp();
    // Should show the Connect button
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('renders sidebar navigation items', () => {
    renderApp();
    // Check that navigation labels exist
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
  });

  it('disables Connect button when token input is empty', () => {
    renderApp();
    const btn = screen.getByText('Connect');
    expect(btn).toBeDisabled();
  });

  it('enables Connect button when token is entered', async () => {
    renderApp();
    const input = screen.getByPlaceholderText('API token');
    await userEvent.type(input, 'my-secret-token');
    expect(screen.getByText('Connect')).not.toBeDisabled();
  });

  it('shows auth error on failed connection', async () => {
    global.fetch.mockImplementation(() => Promise.resolve({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: { get: () => null },
      json: async () => ({}),
      text: async () => '{"error":"unauthorized"}',
    }));
    renderApp();
    const input = screen.getByPlaceholderText('API token');
    await userEvent.type(input, 'bad-token');
    await userEvent.click(screen.getByText('Connect'));
    await waitFor(() => {
      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays skip-to-content link for accessibility', () => {
    renderApp();
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('renders theme toggle button', () => {
    renderApp();
    const themeBtn = screen.getByTitle(/mode/i);
    expect(themeBtn).toBeInTheDocument();
  });

  it('navigates to unknown route and redirects to /', () => {
    renderApp('/nonexistent');
    // Should redirect to dashboard
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
  });

  it('renders welcome message when unauthenticated', () => {
    renderApp();
    expect(screen.getByText('Welcome to Wardex Admin Console')).toBeInTheDocument();
  });
});
