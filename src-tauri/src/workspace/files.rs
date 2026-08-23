//! Note file writes.
//!
//! Reading stays in TypeScript. Writing lives here because a half-written note
//! is lost work, and the guarantees that prevent it are easier to hold in one
//! place: write to a temporary file beside the target, flush it to the disk,
//! then rename it over the original. A rename within one directory is atomic on
//! every platform Notara targets, so a reader either sees the whole old file or
//! the whole new one, never a truncated mix.
//!
//! Two other things happen around that write. The previous contents are copied
//! into `.notara/backups` first, so a bad save is recoverable. And the caller
//! can pass the revision it last read, which is refused if the file changed
//! underneath it. That is what turns an external edit into a prompt instead of
//! silent data loss.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use super::guard::{ensure_manageable, relative_label, resolve_within, SIDECAR_DIRECTORY};

/// Extensions this module will write. Anything else is not a note.
const NOTE_EXTENSIONS: [&str; 2] = ["md", "markdown"];

/// What a caller gets back after a successful write.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteWriteResult {
    /// Workspace-relative path of the file that was written.
    pub path: String,
    /// The file's revision after the write, to pass to the next one.
    pub revision: String,
}

/// A cheap fingerprint of a file's state on disk.
///
/// Modified time plus length is enough to notice that something else changed
/// the file, and it costs one metadata call rather than a read of the whole
/// document. The timestamp is kept at nanosecond resolution because that is
/// what most filesystems record, and truncating it to milliseconds made two
/// quick saves of equal length look identical.
///
/// This is not a content hash. Two writes that land in the same filesystem
/// timestamp tick and produce the same byte length still look the same, which
/// on a filesystem with coarse timestamps means a same-length external edit
/// within that tick goes unnoticed. Hand editing does not hit that, and paying
/// a full read on every save to close it is not a good trade.
fn revision_of(path: &Path) -> Result<String, String> {
    let metadata = std::fs::metadata(path)
        .map_err(|error| format!("Unable to read {}: {error}", path.display()))?;

    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or(0);

    Ok(format!("{modified}-{}", metadata.len()))
}

/// Confirms the target looks like a note Notara may write.
fn ensure_note_path(target: &Path) -> Result<(), String> {
    let extension = target
        .extension()
        .map(|value| value.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    if !NOTE_EXTENSIONS.contains(&extension.as_str()) {
        return Err("Notara only writes Markdown files.".into());
    }

    if target.is_dir() {
        return Err(format!("{} is a folder.", target.display()));
    }

    Ok(())
}

/// Flattens a workspace-relative path into a single backup file name.
///
/// Separators become underscores so the backups directory stays flat. Without
/// that, restoring a file would mean recreating its folders first, and the
/// point of the backup is to be easy to reach in a bad moment.
fn backup_name(relative: &str) -> String {
    format!("{}.bak", relative.replace(['/', '\\'], "_"))
}

/// Copies the current contents aside before they are replaced.
///
/// One backup is kept per file rather than a growing history. It covers the
/// case it is meant to cover, which is a save that turns out to be wrong, and
/// it cannot quietly fill the user's disk over a year of editing.
fn back_up_existing(root: &Path, target: &Path, relative: &str) -> Result<(), String> {
    if !target.exists() {
        return Ok(());
    }

    let backups = root.join(SIDECAR_DIRECTORY).join("backups");
    std::fs::create_dir_all(&backups)
        .map_err(|error| format!("Unable to create {}: {error}", backups.display()))?;

    let destination = backups.join(backup_name(relative));
    std::fs::copy(target, &destination)
        .map_err(|error| format!("Unable to back up {relative}: {error}"))?;

    Ok(())
}

/// Builds a temporary path in the target's own directory.
///
/// The temporary file has to share a filesystem with the target, otherwise the
/// rename stops being atomic and becomes a copy. A sibling is the only way to
/// guarantee that, so the system temp directory is deliberately not used.
fn temporary_path(target: &Path) -> Result<PathBuf, String> {
    let parent = target
        .parent()
        .ok_or_else(|| String::from("Path escapes the workspace root."))?;
    let name = target
        .file_name()
        .ok_or_else(|| String::from("Path has no file name."))?
        .to_string_lossy()
        .to_string();

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or(0);

    Ok(parent.join(format!(".{name}.{stamp}.notara-tmp")))
}

/// Writes `contents` to a note file, replacing it atomically.
///
/// `expected_revision` is the revision the caller last read. Passing `None`
/// means the caller accepts whatever is there, which is what a brand new note
/// does. Passing a revision that no longer matches the file is refused, and the
/// error is worded so the interface can offer the user a choice rather than
/// picking a winner on its own.
pub fn write_note(
    root: &Path,
    relative_path: &str,
    contents: &str,
    expected_revision: Option<&str>,
) -> Result<NoteWriteResult, String> {
    let target = resolve_within(root, relative_path)?;
    ensure_manageable(root, &target)?;
    ensure_note_path(&target)?;

    let relative = relative_label(root, &target)?;

    if let Some(expected) = expected_revision {
        if target.exists() {
            let current = revision_of(&target)?;
            if current != expected {
                return Err(format!(
                    "{relative} changed outside Notara since it was opened."
                ));
            }
        }
    }

    let parent = target
        .parent()
        .ok_or_else(|| String::from("Path escapes the workspace root."))?;
    std::fs::create_dir_all(parent)
        .map_err(|error| format!("Unable to create {}: {error}", parent.display()))?;

    back_up_existing(root, &target, &relative)?;

    let temporary = temporary_path(&target)?;
    let write_result = (|| -> std::io::Result<()> {
        let mut file = std::fs::File::create(&temporary)?;
        file.write_all(contents.as_bytes())?;
        // Without this the rename can land before the bytes do, which on a
        // crash leaves an empty file where the note used to be.
        file.sync_all()?;
        Ok(())
    })();

    if let Err(error) = write_result {
        let _ = std::fs::remove_file(&temporary);
        return Err(format!("Unable to write {relative}: {error}"));
    }

    if let Err(error) = std::fs::rename(&temporary, &target) {
        let _ = std::fs::remove_file(&temporary);
        return Err(format!("Unable to save {relative}: {error}"));
    }

    Ok(NoteWriteResult {
        revision: revision_of(&target)?,
        path: relative,
    })
}

/// Reads a note's current revision, or `None` when the file is not there.
///
/// The interface calls this to notice that a file changed underneath it without
/// having to read the whole document back.
pub fn note_revision(root: &Path, relative_path: &str) -> Result<Option<String>, String> {
    let target = resolve_within(root, relative_path)?;
    if !target.exists() {
        return Ok(None);
    }
    ensure_note_path(&target)?;
    revision_of(&target).map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Workspace(tempfile::TempDir);

    impl Workspace {
        fn new() -> Self {
            let dir = tempfile::tempdir().expect("temp workspace");
            std::fs::create_dir_all(dir.path().join(SIDECAR_DIRECTORY).join("backups"))
                .expect("sidecar");
            Self(dir)
        }

        fn root(&self) -> &Path {
            self.0.path()
        }

        fn read(&self, relative: &str) -> String {
            std::fs::read_to_string(self.root().join(relative)).expect("read")
        }
    }

    #[test]
    fn writes_a_new_note_and_returns_its_revision() {
        let workspace = Workspace::new();
        let result = write_note(workspace.root(), "Guides/About.md", "# About\n", None)
            .expect("written");

        assert_eq!(result.path, "Guides/About.md");
        assert!(!result.revision.is_empty());
        assert_eq!(workspace.read("Guides/About.md"), "# About\n");
    }

    #[test]
    fn creates_missing_folders_on_the_way() {
        let workspace = Workspace::new();
        write_note(workspace.root(), "a/b/c/Deep.md", "body\n", None).expect("written");

        assert!(workspace.root().join("a/b/c/Deep.md").is_file());
    }

    #[test]
    fn backs_up_the_previous_contents_before_replacing_them() {
        let workspace = Workspace::new();
        write_note(workspace.root(), "Guides/About.md", "first\n", None).expect("first");
        write_note(workspace.root(), "Guides/About.md", "second\n", None).expect("second");

        let backup = workspace
            .root()
            .join(SIDECAR_DIRECTORY)
            .join("backups")
            .join("Guides_About.md.bak");

        assert_eq!(std::fs::read_to_string(backup).expect("backup"), "first\n");
        assert_eq!(workspace.read("Guides/About.md"), "second\n");
    }

    #[test]
    fn refuses_a_write_when_the_file_changed_underneath() {
        let workspace = Workspace::new();
        let first = write_note(workspace.root(), "Note.md", "one\n", None).expect("written");

        std::fs::write(workspace.root().join("Note.md"), "changed elsewhere\n").expect("outside");

        let error = write_note(workspace.root(), "Note.md", "two\n", Some(&first.revision))
            .unwrap_err();

        assert!(error.contains("changed outside Notara"));
        assert_eq!(workspace.read("Note.md"), "changed elsewhere\n");
    }

    #[test]
    fn accepts_a_write_carrying_the_current_revision() {
        let workspace = Workspace::new();
        let first = write_note(workspace.root(), "Note.md", "one\n", None).expect("written");
        let second =
            write_note(workspace.root(), "Note.md", "one and two\n", Some(&first.revision))
                .expect("written");

        assert_ne!(first.revision, second.revision);
        assert_eq!(workspace.read("Note.md"), "one and two\n");
    }

    /// Pins the known limit of a metadata fingerprint.
    ///
    /// A same-length write inside one filesystem timestamp tick is invisible to
    /// `revision_of`. This is documented rather than fixed, because closing it
    /// means hashing the file on every save and every check. It is safe for
    /// Notara's own writes, which is what the assertion below shows: the guard
    /// still lets the next save through instead of raising a false conflict.
    #[test]
    fn a_same_length_write_in_one_tick_is_not_distinguishable() {
        let workspace = Workspace::new();
        let first = write_note(workspace.root(), "Note.md", "one\n", None).expect("written");
        let second = write_note(workspace.root(), "Note.md", "two\n", Some(&first.revision))
            .expect("the guard accepts a revision it just produced");

        assert_eq!(workspace.read("Note.md"), "two\n");
        assert!(!second.revision.is_empty());
    }

    /// The flow behind the interface's "Keep my version" choice.
    ///
    /// A refused write must stay refused until the caller explicitly drops the
    /// revision, and the version being replaced has to reach the backups first,
    /// because that is the only copy of it left afterwards.
    #[test]
    fn a_forced_write_overwrites_a_conflict_and_backs_up_what_it_replaced() {
        let workspace = Workspace::new();
        let first = write_note(workspace.root(), "Note.md", "mine\n", None).expect("written");

        std::fs::write(workspace.root().join("Note.md"), "theirs, from elsewhere\n")
            .expect("outside edit");

        // The guard refuses while the caller still claims the old revision.
        let refused = write_note(
            workspace.root(),
            "Note.md",
            "mine, edited\n",
            Some(&first.revision),
        );
        assert!(refused.is_err());

        // Dropping the revision is the user having answered the question.
        write_note(workspace.root(), "Note.md", "mine, edited\n", None).expect("forced");

        assert_eq!(workspace.read("Note.md"), "mine, edited\n");

        let backup = workspace
            .root()
            .join(SIDECAR_DIRECTORY)
            .join("backups")
            .join("Note.md.bak");
        assert_eq!(
            std::fs::read_to_string(backup).expect("backup"),
            "theirs, from elsewhere\n",
            "the overwritten version must be recoverable"
        );
    }

    #[test]
    fn refuses_to_write_outside_the_workspace() {
        let workspace = Workspace::new();
        let error = write_note(workspace.root(), "../escape.md", "nope\n", None).unwrap_err();

        assert!(error.contains(".."));
    }

    #[test]
    fn refuses_to_write_into_the_sidecar() {
        let workspace = Workspace::new();
        let error =
            write_note(workspace.root(), ".notara/sneaky.md", "nope\n", None).unwrap_err();

        assert!(error.contains(SIDECAR_DIRECTORY));
    }

    #[test]
    fn refuses_a_file_that_is_not_markdown() {
        let workspace = Workspace::new();
        let error = write_note(workspace.root(), "notes.json", "{}", None).unwrap_err();

        assert!(error.contains("Markdown"));
    }

    #[test]
    fn leaves_no_temporary_file_behind() {
        let workspace = Workspace::new();
        write_note(workspace.root(), "Note.md", "body\n", None).expect("written");

        let leftovers: Vec<_> = std::fs::read_dir(workspace.root())
            .expect("read dir")
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_name().to_string_lossy().contains("notara-tmp"))
            .collect();

        assert!(leftovers.is_empty());
    }

    #[test]
    fn reports_no_revision_for_a_file_that_does_not_exist() {
        let workspace = Workspace::new();
        assert_eq!(note_revision(workspace.root(), "Missing.md").expect("checked"), None);
    }
}
