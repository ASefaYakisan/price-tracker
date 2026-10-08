export function BellIcon({ filled = false, className = "size-4" }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M10 3a4.5 4.5 0 0 0-4.5 4.5c0 3.2-1.3 4.8-2 5.5h13c-.7-.7-2-2.3-2-5.5A4.5 4.5 0 0 0 10 3z" strokeLinejoin="round" />
      <path d="M8.3 16a1.8 1.8 0 0 0 3.4 0" strokeLinecap="round" />
    </svg>
  );
}
