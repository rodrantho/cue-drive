import { cn } from "../../utils/cn";
import type { EnergyLevel } from "../../types";

const ENERGY_COLORS: Record<EnergyLevel, string> = {
  1: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  2: "bg-green-500/20 text-green-300 border-green-500/30",
  3: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  4: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  5: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ENERGY_LABELS: Record<EnergyLevel, string> = {
  1: "Warm-up",
  2: "Low",
  3: "Mid",
  4: "High",
  5: "Peak",
};

interface Props {
  energy: EnergyLevel | null;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function EnergyBadge({ energy, showLabel = false, size = "sm" }: Props) {
  if (!energy) return <span className="text-[var(--color-text-muted)] text-xs">—</span>;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        ENERGY_COLORS[energy]
      )}
    >
      <span>{energy}</span>
      {showLabel && <span>{ENERGY_LABELS[energy]}</span>}
    </span>
  );
}
