//! Path containment for the selected workspace.
//!
//! Every workspace command routes its target through here first. The rule is
//! simple: after symlinks are resolved, the target must still sit inside the
//! folder the user approved. Nothing else in this module is allowed to touch
//! the disk before that check passes.

use std::ffi::OsString;
use std::path::{Component, Path, PathBuf};

/// Name of the directory Notara keeps its own state in.
pub const SIDECAR_DIRECTORY: &str = ".notara";

/// Resolves a real, existing path and follows any symlinks along the way.
pub fn canonical_root(root: &Path) -> Result<PathBuf, String> {
    let resolved = std::fs::canonicalize(root)
        .map_err(|error| format!("Unable to open {}: {error}", root.display()))?;

    if !resolved.is_dir() {
        return Err(format!("{} is not a directory.", resolved.display()));
    }

    Ok(resolved)
}

/// Turns a caller-supplied relative path into a normalized component list.
///
/// Absolute paths, drive prefixes, and `..` are rejected outright rather than
/// normalized away, because a caller that sends one is asking for something the
/// workspace cannot give it.
fn normalize_relative(relative: &str) -> Result<PathBuf, String> {
    if relative.contains('\0') {
        return Err("Path contains an invalid character.".into());
    }

    let mut normalized = PathBuf::new();
    for component in Path::new(relative).components() {
        match component {
            Component::Normal(part) => normalized.push(part),
            Component::CurDir => {}
            Component::ParentDir => return Err("Path may not contain \"..\".".into()),
            Component::RootDir | Component::Prefix(_) => {
                return Err("Path must be relative to the workspace.".into())
            }
        }
    }

    Ok(normalized)
}

/// Resolves `relative` against `root` and confirms the result stays inside it.
///
/// The target does not have to exist yet, which is why this walks up to the
/// deepest ancestor that does exist and canonicalizes that instead. A path that
/// does not exist cannot be a symlink, so checking the existing part is enough.
pub fn resolve_within(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let root = canonical_root(root)?;
    let candidate = root.join(normalize_relative(relative)?);

    let mut existing = candidate;
    let mut trailing: Vec<OsString> = Vec::new();
    while !existing.exists() {
        let name = existing
            .file_name()
            .ok_or_else(|| String::from("Path escapes the workspace root."))?
            .to_os_string();
        let parent = existing
            .parent()
            .ok_or_else(|| String::from("Path escapes the workspace root."))?
            .to_path_buf();
        trailing.push(name);
        existing = parent;
    }

    let resolved = std::fs::canonicalize(&existing)
        .map_err(|error| format!("Unable to resolve {}: {error}", existing.display()))?;
    if !resolved.starts_with(&root) {
        return Err("Path escapes the workspace root.".into());
    }

    let mut target = resolved;
    for name in trailing.into_iter().rev() {
        target.push(name);
    }

    Ok(target)
}

/// Rejects the workspace root itself and anything Notara owns.
///
/// Directory actions are user-facing, so the root and the `.notara` sidecar are
/// off limits. Losing either one through a rename or a delete would break the
/// workspace in a way the user did not ask for.
pub fn ensure_manageable(root: &Path, target: &Path) -> Result<(), String> {
    let root = canonical_root(root)?;

    if target == root {
        return Err("The workspace root cannot be changed from inside Notara.".into());
    }

    let sidecar = root.join(SIDECAR_DIRECTORY);
    if target == sidecar || target.starts_with(&sidecar) {
        return Err(format!(
            "{SIDECAR_DIRECTORY} holds Notara's own files and cannot be changed here."
        ));
    }

    Ok(())
}

/// Expresses a resolved path back to the frontend as a workspace-relative path.
///
/// Separators are normalized to forward slashes so the same string works as a
/// React key, a tree node id, and a lookup key on every platform.
pub fn relative_label(root: &Path, target: &Path) -> Result<String, String> {
    let root = canonical_root(root)?;
    let relative = target
        .strip_prefix(&root)
        .map_err(|_| String::from("Path escapes the workspace root."))?;

    let parts: Vec<String> = relative
        .components()
        .filter_map(|component| match component {
            Component::Normal(part) => Some(part.to_string_lossy().to_string()),
            _ => None,
        })
        .collect();

    Ok(parts.join("/"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn workspace() -> tempfile::TempDir {
        tempfile::tempdir().expect("temp workspace")
    }

    #[test]
    fn rejects_parent_traversal() {
        let dir = workspace();
        let error = resolve_within(dir.path(), "../outside").unwrap_err();
        assert!(error.contains(".."));
    }

    #[test]
    fn rejects_absolute_paths() {
        let dir = workspace();
        let error = resolve_within(dir.path(), "/etc/passwd").unwrap_err();
        assert!(error.contains("relative"));
    }

    #[test]
    fn resolves_a_path_that_does_not_exist_yet() {
        let dir = workspace();
        let resolved = resolve_within(dir.path(), "projects/new").expect("resolved");
        assert!(resolved.starts_with(canonical_root(dir.path()).unwrap()));
        assert!(resolved.ends_with("projects/new"));
    }

    #[test]
    fn rejects_a_symlink_that_points_outside() {
        let dir = workspace();
        let outside = workspace();
        #[cfg(unix)]
        std::os::unix::fs::symlink(outside.path(), dir.path().join("escape")).expect("symlink");
        #[cfg(unix)]
        {
            let error = resolve_within(dir.path(), "escape").unwrap_err();
            assert!(error.contains("escapes"));
        }
    }

    #[test]
    fn refuses_to_manage_the_sidecar() {
        let dir = workspace();
        let target = resolve_within(dir.path(), SIDECAR_DIRECTORY).expect("resolved");
        assert!(ensure_manageable(dir.path(), &target).is_err());
    }
}
