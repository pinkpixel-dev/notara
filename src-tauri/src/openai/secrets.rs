//! Encrypted storage for the OpenAI API key.
//!
//! The key lives in an encrypted file inside Notara's app config directory. It
//! never goes into the workspace, browser storage, a log line, or a build-time
//! variable, and the webview never receives the plaintext back: the only thing
//! it can read is the masked hint.
//!
//! What this does and does not protect against is worth being plain about. The
//! ciphertext and its data key sit in the same directory, so anything already
//! running as the user can read both. What it does stop is casual disclosure:
//! the key does not appear in a backup, a synced folder, a support bundle, a
//! screen share, or a `grep` across the config directory.
//!
//! A keyring was considered and turned down. On Linux it needs a Secret Service
//! that may not be installed or unlocked, and an unlocked session keyring is
//! readable by processes running as the user anyway, so it would have bought a
//! hard runtime dependency for very little.

use std::fs;
use std::path::{Path, PathBuf};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, CHACHA20_POLY1305, NONCE_LEN};
use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};

const KEY_FILE: &str = "openai-key.enc";
const DATA_KEY_FILE: &str = "openai-key.data";
const DATA_KEY_LEN: usize = 32;

/// The on-disk shape. `masked` is a display hint, not a secret, so status reads
/// never have to touch the ciphertext.
#[derive(Serialize, Deserialize)]
struct StoredKey {
    nonce: String,
    ciphertext: String,
    masked: String,
}

/// What the webview is allowed to know about the saved key.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct KeyStatus {
    pub saved: bool,
    /// `None` when nothing is saved. Never the full key.
    pub masked: Option<String>,
}

impl KeyStatus {
    fn empty() -> Self {
        Self { saved: false, masked: None }
    }
}

/// Builds the display hint shown in Settings.
///
/// Short enough to be useless to anyone reading over a shoulder, long enough
/// that a user with two projects can tell which key is loaded.
fn mask(key: &str) -> String {
    let characters: Vec<char> = key.chars().collect();

    if characters.len() <= 8 {
        return "•".repeat(characters.len().max(1));
    }

    let head: String = characters[..3].iter().collect();
    let tail: String = characters[characters.len() - 4..].iter().collect();

    format!("{head}••••{tail}")
}

/// Restricts a path to the current user where the platform supports it.
#[cfg(unix)]
fn restrict(path: &Path, mode: u32) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(mode))
        .map_err(|error| format!("Unable to set permissions on {}: {error}", path.display()))
}

#[cfg(not(unix))]
fn restrict(_path: &Path, _mode: u32) -> Result<(), String> {
    // Windows and macOS place the app config directory under the user profile,
    // which already carries per-user access control.
    Ok(())
}

/// The encrypted key store, rooted at Notara's app config directory.
pub struct KeyStore {
    directory: PathBuf,
}

impl KeyStore {
    pub fn new(directory: PathBuf) -> Self {
        Self { directory }
    }

    fn key_path(&self) -> PathBuf {
        self.directory.join(KEY_FILE)
    }

    fn data_key_path(&self) -> PathBuf {
        self.directory.join(DATA_KEY_FILE)
    }

    fn ensure_directory(&self) -> Result<(), String> {
        fs::create_dir_all(&self.directory).map_err(|error| {
            format!("Unable to create {}: {error}", self.directory.display())
        })?;
        restrict(&self.directory, 0o700)
    }

    /// Loads the data key, creating one on first use.
    fn data_key(&self) -> Result<[u8; DATA_KEY_LEN], String> {
        let path = self.data_key_path();

        if path.exists() {
            let bytes = fs::read(&path)
                .map_err(|error| format!("Unable to read the stored data key: {error}"))?;

            let sized: [u8; DATA_KEY_LEN] = bytes.as_slice().try_into().map_err(|_| {
                String::from(
                    "The stored data key is the wrong length. Delete the saved key in Settings and save it again.",
                )
            })?;

            return Ok(sized);
        }

        let mut fresh = [0u8; DATA_KEY_LEN];
        SystemRandom::new()
            .fill(&mut fresh)
            .map_err(|_| String::from("Unable to generate a data key."))?;

        self.ensure_directory()?;
        fs::write(&path, fresh)
            .map_err(|error| format!("Unable to write the data key: {error}"))?;
        restrict(&path, 0o600)?;

        Ok(fresh)
    }

    fn sealing_key(&self) -> Result<LessSafeKey, String> {
        let material = self.data_key()?;
        let unbound = UnboundKey::new(&CHACHA20_POLY1305, &material)
            .map_err(|_| String::from("Unable to prepare the encryption key."))?;

        Ok(LessSafeKey::new(unbound))
    }

    /// Encrypts and writes the key, replacing anything already saved.
    pub fn save(&self, key: &str) -> Result<KeyStatus, String> {
        let trimmed = key.trim();

        if trimmed.is_empty() {
            return Err(String::from("Enter an API key before saving."));
        }

        let sealing_key = self.sealing_key()?;

        let mut nonce_bytes = [0u8; NONCE_LEN];
        SystemRandom::new()
            .fill(&mut nonce_bytes)
            .map_err(|_| String::from("Unable to generate a nonce."))?;

        let mut buffer = trimmed.as_bytes().to_vec();
        sealing_key
            .seal_in_place_append_tag(
                Nonce::assume_unique_for_key(nonce_bytes),
                Aad::empty(),
                &mut buffer,
            )
            .map_err(|_| String::from("Unable to encrypt the API key."))?;

        let stored = StoredKey {
            nonce: BASE64.encode(nonce_bytes),
            ciphertext: BASE64.encode(&buffer),
            masked: mask(trimmed),
        };

        let serialized = serde_json::to_vec(&stored)
            .map_err(|error| format!("Unable to serialize the stored key: {error}"))?;

        self.ensure_directory()?;
        let path = self.key_path();
        fs::write(&path, serialized)
            .map_err(|error| format!("Unable to write the API key: {error}"))?;
        restrict(&path, 0o600)?;

        Ok(KeyStatus { saved: true, masked: Some(stored.masked) })
    }

    fn read_stored(&self) -> Result<Option<StoredKey>, String> {
        let path = self.key_path();

        if !path.exists() {
            return Ok(None);
        }

        let bytes = fs::read(&path)
            .map_err(|error| format!("Unable to read the saved API key: {error}"))?;

        serde_json::from_slice(&bytes).map(Some).map_err(|_| {
            String::from(
                "The saved API key file could not be read. Delete the saved key in Settings and save it again.",
            )
        })
    }

    /// Reports whether a key is saved, without decrypting it.
    pub fn status(&self) -> Result<KeyStatus, String> {
        match self.read_stored()? {
            Some(stored) => Ok(KeyStatus { saved: true, masked: Some(stored.masked) }),
            None => Ok(KeyStatus::empty()),
        }
    }

    /// Decrypts the saved key for a single outgoing request.
    ///
    /// Only the transport layer calls this, and the plaintext is never returned
    /// to a Tauri command.
    pub fn reveal(&self) -> Result<String, String> {
        let stored = self.read_stored()?.ok_or_else(|| {
            String::from("No OpenAI API key is saved. Add one in Settings, under AI & Data.")
        })?;

        let nonce_bytes: [u8; NONCE_LEN] = BASE64
            .decode(&stored.nonce)
            .map_err(|_| String::from("The saved API key is unreadable."))?
            .as_slice()
            .try_into()
            .map_err(|_| String::from("The saved API key is unreadable."))?;

        let mut buffer = BASE64
            .decode(&stored.ciphertext)
            .map_err(|_| String::from("The saved API key is unreadable."))?;

        let sealing_key = self.sealing_key()?;
        let plaintext = sealing_key
            .open_in_place(
                Nonce::assume_unique_for_key(nonce_bytes),
                Aad::empty(),
                &mut buffer,
            )
            .map_err(|_| {
                String::from(
                    "The saved API key could not be decrypted. Delete it in Settings and save it again.",
                )
            })?;

        String::from_utf8(plaintext.to_vec())
            .map_err(|_| String::from("The saved API key is not valid text."))
    }

    /// Removes the saved key and its data key.
    pub fn delete(&self) -> Result<KeyStatus, String> {
        for path in [self.key_path(), self.data_key_path()] {
            if path.exists() {
                fs::remove_file(&path)
                    .map_err(|error| format!("Unable to remove {}: {error}", path.display()))?;
            }
        }

        Ok(KeyStatus::empty())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn store() -> (TempDir, KeyStore) {
        let directory = TempDir::new().expect("temp dir");
        let store = KeyStore::new(directory.path().join("notara"));
        (directory, store)
    }

    #[test]
    fn reports_no_key_before_anything_is_saved() {
        let (_guard, store) = store();
        assert_eq!(store.status().unwrap(), KeyStatus { saved: false, masked: None });
    }

    #[test]
    fn round_trips_a_saved_key() {
        let (_guard, store) = store();
        store.save("sk-proj-abcdefghijklmnop").unwrap();

        assert_eq!(store.reveal().unwrap(), "sk-proj-abcdefghijklmnop");
    }

    #[test]
    fn trims_the_key_before_saving() {
        let (_guard, store) = store();
        store.save("  sk-proj-abcdefghijklmnop \n").unwrap();

        assert_eq!(store.reveal().unwrap(), "sk-proj-abcdefghijklmnop");
    }

    #[test]
    fn refuses_an_empty_key() {
        let (_guard, store) = store();
        assert!(store.save("   ").is_err());
    }

    #[test]
    fn never_writes_the_key_in_readable_form() {
        let (_guard, store) = store();
        store.save("sk-proj-abcdefghijklmnop").unwrap();

        let raw = fs::read_to_string(store.key_path()).unwrap();
        assert!(!raw.contains("sk-proj-abcdefghijklmnop"));
    }

    #[test]
    fn status_masks_the_key() {
        let (_guard, store) = store();
        let status = store.save("sk-proj-abcdefghijklmnop").unwrap();

        let masked = status.masked.unwrap();
        assert_eq!(masked, "sk-••••mnop");
        assert_eq!(store.status().unwrap().masked.unwrap(), masked);
    }

    #[test]
    fn replacing_a_key_overwrites_the_previous_one() {
        let (_guard, store) = store();
        store.save("sk-proj-firstkeyvalue").unwrap();
        store.save("sk-proj-secondkeyvalue").unwrap();

        assert_eq!(store.reveal().unwrap(), "sk-proj-secondkeyvalue");
    }

    #[test]
    fn deleting_clears_status_and_reveal() {
        let (_guard, store) = store();
        store.save("sk-proj-abcdefghijklmnop").unwrap();
        store.delete().unwrap();

        assert!(!store.status().unwrap().saved);
        assert!(store.reveal().is_err());
    }

    #[test]
    fn deleting_when_nothing_is_saved_is_not_an_error() {
        let (_guard, store) = store();
        assert!(store.delete().is_ok());
    }

    #[test]
    fn a_tampered_ciphertext_does_not_decrypt() {
        let (_guard, store) = store();
        store.save("sk-proj-abcdefghijklmnop").unwrap();

        let mut stored: StoredKey =
            serde_json::from_slice(&fs::read(store.key_path()).unwrap()).unwrap();
        let mut bytes = BASE64.decode(&stored.ciphertext).unwrap();
        bytes[0] ^= 0xff;
        stored.ciphertext = BASE64.encode(&bytes);
        fs::write(store.key_path(), serde_json::to_vec(&stored).unwrap()).unwrap();

        assert!(store.reveal().is_err());
    }

    #[test]
    fn masks_a_short_key_without_leaking_characters() {
        assert_eq!(mask("sk-12"), "•••••");
    }
}
