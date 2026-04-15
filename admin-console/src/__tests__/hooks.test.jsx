import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, RoleProvider, ThemeProvider, ToastProvider, useAuth, useTheme, useToast, useWebSocket } from '../hooks.jsx';

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

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useRealTimers();
    delete global.WebSocket;
  });

  function WebSocketProbe({ interval = 2000 }) {
    const { connected, events } = useWebSocket(interval);
    return (
      <>
        <div data-testid="ws-connected">{String(connected)}</div>
        <div data-testid="ws-events">{String(events.length)}</div>
      </>
    );
  }

  it('falls back to polling only once when websocket connection fails before open', async () => {
    vi.useFakeTimers();
    const sockets = [];

    global.WebSocket = class MockWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 0;
        sockets.push(this);
      }
      close() {
        this.readyState = 3;
        this.onclose?.();
      }
      emitError() {
        this.onerror?.(new Event('error'));
      }
    };

    global.fetch.mockImplementation((url) => {
      if (url === '/api/ws/connect') return Promise.resolve(jsonOk({ subscriber_id: 7 }));
      if (url === '/api/ws/disconnect') return Promise.resolve(jsonOk({ ok: true }));
      if (url === '/api/ws/poll') return Promise.resolve(jsonOk([]));
      return Promise.resolve(jsonOk({}));
    });

    render(<WebSocketProbe interval={10_000} />);
    expect(sockets).toHaveLength(1);

    act(() => {
      sockets[0].emitError();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    const connectCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/ws/connect');
    expect(connectCalls).toHaveLength(1);
  });

  it('falls back to polling after a later websocket reconnect failure', async () => {
    vi.useFakeTimers();
    const sockets = [];

    global.WebSocket = class MockWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 0;
        sockets.push(this);
      }
      close() {
        this.readyState = 3;
        this.onclose?.();
      }
      emitOpen() {
        this.readyState = 1;
        this.onopen?.();
      }
      emitError() {
        this.onerror?.(new Event('error'));
      }
    };

    global.fetch.mockImplementation((url) => {
      if (url === '/api/ws/connect') return Promise.resolve(jsonOk({ subscriber_id: 9 }));
      if (url === '/api/ws/disconnect') return Promise.resolve(jsonOk({ ok: true }));
      if (url === '/api/ws/poll') return Promise.resolve(jsonOk([]));
      return Promise.resolve(jsonOk({}));
    });

    render(<WebSocketProbe interval={10_000} />);
    expect(sockets).toHaveLength(1);

    act(() => {
      sockets[0].emitOpen();
    });
    expect(screen.getByTestId('ws-connected').textContent).toBe('true');

    act(() => {
      sockets[0].close();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(sockets).toHaveLength(2);

    act(() => {
      sockets[1].emitError();
    });

    await act(async () => {
      await Promise.resolve();
    });

    const connectCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/ws/connect');
    expect(connectCalls).toHaveLength(1);
  });

  it('releases a polling subscriber when the component unmounts during connect', async () => {
    vi.useFakeTimers();
    const sockets = [];
    let resolveConnect;

    global.WebSocket = class MockWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 0;
        sockets.push(this);
      }
      close() {
        this.readyState = 3;
        this.onclose?.();
      }
      emitError() {
        this.onerror?.(new Event('error'));
      }
    };

    global.fetch.mockImplementation((url) => {
      if (url === '/api/ws/connect') {
        return new Promise((resolve) => {
          resolveConnect = () => resolve(jsonOk({ subscriber_id: 11 }));
        });
      }
      if (url === '/api/ws/disconnect') return Promise.resolve(jsonOk({ ok: true }));
      if (url === '/api/ws/poll') return Promise.resolve(jsonOk([]));
      return Promise.resolve(jsonOk({}));
    });

    const view = render(<WebSocketProbe interval={10_000} />);
    expect(sockets).toHaveLength(1);

    act(() => {
      sockets[0].emitError();
    });

    view.unmount();

    await act(async () => {
      resolveConnect();
      await Promise.resolve();
    });

    const disconnectCalls = global.fetch.mock.calls.filter(([url]) => url === '/api/ws/disconnect');
    expect(disconnectCalls).toHaveLength(1);
  });
});
