import { useState } from "react";
import { Usb, HardDrive, FolderOutput, CheckCircle2, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useLibraryStore } from "../../store/library";
import { useSetStore } from "../../store/set";
import { cn } from "../../utils/cn";
import { useT } from "../../i18n/useT";
import type { ExportOptions } from "../../types";

type ExportTarget = "cdj" | "traktor" | "files";
type FolderOrg = "energy" | "genre" | "bpm" | "none";
type FilenameFormat = "camelot_bpm" | "standard_bpm" | "original";

export function ExportView() {
  const t = useT();
  const { tracks } = useLibraryStore();
  const { currentSet } = useSetStore();

  const [target, setTarget] = useState<ExportTarget>("cdj");
  const [folderOrg, setFolderOrg] = useState<FolderOrg>("energy");
  const [filenameFormat, setFilenameFormat] = useState<FilenameFormat>("camelot_bpm");
  const [destPath, setDestPath] = useState("");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const TARGETS = [
    { value: "cdj" as ExportTarget,    icon: Usb,          label: t.exp_cdj_label,    desc: t.exp_cdj_desc },
    { value: "traktor" as ExportTarget, icon: HardDrive,    label: t.exp_traktor_label, desc: t.exp_traktor_desc },
    { value: "files" as ExportTarget,   icon: FolderOutput, label: t.exp_files_label,   desc: t.exp_files_desc },
  ];

  const FOLDER_OPTS: { value: FolderOrg; label: string }[] = [
    { value: "energy", label: t.exp_folder_energy },
    { value: "genre",  label: t.exp_folder_genre },
    { value: "bpm",    label: t.exp_folder_bpm },
    { value: "none",   label: t.exp_folder_none },
  ];

  const exportTracks = currentSet
    ? currentSet.tracks
        .sort((a, b) => a.position - b.position)
        .map((st) => tracks[st.track_id])
        .filter(Boolean)
    : Object.values(tracks).filter((t) => t.analyzed);

  async function handlePickDest() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setDestPath(selected);
  }

  async function handleExport() {
    if (!destPath) return;
    setExporting(true);
    setResult(null);
    setError(null);
    try {
      const opts: ExportOptions = {
        target,
        destination_path: destPath,
        folder_organization: folderOrg,
        filename_format: filenameFormat,
        key_notation: "camelot",
        copy_files: true,
      };
      const msg: string = await invoke("export_to_usb", { tracks: exportTracks, opts });
      setResult(msg);
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-6 space-y-6">

        {/* Source info */}
        <div className="p-4 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            {currentSet
              ? t.exp_source_set(exportTracks.length, currentSet.name)
              : t.exp_source_all(exportTracks.length)}
          </p>
        </div>

        {/* Target */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-muted)] uppercase tracking-wider">
            {t.exp_title_target}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {TARGETS.map((tgt) => (
              <button
                key={tgt.value}
                onClick={() => setTarget(tgt.value)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all",
                  target === tgt.value
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)] hover:border-[var(--color-text-muted)] bg-[var(--color-surface-2)]"
                )}
              >
                <tgt.icon className={cn("w-5 h-5", target === tgt.value ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")} />
                <div>
                  <div className="text-sm font-semibold">{tgt.label}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{tgt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Folder organization */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-muted)] uppercase tracking-wider">
            {t.exp_title_folder}
          </h3>
          <div className="flex gap-2 flex-wrap">
            {FOLDER_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFolderOrg(opt.value)}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm transition-colors",
                  folderOrg === opt.value
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filename format */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-muted)] uppercase tracking-wider">
            {t.exp_title_filename}
          </h3>
          <div className="space-y-2">
            {[
              { value: "camelot_bpm",  example: "(8A) 128 - Artist - Title.mp3" },
              { value: "standard_bpm", example: "(Am) 128 - Artist - Title.mp3" },
              { value: "original",     example: "Nombre original sin cambios" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilenameFormat(opt.value as FilenameFormat)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors",
                  filenameFormat === opt.value
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-text-muted)]"
                )}
              >
                <span className="text-sm font-mono text-[var(--color-text-muted)]">{opt.example}</span>
                {filenameFormat === opt.value && (
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Destination */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-[var(--color-text-muted)] uppercase tracking-wider">
            {t.exp_title_dest}
          </h3>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm text-[var(--color-text-muted)] truncate">
              {destPath || t.exp_dest_placeholder}
            </div>
            <button
              onClick={handlePickDest}
              className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] text-sm transition-colors"
            >
              {t.exp_browse}
            </button>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {result}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={!destPath || exportTracks.length === 0 || exporting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{t.exp_exporting}</>
          ) : (
            <><Usb className="w-4 h-4" />{t.exp_export_btn(exportTracks.length)}</>
          )}
        </button>
      </div>
    </div>
  );
}
