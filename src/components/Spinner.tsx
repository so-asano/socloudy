import { Cloud } from "lucide-react";

/** Loading indicator shaped like a cloud — gently bobs/pulses instead of spinning. */
export function Spinner({ className = "text-sky" }: { className?: string }) {
  return (
    <Cloud
      className={`size-7 cloud-bob ${className}`}
      fill="currentColor"
      role="status"
      aria-label="読み込み中"
    />
  );
}
