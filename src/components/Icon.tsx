// Ícones de traço fino no estilo SF Symbols (stroke 1.75, cantos arredondados).
const paths: Record<string, string> = {
  today: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  diet: 'M12 21c-4.4 0-7-3.4-7-7.5C5 9 8 6 12 6s7 3 7 7.5c0 4.1-2.6 7.5-7 7.5zM12 6c0-1.7 1-3 2.5-3.5',
  chart: 'M4 19h16M6 15l4-4 3 3 5-6',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  down: 'M6 9l6 6 6-6',
  x: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  drop: 'M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z',
  play: 'M8 5.5v13l10.5-6.5L8 5.5z',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  copy: 'M9 9h11v11H9V9zM5 15H4V4h11v1',
  info: 'M12 11v6M12 7.5v.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  alarm: 'M12 9v4l2.5 1.5M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM4 4l3 2M20 4l-3 2',
  walk: 'M13 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM9 21l2-6 2 2v5M7 12l3-4 3 1 2 3h3M11 15l-1-5',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  cart: 'M4 4h2l2.5 11h10L21 7H7M10 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  flame: 'M12 21c-3.9 0-6-2.7-6-6 0-3.5 3-5.5 3-9 2 1 3.5 3 4 5 1-1 1.5-2 1.5-3.5C17 9 18 11.5 18 15c0 3.3-2.1 6-6 6z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.5v1',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM9 9a3 3 0 0 1 6 0M12 9l1-1.5',
  ruler: 'M3 16.5L16.5 3 21 7.5 7.5 21 3 16.5zM7 12.5l1.5 1.5M10 9.5l1.5 1.5M13 6.5l1.5 1.5',
  shake: 'M7 8h10l-1.5 12h-7L7 8zM6 8h12M12 8V3l3-1',
  bed: 'M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, className = '', strokeWidth = 1.75 }: { name: IconName | string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.info} />
    </svg>
  );
}
