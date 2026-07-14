import { useEffect, useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { IcFlag } from './icons';

export function Toast() {
  const s = useGameStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!s.toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(t);
  }, [s.toast]);

  if (!s.toast || !visible) return null;
  return (
    <div className="toast" key={s.toast.id}>
      <IcFlag />
      {s.toast.text}
    </div>
  );
}
