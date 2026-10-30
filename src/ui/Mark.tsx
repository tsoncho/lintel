export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="7" width="24" height="3.6" />
      <rect x="7.2" y="10.6" width="3" height="14" />
      <rect x="21.8" y="10.6" width="3" height="14" />
    </svg>
  );
}
