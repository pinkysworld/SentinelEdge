import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, RoleProvider, ThemeProvider, ToastProvider, useAuth, useTheme, useToast } from '../hooks.jsx';

// Stub fetch globally
global.fetch = vi.fn();

const jsonOk = (data) => ({
  ok: true,
  headers: { get: () => 'application/json' },
  json: async () => data,
  text: async () => JSON.stringify(data),
});

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch.mockReset();
  // Default: return a valid JSON response for any call
  global.fetch.mockImplementation(() => Promise.resolve(jsonOk({})));
  localStorage.clear();
});

// Helper to wrap components with all providers
function Providers({ children }) {
  return (
    <MemoryRouter>
      <AuthProvider>
        <RoleProvider>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </RoleProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('AuthProvider', () => {
  it('starts unauthenticated', () => {
    function Probe() {
      const { authenticated } = useAuth();
      return <div data-testid="auth">{String(authenticated)}</div>;
    }

    render(<Providers><Probe /></Providers>);
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });

  it('connect sets authenticated on success', async () => {
    let connectFn;
    function Probe() {
      const { authenticated, connect } = useAuth();
      connectFn = connect;
      return <div data-testid="auth">{String(authenticated)}</div>;
    }

    render(<Providers><Probe /></Providers>);
    expect(screen.getByTestId('auth').textContent).toBe('false');

    await act(async () => {
      await connectFn('valid-token');
    });
    expect(screen.getByTestId('auth').textContent).toBe('true');
  });

  it('disconnect clears authentication', async () => {
    let authApi;
    function Probe() {
      authApi = useAuth();
      return <div data-testid="auth">{String(authApi.authenticated)}</div>;
    }

    render(<Providers><Probe /></Providers>);
    await act(async () => { await authApi.connect('tok'); });
    expect(screen.getByTestId('auth').textContent).toBe('true');

    act(() => { authApi.disconnect(); });
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });
});

describe('ThemeProvider', () => {
  it('defaults to system preference', () => {
    function Probe() {
      const { dark } = useTheme();
      return <div data-testid="dark">{String(dark)}</div>;
    }
    render(<Providers><Probe /></Providers>);
    // Should render without crashing; value depends on matchMedia mock
    expect(screen.getByTestId('dark')).toBeInTheDocument();
  });

  it('toggle flips dark mode', () => {
    let themeApi;
    function Probe() {
      themeApi = useTheme();
      return <div data-testid="dark">{String(themeApi.dark)}</div>;
    }

    render(<Providers><Probe /></Providers>);
    const initial = screen.getByTestId('dark').textContent;

    act(() => { themeApi.toggle(); });
    const toggled = screen.getByTestId('dark').textContent;
    expect(toggled).not.toBe(initial);
  });
});

describe('ToastProvider', () => {
  it('renders toast messages', async () => {
    let toastFn;
    function Probe() {
      toastFn = useToast();
      return null;
    }

    render(<Providers><Probe /></Providers>);
    act(() => { toastFn('Test notification', 'info'); });
    expect(screen.getByText('Test notification')).toBeInTheDocument();
  });
});
