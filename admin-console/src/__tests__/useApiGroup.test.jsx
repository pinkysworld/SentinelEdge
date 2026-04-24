import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useApiGroup } from '../hooks.jsx';

describe('useApiGroup', () => {
  it('loads grouped requests and reloads them together', async () => {
    const siemStatus = vi.fn().mockResolvedValue({ enabled: true });
    const collectorStatus = vi.fn().mockResolvedValue({ count: 2 });

    const { result } = renderHook(() =>
      useApiGroup({
        siemStatus,
        collectorStatus,
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({
      siemStatus: { enabled: true },
      collectorStatus: { count: 2 },
    });

    siemStatus.mockResolvedValueOnce({ enabled: false });
    collectorStatus.mockResolvedValueOnce({ count: 3 });

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() =>
      expect(result.current.data).toEqual({
        siemStatus: { enabled: false },
        collectorStatus: { count: 3 },
      }),
    );

    expect(siemStatus).toHaveBeenCalledTimes(2);
    expect(collectorStatus).toHaveBeenCalledTimes(2);
  });
});
