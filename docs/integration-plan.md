# Notara Integrations Plan

_Last updated: October 4, 2025_

## 1. Purpose
Provide a shared blueprint for delivering Notara's first external storage integrations, ensuring everyone understands the user experience, technical scope, and phased rollout plan before engineering work begins.

## 2. Target Integrations
- **GitHub** — sync notes to a repository as Markdown files.
- **Google Drive** — back up notes to a dedicated Drive folder.
- **Dropbox** — mirror notes in a user's Dropbox workspace.

## 3. Success Criteria
- Users can connect at least one integration without manual configuration files.
- Notes persist to the external service automatically within seconds of an edit.
- The app surfaces connectivity/sync errors and recovery guidance.
- Disconnecting an integration revokes tokens and stops outbound traffic.

## 4. User Stories
1. _As a single-user note taker_, I can connect GitHub and have every note appear in a repository without manually exporting.
2. _As a user working offline_, I can trust that changes sync when the app regains connectivity, with conflicts clearly resolved.
3. _As an enterprise admin (future)_, I can review where data is stored and revoke access if an integration is compromised.

## 5. Experience Overview
1. **Discoverability** — Settings → Integrations tab lists available providers, each showing `Connect`, status, and a short description.
2. **Connect Flow** — Clicking `Connect` opens an OAuth popup, returns to Notara, and displays success with a "Syncing…" indicator.
3. **Sync Feedback** — Active integrations show last sync time, number of synced notes, and error states. Toasts surface real-time errors/success.
4. **Disconnect** — `Disconnect` triggers token revocation and optionally prompts user to leave remote copies or delete them.

## 6. Technical Requirements
- **Auth Tokens** — Secure storage (encrypted at rest) and refresh handling for OAuth providers.
- **Sync Orchestrator** — Service that listens to note persistence events and fans out to enabled integrations with retry logic.
- **Conflict Resolution** — Timestamp + content hash comparison; prefer "local wins" with remote history commit/log for recovery.
- **Rate Limiting & Backoff** — Per-provider throttling to stay within API quotas.
- **Telemetry** — Basic logging for success/failure counts to aid debugging.

## 7. Architecture Sketch
```
[NoteEditor] --> persistBundle()
                 |
                 v
        [NotesContext] --dispatch--> [Sync Orchestrator]
                 |                       |
                 |                       +--> [GitHub Adapter]
                 |                       +--> [Google Drive Adapter]
                 |                       +--> [Dropbox Adapter]
                 |
                 +--> [Local FileSystem / IndexedDB]
```

- **Sync Orchestrator**: debounce high-frequency edits, enqueue tasks, handle retries, report status.
- **Adapters**: provider-specific transforms (note ↔ file), API client, token refresh.
- **Token Store**: shared utility in `IntegrationContext`, exposing `connect()`, `disconnect()`, `getStatus()`.

## 8. Data Mapping
| Note Field            | GitHub Repo File                        | Google Drive File                       | Dropbox File Path                    |
|-----------------------|------------------------------------------|-----------------------------------------|--------------------------------------|
| `id`                  | filename slug (`<id>.md` or title slug) | file ID metadata                        | path segment (`/Notara/<id>.md`)     |
| `title`               | frontmatter `title` + markdown heading  | filename title + JSON metadata          | filename `title.md`                  |
| `content`             | markdown body                           | file body (MD)                          | file body (MD)                       |
| `tags`                | YAML frontmatter array                  | custom properties                       | JSON sidecar or frontmatter          |
| `updatedAt`           | git commit metadata                     | file modified time                      | Dropbox file modified time           |
| `isPinned`            | frontmatter boolean                     | custom property                         | custom property                      |

## 9. Phased Implementation
1. **Phase 0 — Design Sign-off (current)**
   - Finalize auth flow diagrams and UI states.
   - Document data mapping (above) and error messaging.
2. **Phase 1 — Infrastructure**
   - Build `IntegrationContext` and secure token vault.
   - Extend persistence pipeline with event hooks.
   - Add integration status store (local cache + UI binding).
3. **Phase 2 — GitHub Pilot**
   - Implement OAuth app, repo selection UI, and file sync.
   - Ship behind feature flag to a small cohort.
   - Gather telemetry and adjust conflict rules.
4. **Phase 3 — Cloud Drive Support**
   - Layer Google Drive adapter, then Dropbox.
   - Share sync orchestrator + token infrastructure.
5. **Phase 4 — Polish & Admin**
   - Add per-integration settings (folder path, rate limit override).
   - Implement admin revocation and audit log export.

## 10. UI Updates Needed
- Replace "Coming Soon" buttons with status-aware `Connect / Disconnect` buttons.
- Add integration cards showing provider icon, description, and state badge (`Connected`, `Syncing`, `Error`).
- Provide modal for repo/folder selection during onboarding.
- Surface last sync time and quick actions (manual sync, view logs).

## 11. Risks & Mitigations
- **OAuth complexity** — Reuse a shared auth helper; start with GitHub which has simpler scopes.
- **Sync conflicts** — Maintain remote revision IDs; consider storing previous versions for easy rollback.
- **API quotas** — Implement exponential backoff and batch writes.
- **Security** — Encrypt tokens client-side and store server-side when multi-device sync ships.

## 12. Open Questions
- Where should token storage live today (local only vs. remote service)?
- Should users choose the GitHub repo/folder or do we create one automatically?
- How do we handle deletions (soft delete vs. delete remote file)?
- What’s the recovery path if a user disconnects and reconnects with a different repo/folder?

## 13. Next Actions
1. Review and finalize this plan with stakeholders.
2. Produce wireframes for the integration cards, connect modal, and status indicators.
3. Draft technical spike for `IntegrationContext`, auth helper, and sync orchestrator (due October 11, 2025).
4. Kick off Phase 1 engineering once design sign-off occurs.


### Token Storage Decision
**Approach**: Start with encrypted browser storage (IndexedDB) for Phase 1-3. Move to optional cloud vault in Phase 4 when multi-device sync ships.
- **Rationale**: Aligns with local-first philosophy; users control their tokens.
- **Trade-off**: Tokens don't sync across devices until Phase 4.

### Repository/Folder Selection Decision
**Approach**: Let users choose existing repo/folder OR auto-create with confirmation.
- **GitHub**: Prompt for repo selection; offer "Create notara-notes" button.
- **Drive/Dropbox**: Show folder picker; default to creating `/Notara` if none selected.
- **Rationale**: Power users want control; new users want simplicity.

### Deletion Handling Decision
**Approach**: Soft delete locally, prompt for remote action.
- When user deletes a note, show toast: "Delete from [GitHub/Drive/Dropbox] too?" with Yes/No/Always Ask.
- Store preference per integration in settings.
- **Rationale**: Prevents accidental data loss; respects user intent.

### Reconnection with Different Target Decision
**Approach**: Treat as new integration; offer to migrate or keep separate.
- Detect mismatch (different repo ID/folder path).
- Prompt: "This looks like a different location. Sync here instead or keep both?"
- **Rationale**: Supports workspace switching without data loss.

## 14. Success Metrics
- **Adoption**: 30% of active users connect at least one integration within 30 days of launch.
- **Reliability**: 99% sync success rate (excluding user network issues).
- **Performance**: Sync latency < 5 seconds for notes under 100KB.
- **Support**: < 5% of users report sync-related issues in first month.

## 15. Security Considerations
- **Token Encryption**: Use Web Crypto API with user-derived key (PBKDF2 from device fingerprint).
- **Scope Minimization**: Request only necessary OAuth scopes (GitHub: `repo` or `public_repo`; Drive: `drive.file`; Dropbox: `files.content.write`).
- **Token Rotation**: Implement automatic refresh before expiry; prompt re-auth if refresh fails.
- **Audit Trail**: Log all sync operations (timestamp, provider, action, result) for debugging.
- **Revocation**: Ensure disconnect flow calls provider revocation endpoints, not just local deletion.

## 16. Error Handling & User Messaging
| Error Scenario | User Message | Recovery Action |
|----------------|--------------|------------------|
| Network timeout | "Couldn't reach [Provider]. Will retry when online." | Auto-retry with exponential backoff |
| Auth expired | "[Provider] connection expired. Reconnect to continue syncing." | Show reconnect button |
| Rate limit hit | "[Provider] sync paused (rate limit). Resuming in [time]." | Queue and retry after cooldown |
| Conflict detected | "Note changed in both places. Keep local version?" | Show diff modal with merge options |
| Storage quota exceeded | "[Provider] storage full. Free up space or disconnect." | Link to provider's storage management |
| Permission denied | "Can't write to [repo/folder]. Check permissions." | Guide to grant access |

## 17. Testing Strategy
- **Unit Tests**: Adapter logic, conflict resolution, token refresh.
- **Integration Tests**: Mock provider APIs; test full sync flow.
- **E2E Tests**: Real OAuth flow in staging environment.
- **Load Tests**: Simulate 1000 notes syncing to verify batching/throttling.
- **Manual QA**: Test on slow networks, offline scenarios, and edge cases.

## 18. Documentation Deliverables
- **User Guide**: "Connecting Your First Integration" tutorial with screenshots.
- **FAQ**: Common issues ("Why isn't my note syncing?", "How do I switch repos?").
- **API Docs**: For future third-party integration developers.
- **Admin Guide**: Token management and troubleshooting for enterprise users (Phase 4).

## 19. Revised Next Actions
1. **Week of Oct 7**: Review and finalize this plan with stakeholders.
2. **Week of Oct 14**: Produce wireframes for integration cards, connect modal, and status indicators.
3. **Week of Oct 21**: Draft technical spike for `IntegrationContext`, auth helper, and sync orchestrator.
4. **Week of Oct 28**: Complete Phase 1 infrastructure implementation.
5. **Week of Nov 4**: Begin Phase 2 GitHub pilot with internal testing cohort.
6. **Week of Nov 18**: Gather feedback, iterate, and prepare for Phase 3 rollout.

---

**Document Owner**: Engineering Team  
**Stakeholders**: Product, Design, Security  
**Review Cadence**: Bi-weekly during active development
