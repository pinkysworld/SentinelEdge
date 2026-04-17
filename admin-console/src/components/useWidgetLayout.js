import { useState, useEffect, useCallback } from 'react';

export function useWidgetLayout(defaultOrder, storageKey = 'wardex_widget_layout') {
  const [order, setOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const missing = defaultOrder.filter((id) => !parsed.includes(id));
          return missing.length > 0 ? [...parsed, ...missing] : parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return defaultOrder;
  });

  const [hidden, setHidden] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey + '_hidden');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {
      /* ignore */
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(order));
  }, [order, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey + '_hidden', JSON.stringify([...hidden]));
  }, [hidden, storageKey]);

  const moveWidget = useCallback((fromId, toId) => {
    setOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx = next.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      return next;
    });
  }, []);

  const removeWidget = useCallback((id) => {
    setHidden((prev) => new Set([...prev, id]));
  }, []);

  const restoreWidget = useCallback((id) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setOrder(defaultOrder);
    setHidden(new Set());
  }, [defaultOrder]);

  const visibleWidgets = order.filter((id) => !hidden.has(id));

  return { order: visibleWidgets, hidden, moveWidget, removeWidget, restoreWidget, resetLayout };
}