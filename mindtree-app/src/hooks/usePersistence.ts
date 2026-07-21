import { useEffect } from 'react';
import { useThoughtStore } from '../store/useThoughtStore';
import { loadAllMaps, saveMap } from '../lib/db';

export function usePersistence() {
  const map = useThoughtStore((s) => s.map);
  const setMap = useThoughtStore((s) => s.setMap);

  useEffect(() => {
    loadAllMaps().then((maps) => {
      if (maps.length > 0) {
        setMap(maps[0]);
      }
    });
  }, [setMap]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveMap(map).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [map]);
}
