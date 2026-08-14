import { cn } from "@/lib/utils";

const SIZES = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-10 w-10 border-[3px]" };

export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="loading"
      className={cn(
        "inline-block animate-spin rounded-full border-primary-600 border-r-transparent dark:border-primary-400 dark:border-r-transparent",
        SIZES[size],
        className
      )}
    />
  );
}
