import { useLibraryStore } from "../../store/library";
import { formatKey } from "../../utils/camelot";
import { cn } from "../../utils/cn";

interface Props {
  camelot: string | null;
  standard: string | null;
  size?: "sm" | "md";
}

export function KeyBadge({ camelot, standard, size = "sm" }: Props) {
  const notation = useLibraryStore((s) => s.keyNotation);
  const key = formatKey(camelot, standard, notation);

  const isMinor = camelot?.endsWith("A") ?? false;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-mono font-semibold",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        isMinor
          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
          : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
      )}
    >
      {key}
    </span>
  );
}
