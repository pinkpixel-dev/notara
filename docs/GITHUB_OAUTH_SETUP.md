# 🔐 GitHub OAuth Setup Guide

This guide will walk you through setting up GitHub OAuth for Notara's integration system.

## Overview

Notara uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) to securely connect to your GitHub account. This allows Notara to sync your notes to a GitHub repository without exposing any sensitive credentials.

## Step-by-Step Setup

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click on **"OAuth Apps"** in the left sidebar
3. Click the **"New OAuth App"** button

### 2. Configure Your OAuth App

Fill in the following information:

**Application name:**
```
Notara
```
(or any name you prefer)

**Homepage URL:**

For development:
```
http://localhost:8080
```

For production:
```
https://yourdomain.com
```

**Application description:** (optional)
```
AI-assisted note-taking app with GitHub sync
```

**Authorization callback URL:**

For development:
```
http://localhost:8080/oauth/github/callback
```

For production:
```
https://yourdomain.com/oauth/github/callback
```

⚠️ **Important**: The callback URL must match exactly, including the protocol (`http://` or `https://`)

### 3. Register the Application

Click the **"Register application"** button.

### 4. Copy Your Client ID

After registration, you'll see your application details page. Copy the **Client ID** (it looks like a long string of letters and numbers).

**DO NOT** generate or use a Client Secret! Notara uses PKCE for security, which doesn't require a client secret.

### 5. Configure Notara

1. Open your `.env` file in the Notara project root
2. Find the `VITE_GITHUB_OAUTH_CLIENT_ID` variable
3. Paste your Client ID:

```bash
# Enable integrations
VITE_ENABLE_INTEGRATIONS=true
VITE_ENABLE_GITHUB_INTEGRATION=true

# GitHub OAuth Client ID
VITE_GITHUB_OAUTH_CLIENT_ID=your_actual_client_id_here
```

4. Save the `.env` file
5. Restart your development server:

```bash
npm run dev
```

### 6. Test the Connection

1. Open Notara in your browser (usually `http://localhost:8080`)
2. Navigate to **Settings** → **Integrations**
3. Find the **GitHub** integration card
4. Click the **Connect** button
5. A popup window will open asking you to authorize Notara
6. Click **Authorize** on the GitHub authorization page
7. The popup will close automatically
8. You should see "Connected" status in the integration card

🎉 **Success!** Your GitHub integration is now connected.

### 7. Configure Your Repository

Connecting authorizes Notara to use your GitHub account. You still need to tell it *where* to write files:

1. **Create (or choose) a repository** in GitHub where you want your notes to live. Notara does not create repositories automatically yet, so create an empty repo manually if needed.
2. Back in Notara, remain on **Settings** → **Integrations**.
3. In the **Repository Settings** panel below the GitHub card, enter:
   - **Owner** – your GitHub username or organization (for example, `sizzlebop`).
   - **Repository** – the repository slug (for example, `notara-notes`).
   - **Branch** – the branch Notara should target (defaults to `main`).
4. Click **Save Repository**.

Once saved, the integration card will show the configured repository and sync controls will unlock.

## Production Deployment

When deploying to production:

### 1. Create a Separate OAuth App

Create a new OAuth App specifically for production with your production domain:

- Homepage URL: `https://yourdomain.com`
- Callback URL: `https://yourdomain.com/oauth/github/callback`

### 2. Configure Environment Variables

Set the production Client ID in your hosting platform's environment variables:

**Vercel/Netlify/Cloudflare Pages:**
```bash
VITE_GITHUB_OAUTH_CLIENT_ID=your_production_client_id
```

**Railway/Render:**
```bash
VITE_GITHUB_OAUTH_CLIENT_ID=your_production_client_id
```

### 3. Update DNS Settings

Make sure your domain properly points to your hosting provider.

## Troubleshooting

### "GitHub OAuth Client ID not configured"

**Problem**: The `VITE_GITHUB_OAUTH_CLIENT_ID` environment variable is not set.

**Solution**: 
1. Check your `.env` file
2. Make sure the variable name is exactly `VITE_GITHUB_OAUTH_CLIENT_ID`
3. Restart your development server after changing `.env`

### "Failed to open OAuth popup"

**Problem**: Browser is blocking popups.

**Solution**:
1. Click on the popup blocker icon in your browser's address bar
2. Allow popups from `localhost:8080` (or your domain)
3. Try connecting again

### "Invalid redirect URI"

**Problem**: The callback URL in your GitHub OAuth App doesn't match the one Notara is using.

**Solution**:
1. Go back to your GitHub OAuth App settings
2. Make sure the callback URL is exactly: `http://localhost:8080/oauth/github/callback`
3. For production: `https://yourdomain.com/oauth/github/callback`
4. Save changes
5. Try connecting again

### "Invalid state parameter - possible CSRF attack"

**Problem**: OAuth state validation failed (usually due to expired session).

**Solution**:
1. Close all popup windows
2. Refresh the Notara page
3. Try connecting again

### OAuth Popup Closes Immediately

**Problem**: OAuth callback page is not loading correctly.

**Solution**:
1. Check browser console for errors
2. Make sure the route `/oauth/github/callback` is registered in your app
3. Try clearing browser cache and cookies
4. Restart development server

## Security Considerations

### PKCE Flow

Notara uses PKCE (Proof Key for Code Exchange) for OAuth, which means:

- **No Client Secret needed**: Safer for client-side applications
- **Code verifier**: A random string generated for each OAuth flow
- **Code challenge**: SHA-256 hash of the verifier
- **State parameter**: CSRF protection

### Token Storage

- Tokens are encrypted using AES-GCM before storage
- Encryption key is derived from device fingerprint
- Tokens are stored in IndexedDB (client-side only)
- Tokens never sent to Notara servers

### Scopes

Notara requests the following GitHub scopes:

- `repo`: Full repository access (needed to read/write note files)
- `user:email`: Read user email (for commit attribution)

## What's Next?

Once GitHub is connected, you can:

1. **Save a Repository**: Point Notara at an existing repo you own (Settings → Integrations).
2. **Configure Sync Settings**: Additional sync options will land alongside the Phase 2 file-sync implementation.
3. **Start Syncing**: Automatic note syncing will become available when the Phase 2 sync engine ships.

For more information, see:
- [Integration System Documentation](./INTEGRATIONS.md)
- [Phase 2 Implementation Summary](./PHASE_2_SUMMARY.md)

---

**Made with ❤️ by Pink Pixel**  
*Dream it, Pixel it™*
