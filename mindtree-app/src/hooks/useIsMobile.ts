import { useEffect, useState } from 'react';

const MQ = '(max-width: 768px)';

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MQ).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MQ);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return mobile;
}
