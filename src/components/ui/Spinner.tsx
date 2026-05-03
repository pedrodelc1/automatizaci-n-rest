import { clsx } from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "border-2 border-current border-t-transparent rounded-full animate-spin",
        className ?? "w-5 h-5"
      )}
    />
  );
}
