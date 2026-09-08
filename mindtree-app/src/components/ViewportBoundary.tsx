import { useEffect } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';

/** viewport.x 상한 — 이보다 오른쪽(양수)으로 pan 하면 왼쪽 빈 공간이 보임 */
const LEFT_CLAMP = 28;

type Props = {
  /** 루트 접힘(중앙 배치)일 때는 클램프 완화 */
  relaxed?: boolean;
};

export default function ViewportBoundary({ relaxed = false }: Props) {
  const { setViewport } = useReactFlow();
  const transform = useStore((s) => s.transform);

  useEffect(() => {
    if (relaxed) return;
    const [x, y, zoom] = transform;
    if (x > LEFT_CLAMP) {
      setViewport({ x: LEFT_CLAMP, y, zoom });
    }
  }, [transform, setViewport, relaxed]);

  return null;
}
