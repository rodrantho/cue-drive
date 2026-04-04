import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import type { CollectionColor, SmartFilters } from "../../types";

const COLOR_MAP: Record<CollectionColor, string> = {
  purple: "#7c3aed",
  blue:   "#2563eb",
  green:  "#16a34a",
  orange: "#ea580c",
  red:    "#dc2626",
  pink:   "#db2777",
};

const COLORS: CollectionColor[] = ["purple", "blue", "green", "orange", "red", "pink"];

interface Props {
  onSubmit: (name: string, type: "manual" | "smart", color: CollectionColor, filters?: SmartFilters) => void;
  onCancel: () => void;
}

export function CreateCollectionModal({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"manual" | "smart">("manual");
  const [color, setColor] = useState<CollectionColor>("purple");

  // Smart filters state
  const [bpmMin, setBpmMin] = useState("");
  const [bpmMax, setBpmMax] = useState("");
  const [energyMin, setEnergyMin] = useState("");
  const [energyMax, setEnergyMax] = useState("");
  const [vocalFilter, setVocalFilter] = useState<"all" | "vocals" | "instrumental">("all");

  function handleSubmit() {
    if (!name.trim()) return;

    let filters: SmartFilters | undefined;
    if (type === "smart") {
      filters = {};
      if (bpmMin) filters.bpmMin = Number(bpmMin);
      if (bpmMax) filters.bpmMax = Number(bpmMax);
      if (energyMin) filters.energyMin = Number(energyMin);
      if (energyMax) filters.energyMax = Number(energyMax);
      if (vocalFilter === "vocals") filters.hasVocals = true;
      if (vocalFilter === "instrumental") filters.hasVocals = false;
    }

    onSubmit(name.trim(), type, color, filters);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-[420px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text)]">Nueva colección</h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--color-text-muted)]">Nombre</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ej: Peak Time Picks"
            className="px-3 py-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Type toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--color-text-muted)]">Tipo</label>
          <div className="flex gap-2">
            {(["manual", "smart"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-2 text-sm rounded-lg border transition-colors",
                  type === t
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]"
                )}
              >
                {t === "manual" ? "Manual" : "Smart (automática)"}
              </button>
            ))}
          </div>
        </div>

        {/* Smart filters */}
        {type === "smart" && (
          <div className="flex flex-col gap-3 p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
            {/* BPM range */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] w-16 shrink-0">BPM</span>
              <input
                type="number"
                placeholder="Min"
                value={bpmMin}
                onChange={(e) => setBpmMin(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <span className="text-[var(--color-text-muted)] text-xs shrink-0">—</span>
              <input
                type="number"
                placeholder="Max"
                value={bpmMax}
                onChange={(e) => setBpmMax(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Energy range */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] w-16 shrink-0">Energía</span>
              <input
                type="number"
                placeholder="1"
                min={1}
                max={5}
                value={energyMin}
                onChange={(e) => setEnergyMin(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
              <span className="text-[var(--color-text-muted)] text-xs shrink-0">—</span>
              <input
                type="number"
                placeholder="5"
                min={1}
                max={5}
                value={energyMax}
                onChange={(e) => setEnergyMax(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Vocal filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] w-16 shrink-0">Vocales</span>
              <div className="flex gap-1 flex-1">
                {(["all", "vocals", "instrumental"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVocalFilter(v)}
                    className={cn(
                      "flex-1 py-1 text-xs rounded border transition-colors",
                      vocalFilter === v
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]"
                    )}
                  >
                    {v === "all" ? "Todos" : v === "vocals" ? "Con voces" : "Instrumental"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Color picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--color-text-muted)]">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: COLOR_MAP[c] }}
                className={cn(
                  "w-7 h-7 rounded-full transition-all",
                  color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--color-surface)] scale-110" : "opacity-70 hover:opacity-100"
                )}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-colors disabled:opacity-40"
          >
            Crear
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
