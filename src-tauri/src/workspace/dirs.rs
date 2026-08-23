//! Directory operations, independent of Tauri.
//!
//! Each function takes the approved workspace root explicitly and routes its
//! target through the guard first. Keeping these free of Tauri types is what
//! lets them be tested against a real temporary workspace.

use std::path::Path;

use super::guard::{ensure_manageable, relative_label, resolve_within};

/// Counts what a delete would remove, so the confirmation can name it.
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletionPreview {
    pub is_directory: bool,
    pub file_count: usize,
    pub directory_count: usize,
}

pub fn create_directory(root: &Path, relative_path: &str) -> Result<String, String> {
    let target = resolve_within(root, relative_path)?;
    ensure_manageable(root, &target)?;

    if target.exists() {
        return Err(format!("{} already exists.", relative_label(root, &target)?));
    }

    std::fs::create_dir_all(&target)
        .map_err(|error| format!("Unable to create {}: {error}", target.display()))?;

    relative_label(root, &target)
}

/// Renames a file or directory in place. `new_name` is one path segment.
pub fn rename_entry(root: &Path, relative_path: &str, new_name: &str) -> Result<String, String> {
    let source = resolve_within(root, relative_path)?;
    ensure_manageable(root, &source)?;

    if !source.exists() {
        return Err(format!("{relative_path} no longer exists."));
    }

    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err("A name is required.".into());
    }
    if Path::new(trimmed).components().count() != 1 {
        return Err("A name cannot contain a path separator.".into());
    }

    let parent = source
        .parent()
        .ok_or_else(|| String::from("Path escapes the workspace root."))?;
    let parent_relative = relative_label(root, parent)?;
    let target_relative = if parent_relative.is_empty() {
        trimmed.to_string()
    } else {
        format!("{parent_relative}/{trimmed}")
    };

    let target = resolve_within(root, &target_relative)?;
    ensure_manageable(root, &target)?;

    if target == source {
        return relative_label(root, &target);
    }
    if target.exists() {
        return Err(format!("{trimmed} already exists in that folder."));
    }

    std::fs::rename(&source, &target)
        .map_err(|error| format!("Unable to rename {}: {error}", source.display()))?;

    relative_label(root, &target)
}

/// Moves a file or directory into another folder inside the workspace.
pub fn move_entry(
    root: &Path,
    relative_path: &str,
    destination_directory: &str,
) -> Result<String, String> {
    let source = resolve_within(root, relative_path)?;
    ensure_manageable(root, &source)?;

    if !source.exists() {
        return Err(format!("{relative_path} no longer exists."));
    }

    let destination = resolve_within(root, destination_directory)?;
    // The root is a valid destination even though it can never be a target of
    // rename or delete, so it skips the manageable check.
    if destination != resolve_within(root, "")? {
        ensure_manageable(root, &destination)?;
    }
    if !destination.is_dir() {
        return Err("The destination folder does not exist.".into());
    }

    // Moving a folder into its own subtree would detach it from the tree and
    // lose it, so it is refused rather than attempted.
    if destination == source || destination.starts_with(&source) {
        return Err("A folder cannot be moved inside itself.".into());
    }

    let name = source
        .file_name()
        .ok_or_else(|| String::from("Path escapes the workspace root."))?;
    let target = destination.join(name);

    if target == source {
        return relative_label(root, &target);
    }
    if target.exists() {
        return Err(format!(
            "{} already exists in the destination folder.",
            name.to_string_lossy()
        ));
    }

    std::fs::rename(&source, &target)
        .map_err(|error| format!("Unable to move {}: {error}", source.display()))?;

    relative_label(root, &target)
}

/// Deletes a file, or a directory and everything under it.
///
/// The caller confirms this with the user. This only enforces that the target
/// is inside the workspace and is neither the root nor the sidecar.
pub fn delete_entry(root: &Path, relative_path: &str) -> Result<(), String> {
    let target = resolve_within(root, relative_path)?;
    ensure_manageable(root, &target)?;

    if !target.exists() {
        return Ok(());
    }

    if target.is_dir() {
        std::fs::remove_dir_all(&target)
    } else {
        std::fs::remove_file(&target)
    }
    .map_err(|error| format!("Unable to delete {}: {error}", target.display()))
}

pub fn preview_deletion(root: &Path, relative_path: &str) -> Result<DeletionPreview, String> {
    let target = resolve_within(root, relative_path)?;
    ensure_manageable(root, &target)?;

    if !target.is_dir() {
        return Ok(DeletionPreview {
            is_directory: false,
            file_count: usize::from(target.exists()),
            directory_count: 0,
        });
    }

    let mut file_count = 0usize;
    let mut directory_count = 0usize;
    let mut pending = vec![target];
    while let Some(current) = pending.pop() {
        let entries = std::fs::read_dir(&current)
            .map_err(|error| format!("Unable to read {}: {error}", current.display()))?;
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                directory_count += 1;
                pending.push(entry.path());
            } else {
                file_count += 1;
            }
        }
    }

    Ok(DeletionPreview {
        is_directory: true,
        file_count,
        directory_count,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    struct Workspace(tempfile::TempDir);

    impl Workspace {
        fn new() -> Self {
            let dir = tempfile::tempdir().expect("temp workspace");
            std::fs::create_dir_all(dir.path().join(".notara")).expect("sidecar");
            Self(dir)
        }

        fn root(&self) -> &Path {
            self.0.path()
        }

        fn path(&self, relative: &str) -> PathBuf {
            self.0.path().join(relative)
        }

        fn write(&self, relative: &str, contents: &str) {
            let target = self.path(relative);
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent).expect("parent");
            }
            std::fs::write(target, contents).expect("write");
        }
    }

    #[test]
    fn creates_a_nested_directory() {
        let workspace = Workspace::new();
        let created = create_directory(workspace.root(), "work/projects").expect("created");
        assert_eq!(created, "work/projects");
        assert!(workspace.path("work/projects").is_dir());
    }

    #[test]
    fn refuses_to_create_over_an_existing_directory() {
        let workspace = Workspace::new();
        create_directory(workspace.root(), "work").expect("created");
        let error = create_directory(workspace.root(), "work").unwrap_err();
        assert!(error.contains("already exists"));
    }

    #[test]
    fn renames_a_directory_and_keeps_its_contents() {
        let workspace = Workspace::new();
        workspace.write("work/note.md", "# hello");

        let renamed = rename_entry(workspace.root(), "work", "archive").expect("renamed");

        assert_eq!(renamed, "archive");
        assert!(!workspace.path("work").exists());
        assert_eq!(
            std::fs::read_to_string(workspace.path("archive/note.md")).expect("read"),
            "# hello"
        );
    }

    #[test]
    fn refuses_a_rename_that_contains_a_separator() {
        let workspace = Workspace::new();
        create_directory(workspace.root(), "work").expect("created");
        let error = rename_entry(workspace.root(), "work", "a/b").unwrap_err();
        assert!(error.contains("separator"));
    }

    #[test]
    fn refuses_a_rename_onto_an_existing_name() {
        let workspace = Workspace::new();
        create_directory(workspace.root(), "work").expect("created");
        create_directory(workspace.root(), "archive").expect("created");
        let error = rename_entry(workspace.root(), "work", "archive").unwrap_err();
        assert!(error.contains("already exists"));
    }

    #[test]
    fn moves_a_directory_into_another_one() {
        let workspace = Workspace::new();
        workspace.write("work/note.md", "# hello");
        create_directory(workspace.root(), "archive").expect("created");

        let moved = move_entry(workspace.root(), "work", "archive").expect("moved");

        assert_eq!(moved, "archive/work");
        assert!(workspace.path("archive/work/note.md").is_file());
    }

    #[test]
    fn moves_a_directory_back_to_the_root() {
        let workspace = Workspace::new();
        create_directory(workspace.root(), "archive/work").expect("created");

        let moved = move_entry(workspace.root(), "archive/work", "").expect("moved");

        assert_eq!(moved, "work");
        assert!(workspace.path("work").is_dir());
    }

    #[test]
    fn refuses_to_move_a_directory_inside_itself() {
        let workspace = Workspace::new();
        create_directory(workspace.root(), "work/projects").expect("created");
        let error = move_entry(workspace.root(), "work", "work/projects").unwrap_err();
        assert!(error.contains("inside itself"));
    }

    #[test]
    fn deletes_a_directory_and_everything_under_it() {
        let workspace = Workspace::new();
        workspace.write("work/deep/note.md", "# hello");

        delete_entry(workspace.root(), "work").expect("deleted");

        assert!(!workspace.path("work").exists());
    }

    #[test]
    fn refuses_to_delete_the_sidecar_or_escape_the_root() {
        let workspace = Workspace::new();
        assert!(delete_entry(workspace.root(), ".notara").is_err());
        assert!(delete_entry(workspace.root(), "../..").is_err());
        assert!(workspace.path(".notara").is_dir());
    }

    #[test]
    fn counts_what_a_delete_would_remove() {
        let workspace = Workspace::new();
        workspace.write("work/one.md", "a");
        workspace.write("work/two.md", "b");
        workspace.write("work/deep/three.md", "c");

        let preview = preview_deletion(workspace.root(), "work").expect("preview");

        assert!(preview.is_directory);
        assert_eq!(preview.file_count, 3);
        assert_eq!(preview.directory_count, 1);
    }
}
