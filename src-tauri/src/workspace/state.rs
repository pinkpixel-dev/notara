//! The approved workspace root, held in the backend rather than the frontend.
//!
//! Directory commands read the root from here instead of taking it as an
//! argument. A path that arrives from the webview is only ever treated as
//! relative, so there is no way for a bad value to redirect an operation at a
//! folder the user never approved.

use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Default)]
pub struct ApprovedWorkspace(pub Mutex<Option<PathBuf>>);

impl ApprovedWorkspace {
    pub fn set(&self, root: PathBuf) {
        if let Ok(mut guard) = self.0.lock() {
            *guard = Some(root);
        }
    }

    pub fn clear(&self) {
        if let Ok(mut guard) = self.0.lock() {
            *guard = None;
        }
    }

    /// Returns the approved root, or an error explaining that none is set.
    pub fn require(&self) -> Result<PathBuf, String> {
        self.0
            .lock()
            .map_err(|_| String::from("The workspace lock is poisoned. Restart Notara."))?
            .clone()
            .ok_or_else(|| String::from("No workspace folder has been chosen yet."))
    }
}
