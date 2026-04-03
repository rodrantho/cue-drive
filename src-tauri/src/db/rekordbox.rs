/// Rekordbox database writer for Pioneer CDJ-compatible USB drives.
///
/// Pioneer CDJ devices read a SQLite database stored at:
///   /PIONEER/rekordbox/export.pdb  (binary PDB format, older)
///   /PIONEER/rekordbox/              (newer SQLite format)
///
/// We write the newer SQLite format that Rekordbox 6+ uses.
use rusqlite::{Connection, Result, params};
use std::path::Path;
use crate::audio::models::Track;

pub struct RekordboxWriter {
    conn: Connection,
}

impl RekordboxWriter {
    pub fn create(usb_path: &str) -> Result<Self> {
        let db_dir = Path::new(usb_path).join("PIONEER").join("rekordbox");
        std::fs::create_dir_all(&db_dir)
            .map_err(|e| rusqlite::Error::InvalidPath(db_dir.clone()))?;

        let db_path = db_dir.join("export.db");
        let conn = Connection::open(&db_path)?;

        let writer = Self { conn };
        writer.init_schema()?;
        Ok(writer)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch("
            CREATE TABLE IF NOT EXISTS DjmdContent (
                ID              INTEGER PRIMARY KEY AUTOINCREMENT,
                FolderPath      TEXT,
                FileNameL       TEXT,
                Title           TEXT,
                ArtistName      TEXT,
                AlbumName       TEXT,
                Genre           TEXT,
                BPM             INTEGER,
                Key             TEXT,
                Duration        INTEGER,
                BitRate         INTEGER,
                SampleRate      INTEGER,
                TrackNo         INTEGER,
                Year            TEXT,
                ColorID         INTEGER DEFAULT 0,
                StockDate       TEXT,
                DateCreated     TEXT,
                ContentLink     INTEGER DEFAULT 0,
                rb_local_usn    INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS DjmdCue (
                ID          INTEGER PRIMARY KEY AUTOINCREMENT,
                ContentID   INTEGER REFERENCES DjmdContent(ID),
                InMsec      INTEGER,
                OutMsec     INTEGER,
                Kind        INTEGER, -- 0=cue, 1=loop
                Color       INTEGER DEFAULT 0,
                Comment     TEXT
            );

            CREATE TABLE IF NOT EXISTS DjmdPlaylist (
                ID          INTEGER PRIMARY KEY AUTOINCREMENT,
                ParentID    INTEGER,
                Seq         INTEGER,
                Name        TEXT,
                ImagePath   TEXT,
                TrackCount  INTEGER DEFAULT 0,
                Attribute   INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS DjmdSongPlaylist (
                ID          INTEGER PRIMARY KEY AUTOINCREMENT,
                PlaylistID  INTEGER REFERENCES DjmdPlaylist(ID),
                ContentID   INTEGER REFERENCES DjmdContent(ID),
                TrackNo     INTEGER
            );
        ")?;
        Ok(())
    }

    pub fn insert_track(&self, track: &Track) -> Result<i64> {
        let bpm_int = track.bpm.map(|b| (b * 100.0) as i64); // stored as fixed-point x100
        let duration_ms = (track.duration * 1000.0) as i64;
        let key = track.key_camelot.as_deref().unwrap_or("");

        self.conn.execute(
            "INSERT INTO DjmdContent
             (FolderPath, FileNameL, Title, ArtistName, AlbumName, Genre, BPM, Key, Duration, DateCreated)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))",
            params![
                track.path,
                track.filename,
                track.title,
                track.artist,
                track.album,
                track.genre,
                bpm_int,
                key,
                duration_ms,
            ],
        )?;

        let id = self.conn.last_insert_rowid();

        // Insert cue points
        for cue in &track.cue_points {
            let in_msec = (cue.position * 1000.0) as i64;
            let kind: i64 = if cue.cue_type == "loop" { 1 } else { 0 };
            self.conn.execute(
                "INSERT INTO DjmdCue (ContentID, InMsec, OutMsec, Kind, Comment)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, in_msec, in_msec, kind, cue.label],
            )?;
        }

        Ok(id)
    }

    pub fn create_playlist(&self, name: &str, parent_id: Option<i64>) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO DjmdPlaylist (ParentID, Name, Attribute) VALUES (?1, ?2, 0)",
            params![parent_id, name],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn add_to_playlist(&self, playlist_id: i64, content_id: i64, track_no: i64) -> Result<()> {
        self.conn.execute(
            "INSERT INTO DjmdSongPlaylist (PlaylistID, ContentID, TrackNo) VALUES (?1, ?2, ?3)",
            params![playlist_id, content_id, track_no],
        )?;
        Ok(())
    }
}
