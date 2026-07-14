import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

function makeIcon(children: ReactNode, filled = false) {
  return function Icon({ size = 15, className }: IconProps) {
    return (
      <svg
        className={className ? `ic ${className}` : 'ic'}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    );
  };
}

/** 층수 — 쌓인 탑 */
export const IcFloor = makeIcon(
  <>
    <rect x="4" y="15" width="16" height="5" rx="1" />
    <rect x="6.5" y="9" width="11" height="6" rx="1" />
    <rect x="9" y="4" width="6" height="5" rx="1" />
  </>,
);

export const IcTrophy = makeIcon(
  <>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
    <path d="M8 5H5a3 3 0 0 0 3 4" />
    <path d="M16 5h3a3 3 0 0 1-3 4" />
    <path d="M12 13v3" />
    <path d="M9 20h6l-.8-4h-4.4L9 20z" />
  </>,
);

export const IcLock = makeIcon(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
);

export const IcSpark = makeIcon(
  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />,
);

export const IcSoundOn = makeIcon(
  <>
    <path d="M4 10v4h3l5 4V6l-5 4H4z" />
    <path d="M15.5 9.5a4 4 0 0 1 0 5" />
    <path d="M18 7a8 8 0 0 1 0 10" />
  </>,
);

export const IcSoundOff = makeIcon(
  <>
    <path d="M4 10v4h3l5 4V6l-5 4H4z" />
    <path d="M16 9.5l5 5" />
    <path d="M21 9.5l-5 5" />
  </>,
);

export const IcDrop = makeIcon(
  <>
    <path d="M12 4v13" />
    <path d="M6 12l6 6 6-6" />
  </>,
);

export const IcRestart = makeIcon(
  <>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3" />
    <path d="M3.5 4v5h5" />
  </>,
);

export const IcHome = makeIcon(
  <>
    <path d="M4 11l8-7 8 7" />
    <path d="M6.5 9.5V20h11V9.5" />
  </>,
);

export const IcCopy = makeIcon(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </>,
);

export const IcBook = makeIcon(
  <>
    <path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" />
    <path d="M20 19H6" />
  </>,
);

export const IcPlay = makeIcon(<path d="M8 5l11 7-11 7V5z" />, true);

export const IcFlag = makeIcon(
  <>
    <path d="M5.5 21V4" />
    <path d="M5.5 4h11l-2.5 4 2.5 4h-11" />
  </>,
);
