interface AppIconProps {
  className?: string;
  size?: number;
}

export function AppIcon({ className, size = 32 }: AppIconProps) {
  return (
    <svg
      viewBox="0 0 406.45 406.45"
      className={className}
      style={{ width: size, height: size }}
      fill="none"
    >
      <rect width="406.45" height="406.45" rx="51.1" fill="#011109" />
      <polygon
        fill="#3ecf8e"
        points="294.29 121.87 251.83 164.33 251.77 164.39 171.18 164.39 195.58 188.79 153.04 231.33 104.96 183.25 86.31 164.61 86.31 104.39 191.89 104.39 187.85 100.35 230.31 57.89 294.29 121.87"
      />
      <polygon
        fill="#3ecf8e"
        points="320.14 238.58 320.14 298.81 214.58 298.81 221.97 306.2 179.6 348.57 129.83 298.81 128.58 297.55 112.69 281.66 155.06 239.29 155.54 238.81 235.52 238.81 211.42 214.71 216.46 209.68 253.85 172.29 304.87 223.31 320.14 238.58"
      />
    </svg>
  );
}
