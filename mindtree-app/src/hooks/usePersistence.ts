import { useEffect, useState } from 'react';
import { useThoughtStore } from '../store/useThoughtStore';
import { loadAllMaps, saveMap } from '../lib/db';

export function usePersistence() {
  const map = useThoughtStore((s) => s.map);
  const setMap = useThoughtStore((s) => s.setMap);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadAllMaps()
      .then((maps) => {
        if (cancelled) return;
        if (maps.length > 0) {
          setMap(maps[0]);
        }
      })
      .catch(() => {
        /* IndexedDB unavailable — keep in-memory map */
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [setMap]);

  useEffect(() => {
    if (!hydrated) return;

    const timer = setTimeout(() => {
      saveMap(map).catch(() => {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [map, hydrated]);
}
