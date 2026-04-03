import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Download, X } from "lucide-react";
import { useT } from "../../i18n/useT";

interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
}

export function UpdateBanner() {
  const t = useT();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check for updates 3 seconds after app start
    const timer = setTimeout(async () => {
      try {
        const result = await invoke<UpdateInfo>("check_update");
        if (result.available) setUpdate(result);
      } catch {
        // Silently ignore — no internet or no update server
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!update?.available || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await invoke("install_update");
      // App will restart automatically after install
    } catch (e) {
      console.error("Update failed:", e);
      setInstalling(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--color-accent)]/10 border-b border-[var(--color-accent)]/30 text-sm">
      <Download className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
      <span className="text-[var(--color-text)] flex-1">
        {t.update_available ?? "Nueva versión disponible"}{" "}
        <span className="font-semibold text-[var(--color-accent)]">
          v{update.version}
        </span>
      </span>
      <button
        onClick={handleInstall}
        disabled={installing}
        className="px-3 py-1 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
      >
        {installing
          ? (t.update_installing ?? "Instalando…")
          : (t.update_install ?? "Actualizar")}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
