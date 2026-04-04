export type Language = "en" | "es";

export const translations = {
  en: {
    // Navigation
    nav_library: "Library",
    nav_setbuilder: "Set Builder",
    nav_export: "Export",

    // Library
    lib_import_folder: "Import Folder",
    lib_importing: "Importing...",
    lib_analyze_all: "Analyze All",
    lib_search_placeholder: "Search title, artist, genre...",
    lib_filters: "Filters",
    lib_camelot: "Camelot",
    lib_standard: "Standard",
    lib_no_tracks_title: "No tracks yet",
    lib_no_tracks_sub: "Import a folder to get started",
    lib_col_title: "Title / Artist",
    lib_col_genre: "Genre",
    lib_col_bpm: "BPM",
    lib_col_key: "Key",
    lib_col_energy: "Energy",
    lib_col_duration: "Duration",
    lib_col_status: "Status",
    lib_tracks_count: (shown: number, total: number, analyzed: number) =>
      `${shown} of ${total} tracks${analyzed > 0 ? ` · ${analyzed} analyzed` : ""}`,
    lib_filter_energy: "Energy:",
    lib_filter_bpm: "BPM:",
    lib_btn_analyze: "Analyze",

    // Energy labels
    energy_1: "Warm-up",
    energy_2: "Low",
    energy_3: "Mid",
    energy_4: "High",
    energy_5: "Peak",

    // Set Builder
    set_template_warmup: "Warm-up",
    set_template_warmup_desc: "1 → 4 energy arc",
    set_template_peak: "Peak Time",
    set_template_peak_desc: "3 → 5 → 3 energy arc",
    set_template_closing: "Closing",
    set_template_closing_desc: "4 → 1 energy arc",
    set_template_fullnight: "Full Night",
    set_template_fullnight_desc: "Full arc 1 → 5 → 2",
    set_duration: "Duration:",
    set_build: "Build Set",
    set_rebuild: "Rebuild",
    set_clear: "Clear",
    set_energy_arc: "Energy arc",
    set_tracks_count: (n: number) => `${n} tracks`,
    set_empty_title: "Configure and build your set",
    set_empty_sub: "Make sure your library has analyzed tracks",
    set_all_tracks: "All tracks",
    set_all_tracks_tip: "Include every analyzed track ignoring duration",
    set_add_tracks: "Add tracks",
    set_picker_title: "Add to set",
    set_picker_search: "Search...",
    set_picker_already: "Already in set",
    set_picker_not_analyzed: "Not analyzed",
    set_pinned_label: "Pinned",
    set_warning_short: (achieved: number, target: number) =>
      `Not enough tracks — built ${achieved}min of ${target}min. Analyze more tracks or enable "All tracks".`,

    // Export
    exp_title_target: "Export Target",
    exp_cdj_label: "Pioneer CDJ",
    exp_cdj_desc: "Rekordbox database, ready for CDJ-2000/3000",
    exp_traktor_label: "Traktor",
    exp_traktor_desc: "collection.nml for Native Instruments Traktor",
    exp_files_label: "Files only",
    exp_files_desc: "Organized folders, no DJ software needed",
    exp_title_folder: "Folder Organization",
    exp_folder_energy: "By energy",
    exp_folder_genre: "By genre",
    exp_folder_bpm: "By BPM",
    exp_folder_none: "No folders",
    exp_title_filename: "Filename Format",
    exp_title_dest: "Destination",
    exp_dest_placeholder: "Select destination folder or USB drive...",
    exp_browse: "Browse",
    exp_exporting: "Exporting...",
    exp_export_btn: (n: number) => `Export ${n} tracks`,
    exp_source_set: (n: number, name: string) => `Exporting ${n} tracks from set "${name}"`,
    exp_source_all: (n: number) => `Exporting ${n} tracks (all analyzed)`,

    // Collections
    collections_all_tracks: "Toda la librería",
    collections_folders: "CARPETAS",
    collections_collections: "COLECCIONES",
    collection_new: "New collection",
    collection_rename: "Rename",
    collection_delete: "Delete",
    collection_add_to: "Add to collection",
    collection_no_manual: "No manual collections",

    // Set Builder extras
    set_source: "Set source",
    set_avoid_vocals: "Avoid consecutive vocals",
    set_source_all: "All library",

    // Updater
    update_available: "New version available",
    update_install: "Update",
    update_installing: "Installing…",
  },

  es: {
    // Navegación
    nav_library: "Librería",
    nav_setbuilder: "Armar Set",
    nav_export: "Exportar",

    // Librería
    lib_import_folder: "Importar Carpeta",
    lib_importing: "Importando...",
    lib_analyze_all: "Analizar Todo",
    lib_search_placeholder: "Buscar título, artista, género...",
    lib_filters: "Filtros",
    lib_camelot: "Camelot",
    lib_standard: "Estándar",
    lib_no_tracks_title: "Sin tracks todavía",
    lib_no_tracks_sub: "Importá una carpeta para empezar",
    lib_col_title: "Título / Artista",
    lib_col_genre: "Género",
    lib_col_bpm: "BPM",
    lib_col_key: "Tono",
    lib_col_energy: "Energía",
    lib_col_duration: "Duración",
    lib_col_status: "Estado",
    lib_tracks_count: (shown: number, total: number, analyzed: number) =>
      `${shown} de ${total} tracks${analyzed > 0 ? ` · ${analyzed} analizados` : ""}`,
    lib_filter_energy: "Energía:",
    lib_filter_bpm: "BPM:",
    lib_btn_analyze: "Analizar",

    // Etiquetas de energía
    energy_1: "Entrada",
    energy_2: "Bajo",
    energy_3: "Medio",
    energy_4: "Alto",
    energy_5: "Pico",

    // Armar set
    set_template_warmup: "Entrada",
    set_template_warmup_desc: "Arco de energía 1 → 4",
    set_template_peak: "Pico",
    set_template_peak_desc: "Arco de energía 3 → 5 → 3",
    set_template_closing: "Cierre",
    set_template_closing_desc: "Arco de energía 4 → 1",
    set_template_fullnight: "Noche Completa",
    set_template_fullnight_desc: "Arco completo 1 → 5 → 2",
    set_duration: "Duración:",
    set_build: "Armar Set",
    set_rebuild: "Rearmar",
    set_clear: "Limpiar",
    set_energy_arc: "Arco de energía",
    set_tracks_count: (n: number) => `${n} tracks`,
    set_empty_title: "Configurá y armá tu set",
    set_empty_sub: "Asegurate de tener tracks analizados en la librería",
    set_all_tracks: "Todos los tracks",
    set_all_tracks_tip: "Incluir todos los analizados sin límite de tiempo",
    set_add_tracks: "Agregar tracks",
    set_picker_title: "Agregar al set",
    set_picker_search: "Buscar...",
    set_picker_already: "Ya está en el set",
    set_picker_not_analyzed: "Sin analizar",
    set_pinned_label: "Fijado",
    set_warning_short: (achieved: number, target: number) =>
      `Tracks insuficientes — se armaron ${achieved}min de ${target}min. Analizá más tracks o activá "Todos los tracks".`,

    // Exportar
    exp_title_target: "Destino de Exportación",
    exp_cdj_label: "Pioneer CDJ",
    exp_cdj_desc: "Base de datos Rekordbox, lista para CDJ-2000/3000",
    exp_traktor_label: "Traktor",
    exp_traktor_desc: "collection.nml para Native Instruments Traktor",
    exp_files_label: "Solo archivos",
    exp_files_desc: "Carpetas organizadas, sin software de DJ",
    exp_title_folder: "Organización de Carpetas",
    exp_folder_energy: "Por energía",
    exp_folder_genre: "Por género",
    exp_folder_bpm: "Por BPM",
    exp_folder_none: "Sin carpetas",
    exp_title_filename: "Formato de Nombre",
    exp_title_dest: "Destino",
    exp_dest_placeholder: "Seleccioná carpeta destino o pendrive...",
    exp_browse: "Explorar",
    exp_exporting: "Exportando...",
    exp_export_btn: (n: number) => `Exportar ${n} tracks`,
    exp_source_set: (n: number, name: string) => `Exportando ${n} tracks del set "${name}"`,
    exp_source_all: (n: number) => `Exportando ${n} tracks (todos los analizados)`,

    // Colecciones
    collections_all_tracks: "Toda la librería",
    collections_folders: "CARPETAS",
    collections_collections: "COLECCIONES",
    collection_new: "Nueva colección",
    collection_rename: "Renombrar",
    collection_delete: "Eliminar",
    collection_add_to: "Agregar a colección",
    collection_no_manual: "Sin colecciones manuales",

    // Armar set extras
    set_source: "Fuente del set",
    set_avoid_vocals: "Evitar vocales consecutivas",
    set_source_all: "Toda la librería",

    // Updater
    update_available: "Nueva versión disponible",
    update_install: "Actualizar",
    update_installing: "Instalando…",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
